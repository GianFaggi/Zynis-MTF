using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Mtf.Api.DTOs;
using Mtf.Api.Models;
using Mtf.Api.Services;
using Mtf.Api.Services.Interfaces;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>
/// accounts spec: "Sign in with Google", "The Google session stays secret" and "Google links an existing
/// account" (ADR 0011). Google itself is faked; its token check is tested in GoogleClientTests.
/// </summary>
[Collection(ApiCollection.Name)]
public class GoogleTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

    /// <summary>What the app holds: the secret it never puts in an address, and the hash it does.</summary>
    private sealed record Handoff(string Secret, string Hash);

    private static string NewGoogleId() => $"google-{Guid.NewGuid():N}";

    private async Task<(Handoff Handoff, HttpResponseMessage Login)> Start(string lang = "es")
    {
        var secret = SecretToken.New();
        var handoff = new Handoff(secret, SecretToken.Hash(secret));
        var login = await _client.GetAsync($"/api/auth/google/login?handoff={handoff.Hash}&lang={lang}");
        return (handoff, login);
    }

    private Task<HttpResponseMessage> Callback(string query) => _client.GetAsync($"/api/auth/google/callback?{query}");

    private Task<HttpResponseMessage> Exchange(string secret)
        => _client.PostAsJsonAsync("/api/auth/google/exchange", new { secret });

    /// <summary>Starts, finishes at "Google" as <paramref name="identity"/>, and returns the hand-off and the window's page.</summary>
    private async Task<(Handoff Handoff, string Page)> SignInAs(GoogleIdentity? identity, string lang = "es")
    {
        var (handoff, _) = await Start(lang);
        var code = Guid.NewGuid().ToString("N");
        factory.Google.WillReturn(code, identity);
        var callback = await Callback($"code={code}&state={handoff.Hash}");
        Assert.Equal(HttpStatusCode.OK, callback.StatusCode);
        return (handoff, await callback.Content.ReadAsStringAsync());
    }

    private async Task<TokensResponse> Session(Handoff handoff)
    {
        var response = await Exchange(handoff.Secret);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TokensResponse>())!;
    }

    private async Task AssertNoSession(Handoff handoff)
    {
        var response = await Exchange(handoff.Secret);
        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        Assert.Equal("google_failed", await response.Code());
    }

    [Fact]
    public async Task Login_sends_the_window_to_Google_with_the_hash_as_state()
    {
        var (handoff, login) = await Start();

        Assert.Equal(HttpStatusCode.Redirect, login.StatusCode);
        var location = login.Headers.Location!.ToString();
        Assert.StartsWith("https://accounts.google.com/", location);
        Assert.Contains($"state={handoff.Hash}", location);
        Assert.DoesNotContain(handoff.Secret, location);
    }

    [Fact]
    public async Task A_handoff_that_is_not_a_hash_is_refused()
    {
        var login = await _client.GetAsync("/api/auth/google/login?handoff=short&lang=es");

        Assert.Equal(HttpStatusCode.BadRequest, login.StatusCode);
        Assert.Equal("invalid_request", await login.Code());
    }

    [Fact]
    public async Task The_app_waits_while_Google_has_not_finished()
    {
        var (handoff, _) = await Start();

        Assert.Equal(HttpStatusCode.Accepted, (await Exchange(handoff.Secret)).StatusCode);
    }

    [Fact]
    public async Task A_first_time_user_gets_a_verified_account_with_no_password()
    {
        var email = Accounts.NewEmail();
        var googleId = NewGoogleId();

        var (handoff, page) = await SignInAs(new GoogleIdentity(googleId, email, EmailVerified: true));
        var session = await Session(handoff);

        Assert.Contains("Volvé a MTF", page);
        Assert.Equal(email, session.Email);
        var user = (await factory.UserByEmail(email))!;
        Assert.True(user.EmailVerified);
        Assert.Equal(googleId, user.GoogleId);
        Assert.Null(user.PasswordHash);
    }

    [Fact]
    public async Task A_returning_user_reaches_the_same_account_even_with_another_email_at_Google()
    {
        var email = Accounts.NewEmail();
        var googleId = NewGoogleId();
        await factory.AddUser(new User { Email = email, GoogleId = googleId, EmailVerified = true });
        var newEmailAtGoogle = Accounts.NewEmail();

        var (handoff, _) = await SignInAs(new GoogleIdentity(googleId, newEmailAtGoogle, EmailVerified: true));

        Assert.Equal(email, (await Session(handoff)).Email);
        Assert.Null(await factory.UserByEmail(newEmailAtGoogle));
    }

    [Fact]
    public async Task An_email_Google_has_not_verified_creates_and_links_nothing()
    {
        var email = Accounts.NewEmail();
        await _client.Register(email);

        var (handoff, page) = await SignInAs(new GoogleIdentity(NewGoogleId(), email, EmailVerified: false));

        Assert.Contains("No pudimos iniciar sesión", page);
        await AssertNoSession(handoff);
        var user = (await factory.UserByEmail(email))!;
        Assert.Null(user.GoogleId);
        Assert.NotNull(user.PasswordHash);
    }

    [Fact]
    public async Task A_token_that_does_not_validate_starts_no_session()
    {
        var (handoff, page) = await SignInAs(identity: null);

        Assert.Contains("No pudimos iniciar sesión", page);
        await AssertNoSession(handoff);
    }

    [Fact]
    public async Task Cancelling_at_Google_starts_no_session_and_says_to_go_back()
    {
        var (handoff, _) = await Start();

        var callback = await Callback($"error=access_denied&state={handoff.Hash}");

        Assert.Equal(HttpStatusCode.OK, callback.StatusCode);
        Assert.Contains("Volvé a MTF", await callback.Content.ReadAsStringAsync());
        await AssertNoSession(handoff);
    }

    [Fact]
    public async Task The_window_page_speaks_the_language_the_app_started_in()
    {
        var (_, page) = await SignInAs(new GoogleIdentity(NewGoogleId(), Accounts.NewEmail(), true), lang: "en");

        Assert.Contains("Go back to MTF", page);
        Assert.Contains("<html lang=\"en\">", page);
    }

    [Fact]
    public async Task The_session_is_handed_over_once()
    {
        var (handoff, _) = await SignInAs(new GoogleIdentity(NewGoogleId(), Accounts.NewEmail(), true));
        await Session(handoff);

        await AssertNoSession(handoff);
    }

    [Fact]
    public async Task A_handoff_expires_after_5_minutes()
    {
        var (handoff, _) = await Start();
        var code = Guid.NewGuid().ToString("N");
        factory.Google.WillReturn(code, new GoogleIdentity(NewGoogleId(), Accounts.NewEmail(), true));

        factory.Clock.Advance(GoogleAuthService.Lifetime + TimeSpan.FromSeconds(1));
        var callback = await Callback($"code={code}&state={handoff.Hash}");

        Assert.Contains("No pudimos iniciar sesión", await callback.Content.ReadAsStringAsync());
        await AssertNoSession(handoff);
    }

    [Fact]
    public async Task A_finished_sign_in_not_collected_within_5_minutes_is_gone()
    {
        var (handoff, _) = await SignInAs(new GoogleIdentity(NewGoogleId(), Accounts.NewEmail(), true));

        factory.Clock.Advance(GoogleAuthService.Lifetime + TimeSpan.FromSeconds(1));

        await AssertNoSession(handoff);
    }

    [Fact]
    public async Task No_token_or_secret_ever_appears_in_an_address_or_the_page()
    {
        var (handoff, login) = await Start();
        var code = Guid.NewGuid().ToString("N");
        factory.Google.WillReturn(code, new GoogleIdentity(NewGoogleId(), Accounts.NewEmail(), true));
        var callback = await Callback($"code={code}&state={handoff.Hash}");
        var page = await callback.Content.ReadAsStringAsync();
        var session = await Session(handoff);

        Assert.DoesNotContain(handoff.Secret, login.Headers.Location!.ToString());
        Assert.Null(callback.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, callback.StatusCode);
        Assert.DoesNotContain(handoff.Secret, page);
        Assert.DoesNotContain(session.RefreshToken, page);
        Assert.DoesNotContain(session.AccessToken, page);
        Assert.Contains("no-store", callback.Headers.CacheControl!.ToString());
    }

    [Fact]
    public async Task A_browser_without_the_secret_gets_no_session()
    {
        var (handoff, _) = await SignInAs(new GoogleIdentity(NewGoogleId(), Accounts.NewEmail(), true));

        // The window's browser knows only the hash, from the address.
        Assert.Equal(HttpStatusCode.Gone, (await Exchange(handoff.Hash)).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await Exchange(SecretToken.New())).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Exchange(handoff.Secret)).StatusCode);
    }

    [Fact]
    public async Task An_unknown_state_at_the_callback_changes_nothing()
    {
        var callback = await Callback($"code=anything&state={SecretToken.Hash(SecretToken.New())}");

        Assert.Equal(HttpStatusCode.OK, callback.StatusCode);
        Assert.Contains("No pudimos iniciar sesión", await callback.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task A_verified_account_with_a_password_links_and_signs_in_both_ways()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var googleId = NewGoogleId();

        var (handoff, _) = await SignInAs(new GoogleIdentity(googleId, email, true));

        Assert.Equal(email, (await Session(handoff)).Email);
        Assert.Equal(googleId, (await factory.UserByEmail(email))!.GoogleId);
        Assert.Equal(HttpStatusCode.OK, (await _client.Login(email)).StatusCode);
    }

    [Fact]
    public async Task Someone_who_registered_the_address_first_loses_their_password()
    {
        var email = Accounts.NewEmail();
        await _client.Register(email, password: "attacker's password");

        var (handoff, _) = await SignInAs(new GoogleIdentity(NewGoogleId(), email, true));
        await Session(handoff);

        var user = (await factory.UserByEmail(email))!;
        Assert.True(user.EmailVerified);
        Assert.Null(user.PasswordHash);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.Login(email, "attacker's password")).StatusCode);
    }
}
