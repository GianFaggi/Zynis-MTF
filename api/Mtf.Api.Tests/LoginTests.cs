using System.Net;
using System.Net.Http.Json;
using Mtf.Api.DTOs;
using Mtf.Api.Models;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>accounts spec: "Sign in only with a verified email".</summary>
[Collection(ApiCollection.Name)]
public class LoginTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task The_right_password_and_a_verified_email_start_a_session()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);

        var response = await _client.Login(email);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tokens = await response.Content.ReadFromJsonAsync<TokensResponse>();
        Assert.Equal(email, tokens!.Email);
        Assert.False(string.IsNullOrEmpty(tokens.AccessToken));
        Assert.False(string.IsNullOrEmpty(tokens.RefreshToken));
    }

    [Fact]
    public async Task The_right_password_and_an_unverified_email_start_no_session()
    {
        var email = Accounts.NewEmail();
        await _client.Register(email);

        var response = await _client.Login(email);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("email_not_verified", await response.Code());
        var user = await factory.UserByEmail(email);
        Assert.Equal(0, await factory.Db(db => Task.FromResult(db.Sessions.Count(s => s.UserId == user!.Id))));
    }

    [Fact]
    public async Task A_wrong_password_and_an_unknown_email_get_the_same_answer()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);

        var wrongPassword = await _client.Login(email, "wrong password");
        var unknownEmail = await _client.Login(Accounts.NewEmail());

        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unknownEmail.StatusCode);
        Assert.Equal("invalid_credentials", await wrongPassword.Code());
        Assert.Equal("invalid_credentials", await unknownEmail.Code());
    }

    [Fact]
    public async Task An_unknown_email_still_runs_a_bcrypt_check()
    {
        var before = factory.Passwords.Verifications;

        await _client.Login(Accounts.NewEmail());

        Assert.Equal(before + 1, factory.Passwords.Verifications);
    }

    [Fact]
    public async Task A_password_on_a_Google_only_account_gets_the_wrong_password_answer()
    {
        var email = Accounts.NewEmail();
        await factory.AddUser(new User { Email = email, GoogleId = $"google-{Guid.NewGuid():N}", EmailVerified = true });
        var before = factory.Passwords.Verifications;

        var response = await _client.Login(email);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("invalid_credentials", await response.Code());
        Assert.Equal(before + 1, factory.Passwords.Verifications);
    }
}
