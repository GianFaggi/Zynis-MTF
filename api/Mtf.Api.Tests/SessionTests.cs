using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Mtf.Api.DTOs;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>account-session spec, the server's side (ADR 0010).</summary>
[Collection(ApiCollection.Name)]
public class SessionTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<HttpResponseMessage> Me(string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await _client.SendAsync(request);
    }

    private async Task<TokensResponse> Renewed(string refreshToken)
    {
        var response = await _client.Refresh(refreshToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TokensResponse>())!;
    }

    private async Task AssertEnded(string refreshToken)
    {
        var response = await _client.Refresh(refreshToken);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("session_ended", await response.Code());
    }

    private Task<int> SessionCount(string email)
        => factory.Db(db => db.Sessions.CountAsync(s => db.Users.Any(u => u.Id == s.UserId && u.Email == email)));

    [Fact]
    public async Task The_access_token_proves_who_the_user_is()
    {
        var email = Accounts.NewEmail();
        var session = await factory.SignedInUser(email);

        var response = await Me(session.AccessToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.Content.ReadFromJsonAsync<MeResponse>();
        Assert.Equal(new MeResponse(email, HasPassword: true, HasGoogle: false), me);
    }

    [Fact]
    public async Task The_access_token_lives_15_minutes()
    {
        var session = await factory.SignedInUser(Accounts.NewEmail());
        Assert.Equal(factory.Clock.GetUtcNow() + TimeSpan.FromMinutes(15), session.AccessTokenExpiresAt);

        factory.Clock.Advance(TimeSpan.FromMinutes(15) - TimeSpan.FromSeconds(1));
        Assert.Equal(HttpStatusCode.OK, (await Me(session.AccessToken)).StatusCode);

        factory.Clock.Advance(TimeSpan.FromSeconds(2));
        Assert.Equal(HttpStatusCode.Unauthorized, (await Me(session.AccessToken)).StatusCode);
    }

    [Fact]
    public async Task No_token_or_a_forged_one_is_refused()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Me("not.a.jwt")).StatusCode);
    }

    [Fact]
    public async Task A_renewal_rotates_the_token_and_restarts_the_180_days()
    {
        var email = Accounts.NewEmail();
        var session = await factory.SignedInUser(email);

        var renewed = await Renewed(session.RefreshToken);

        Assert.NotEqual(session.RefreshToken, renewed.RefreshToken);
        Assert.Equal(email, renewed.Email);
        Assert.Equal(HttpStatusCode.OK, (await Me(renewed.AccessToken)).StatusCode);
        var expiresAt = await factory.Db(db => db.Sessions
            .Where(s => db.Users.Any(u => u.Id == s.UserId && u.Email == email))
            .Select(s => s.ExpiresAt)
            .SingleAsync());
        // Postgres keeps microseconds; the clock has 100 ns ticks.
        Assert.Equal(factory.Clock.GetUtcNow() + TimeSpan.FromDays(180), expiresAt, TimeSpan.FromMilliseconds(1));
    }

    [Fact]
    public async Task A_retired_token_works_again_within_2_minutes()
    {
        var session = await factory.SignedInUser(Accounts.NewEmail());
        await Renewed(session.RefreshToken); // its answer "lost"

        factory.Clock.Advance(TimeSpan.FromMinutes(2) - TimeSpan.FromSeconds(1));
        var retry = await Renewed(session.RefreshToken);

        Assert.Equal(HttpStatusCode.OK, (await _client.Refresh(retry.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task A_token_retired_more_than_2_minutes_ago_ends_the_session()
    {
        var email = Accounts.NewEmail();
        var session = await factory.SignedInUser(email);
        var current = await Renewed(session.RefreshToken);

        factory.Clock.Advance(TimeSpan.FromMinutes(2) + TimeSpan.FromSeconds(1));
        await AssertEnded(session.RefreshToken);

        // Someone may hold a copy, so the whole session ends, the current token included.
        await AssertEnded(current.RefreshToken);
        Assert.Equal(0, await SessionCount(email));
    }

    [Fact]
    public async Task Two_renewals_at_the_same_moment_both_work_and_the_session_continues()
    {
        var session = await factory.SignedInUser(Accounts.NewEmail());

        var answers = await Task.WhenAll(_client.Refresh(session.RefreshToken), _client.Refresh(session.RefreshToken));

        Assert.All(answers, a => Assert.Equal(HttpStatusCode.OK, a.StatusCode));
        var tokens = await Task.WhenAll(answers.Select(a => a.Content.ReadFromJsonAsync<TokensResponse>()));
        foreach (var token in tokens)
            Assert.Equal(HttpStatusCode.OK, (await _client.Refresh(token!.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task A_session_renewed_179_days_after_its_last_renewal_works()
    {
        var session = await factory.SignedInUser(Accounts.NewEmail());

        factory.Clock.Advance(TimeSpan.FromDays(179));
        var renewed = await Renewed(session.RefreshToken);

        factory.Clock.Advance(TimeSpan.FromDays(179));
        Assert.Equal(HttpStatusCode.OK, (await _client.Refresh(renewed.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task A_session_renewed_181_days_after_its_last_renewal_has_ended()
    {
        var email = Accounts.NewEmail();
        var session = await factory.SignedInUser(email);

        factory.Clock.Advance(TimeSpan.FromDays(181));

        await AssertEnded(session.RefreshToken);
        Assert.Equal(0, await SessionCount(email));
    }

    [Fact]
    public async Task An_unknown_token_is_refused_and_changes_nothing()
    {
        var email = Accounts.NewEmail();
        var session = await factory.SignedInUser(email);

        await AssertEnded("a-token-nobody-knows");

        Assert.Equal(1, await SessionCount(email));
        Assert.Equal(HttpStatusCode.OK, (await _client.Refresh(session.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task Signing_out_ends_only_that_session()
    {
        var email = Accounts.NewEmail();
        var phone = await factory.SignedInUser(email);
        var pc = (await (await _client.Login(email)).Content.ReadFromJsonAsync<TokensResponse>())!;

        var logout = await _client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = phone.RefreshToken });

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        await AssertEnded(phone.RefreshToken);
        Assert.Equal(HttpStatusCode.OK, (await _client.Refresh(pc.RefreshToken)).StatusCode);
    }

    [Fact]
    public async Task Signing_out_with_an_unknown_token_answers_the_same()
    {
        var logout = await _client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = "unknown" });

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
    }

    [Fact]
    public async Task A_password_reset_ends_every_session()
    {
        var email = Accounts.NewEmail();
        var phone = await factory.SignedInUser(email);
        var pc = (await (await _client.Login(email)).Content.ReadFromJsonAsync<TokensResponse>())!;
        await _client.PostAsJsonAsync("/api/auth/forgot-password", new { email, language = "es" });

        await _client.PostAsJsonAsync("/api/auth/reset-password",
            new { token = factory.Mail.LatestToken(email), newPassword = "a brand new password" });

        await AssertEnded(phone.RefreshToken);
        await AssertEnded(pc.RefreshToken);
    }

    [Fact]
    public async Task Signing_in_deletes_that_user_s_expired_sessions()
    {
        var email = Accounts.NewEmail();
        await factory.SignedInUser(email);

        factory.Clock.Advance(TimeSpan.FromDays(181));
        await _client.Login(email);

        Assert.Equal(1, await SessionCount(email));
    }
}
