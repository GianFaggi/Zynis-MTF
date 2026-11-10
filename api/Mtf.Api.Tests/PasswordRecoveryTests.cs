using System.Net;
using System.Net.Http.Json;
using Mtf.Api.DTOs;
using Mtf.Api.Models;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>accounts spec: "Recover the password by mail" and "Recovery proves the email".</summary>
[Collection(ApiCollection.Name)]
public class PasswordRecoveryTests(ApiFactory factory)
{
    private const string NewPassword = "a brand new password";
    private readonly HttpClient _client = factory.CreateClient();

    private Task<HttpResponseMessage> Forgot(string email, string language = "es")
        => _client.PostAsJsonAsync("/api/auth/forgot-password", new { email, language });

    private Task<HttpResponseMessage> Reset(string token, string newPassword = NewPassword)
        => _client.PostAsJsonAsync("/api/auth/reset-password", new { token, newPassword });

    private async Task<string> RecoveryToken(string email)
    {
        Assert.Equal(HttpStatusCode.NoContent, (await Forgot(email)).StatusCode);
        return factory.Mail.LatestToken(email);
    }

    [Fact]
    public async Task Asking_for_an_existing_account_sends_a_recovery_mail()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);

        var response = await Forgot(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var mail = factory.Mail.SentTo(email)[^1];
        Assert.StartsWith("Elegí una contraseña nueva", mail.Subject);
        Assert.StartsWith($"{ApiFactory.FrontendUrl}/#reset=", mail.Link);
    }

    [Fact]
    public async Task Asking_for_an_unknown_email_sends_nothing_and_answers_the_same()
    {
        var email = Accounts.NewEmail();

        var response = await Forgot(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(factory.Mail.SentTo(email));
    }

    [Fact]
    public async Task At_most_one_recovery_mail_a_minute()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var sent = factory.Mail.SentTo(email).Count;

        await Forgot(email);
        await Forgot(email);
        Assert.Equal(sent + 1, factory.Mail.SentTo(email).Count);

        factory.Clock.Advance(TimeSpan.FromSeconds(61));
        await Forgot(email);
        Assert.Equal(sent + 2, factory.Mail.SentTo(email).Count);
    }

    [Fact]
    public async Task The_mail_comes_in_English_when_asked_in_English()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);

        await Forgot(email, language: "en");

        Assert.StartsWith("Choose a new password", factory.Mail.SentTo(email)[^1].Subject);
    }

    [Fact]
    public async Task A_valid_link_sets_the_new_password_once()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var token = await RecoveryToken(email);

        var response = await Reset(token);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.Login(email, NewPassword)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.Login(email)).StatusCode);
        var again = await Reset(token, "yet another password");
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
        Assert.Equal("invalid_token", await again.Code());
    }

    [Fact]
    public async Task A_link_older_than_1_hour_changes_nothing()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var token = await RecoveryToken(email);

        factory.Clock.Advance(TimeSpan.FromHours(1) + TimeSpan.FromSeconds(1));
        var response = await Reset(token);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_token", await response.Code());
        Assert.Equal(HttpStatusCode.OK, (await _client.Login(email)).StatusCode);
    }

    [Fact]
    public async Task A_new_password_that_breaks_the_rules_is_refused_and_keeps_the_link()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var token = await RecoveryToken(email);

        var response = await Reset(token, "short");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_password", await response.Code());
        Assert.Equal(HttpStatusCode.NoContent, (await Reset(token)).StatusCode);
    }

    [Fact]
    public async Task A_mail_scanner_fetching_the_address_leaves_the_link_working()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var token = await RecoveryToken(email);

        var scan = await _client.GetAsync($"/api/auth/reset-password?token={token}");

        Assert.False(scan.IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Reset(token)).StatusCode);
    }

    [Fact]
    public async Task An_unverified_account_that_recovers_is_verified_and_can_sign_in()
    {
        var email = Accounts.NewEmail();
        await _client.Register(email);
        var token = await RecoveryToken(email);

        await Reset(token);

        Assert.True((await factory.UserByEmail(email))!.EmailVerified);
        Assert.Equal(HttpStatusCode.OK, (await _client.Login(email, NewPassword)).StatusCode);
    }

    [Fact]
    public async Task A_new_password_ends_the_sessions_on_other_devices()
    {
        var email = Accounts.NewEmail();
        var otherDevice = await factory.SignedInUser(email);
        var token = await RecoveryToken(email);

        await Reset(token);

        var refresh = await _client.Refresh(otherDevice.RefreshToken);
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
        Assert.Equal("session_ended", await refresh.Code());
    }

    [Fact]
    public async Task A_Google_only_account_gets_a_password_and_keeps_Google()
    {
        var email = Accounts.NewEmail();
        var googleId = $"google-{Guid.NewGuid():N}";
        await factory.AddUser(new User { Email = email, GoogleId = googleId, EmailVerified = true });
        var token = await RecoveryToken(email);

        await Reset(token);

        var login = await _client.Login(email, NewPassword);
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var user = (await factory.UserByEmail(email))!;
        Assert.Equal(googleId, user.GoogleId);
        Assert.NotNull(await login.Content.ReadFromJsonAsync<TokensResponse>());
    }
}
