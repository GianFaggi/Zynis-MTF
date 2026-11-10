using System.Net;
using System.Net.Http.Json;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>accounts spec: "Verify the email by mail" and "Resend the verification".</summary>
[Collection(ApiCollection.Name)]
public class VerifyEmailTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<(string Email, string Token)> Registered()
    {
        var email = Accounts.NewEmail();
        await _client.Register(email);
        return (email, factory.Mail.LatestToken(email));
    }

    private Task<HttpResponseMessage> Resend(string email, string language = "es")
        => _client.PostAsJsonAsync("/api/auth/resend-verification", new { email, language });

    [Fact]
    public async Task A_valid_link_verifies_the_email_without_signing_in()
    {
        var (email, token) = await Registered();

        var response = await _client.VerifyEmail(token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
        Assert.True((await factory.UserByEmail(email))!.EmailVerified);
    }

    [Fact]
    public async Task Verifying_lets_the_user_sign_in_afterwards()
    {
        var (email, token) = await Registered();
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.Login(email)).StatusCode);

        await _client.VerifyEmail(token);

        Assert.Equal(HttpStatusCode.OK, (await _client.Login(email)).StatusCode);
    }

    [Fact]
    public async Task A_link_works_once()
    {
        var (_, token) = await Registered();
        await _client.VerifyEmail(token);

        var again = await _client.VerifyEmail(token);

        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
        Assert.Equal("invalid_token", await again.Code());
    }

    [Fact]
    public async Task A_link_expires_after_24_hours()
    {
        var (email, token) = await Registered();

        factory.Clock.Advance(TimeSpan.FromHours(24) + TimeSpan.FromSeconds(1));
        var response = await _client.VerifyEmail(token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_token", await response.Code());
        Assert.False((await factory.UserByEmail(email))!.EmailVerified);
    }

    [Fact]
    public async Task A_link_still_works_just_before_24_hours()
    {
        var (_, token) = await Registered();

        factory.Clock.Advance(TimeSpan.FromHours(24) - TimeSpan.FromSeconds(1));

        Assert.Equal(HttpStatusCode.NoContent, (await _client.VerifyEmail(token)).StatusCode);
    }

    [Fact]
    public async Task An_unknown_token_is_refused()
    {
        var response = await _client.VerifyEmail("not-a-real-token");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_token", await response.Code());
    }

    [Fact]
    public async Task A_mail_scanner_fetching_the_address_changes_nothing()
    {
        var (email, token) = await Registered();

        // The link points at the app's fragment; a scanner can only GET. The API acts on a POST only.
        var scan = await _client.GetAsync($"/api/auth/verify-email?token={token}");

        Assert.False(scan.IsSuccessStatusCode);
        Assert.False((await factory.UserByEmail(email))!.EmailVerified);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.VerifyEmail(token)).StatusCode);
    }

    [Fact]
    public async Task Resending_after_60_seconds_sends_a_new_mail_and_kills_the_old_link()
    {
        var (email, oldToken) = await Registered();

        factory.Clock.Advance(TimeSpan.FromSeconds(61));
        var response = await Resend(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(2, factory.Mail.SentTo(email).Count);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.VerifyEmail(oldToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.VerifyEmail(factory.Mail.LatestToken(email))).StatusCode);
    }

    [Fact]
    public async Task Resending_within_60_seconds_sends_nothing_and_answers_the_same()
    {
        var (email, token) = await Registered();

        factory.Clock.Advance(TimeSpan.FromSeconds(59));
        var response = await Resend(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Single(factory.Mail.SentTo(email));
        Assert.Equal(HttpStatusCode.NoContent, (await _client.VerifyEmail(token)).StatusCode);
    }

    [Fact]
    public async Task Resending_for_an_unknown_email_sends_nothing_and_answers_the_same()
    {
        var email = Accounts.NewEmail();

        var response = await Resend(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(factory.Mail.SentTo(email));
    }

    [Fact]
    public async Task Resending_for_a_verified_email_sends_nothing_and_answers_the_same()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        factory.Clock.Advance(TimeSpan.FromSeconds(61));

        var response = await Resend(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Single(factory.Mail.SentTo(email));
    }

    [Fact]
    public async Task The_mail_comes_in_the_language_of_the_request()
    {
        var email = Accounts.NewEmail();

        await _client.Register(email, language: "en");

        Assert.StartsWith("Confirm your email", factory.Mail.SentTo(email)[^1].Subject);
    }
}
