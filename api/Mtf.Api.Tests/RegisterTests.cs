using System.Net;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>
/// accounts spec: "Register with email and password", "Registering does not reveal who has an account",
/// "Minimal account data" and "Emails are compared without case".
/// </summary>
[Collection(ApiCollection.Name)]
public class RegisterTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task A_new_account_is_unverified_and_gets_a_verification_mail()
    {
        var email = Accounts.NewEmail();

        var response = await _client.Register(email);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var user = await factory.UserByEmail(email);
        Assert.NotNull(user);
        Assert.False(user.EmailVerified);
        var mail = Assert.Single(factory.Mail.SentTo(email));
        Assert.StartsWith($"{ApiFactory.FrontendUrl}/#verify=", mail.Link);
    }

    [Fact]
    public async Task Registering_does_not_sign_in()
    {
        var response = await _client.Register(Accounts.NewEmail());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task The_password_is_stored_only_as_a_bcrypt_hash_and_no_Google_id()
    {
        var email = Accounts.NewEmail();

        await _client.Register(email);

        var user = (await factory.UserByEmail(email))!;
        Assert.StartsWith("$2", user.PasswordHash);
        Assert.DoesNotContain(Accounts.Password, user.PasswordHash);
        Assert.Null(user.GoogleId);
    }

    [Fact]
    public async Task A_seven_character_password_is_refused()
    {
        var email = Accounts.NewEmail();

        var response = await _client.Register(email, password: "1234567");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_password", await response.Code());
        Assert.Null(await factory.UserByEmail(email));
    }

    [Theory]
    [InlineData(73, "a")]
    [InlineData(37, "ñ")] // 37 characters, 74 bytes: bytes are what bcrypt counts
    public async Task A_password_over_72_bytes_is_refused(int count, string character)
    {
        var email = Accounts.NewEmail();

        var response = await _client.Register(email, password: string.Concat(Enumerable.Repeat(character, count)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_password", await response.Code());
        Assert.Null(await factory.UserByEmail(email));
    }

    [Fact]
    public async Task A_password_of_exactly_72_bytes_is_accepted()
    {
        var response = await _client.Register(Accounts.NewEmail(), password: new string('a', 72));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("gian@")]
    [InlineData("gian@localhost")]
    [InlineData("Gian <gian@example.com>")]
    public async Task Text_that_is_not_an_email_is_refused(string email)
    {
        var response = await _client.Register(email);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_email", await response.Code());
    }

    [Fact]
    public async Task A_missing_field_is_an_invalid_request()
    {
        var response = await _client.PostAsync("/api/auth/register",
            new StringContent("{\"email\":\"a@example.com\"}", System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_request", await response.Code());
    }

    [Fact]
    public async Task A_verified_email_gets_the_same_answer_and_an_account_exists_mail()
    {
        var email = Accounts.NewEmail();
        await _client.VerifiedUser(factory, email);
        var before = await factory.UserByEmail(email);

        var response = await _client.Register(email, password: "another password");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
        var mail = factory.Mail.SentTo(email)[^1];
        Assert.StartsWith("Ya tenés una cuenta", mail.Subject);
        Assert.StartsWith($"{ApiFactory.FrontendUrl}/#reset=", mail.Link);
        Assert.Equal(before!.PasswordHash, (await factory.UserByEmail(email))!.PasswordHash);
        Assert.Equal(HttpStatusCode.OK, (await _client.Login(email)).StatusCode);
    }

    [Fact]
    public async Task An_unverified_email_gets_the_same_answer_and_a_new_verification_after_the_wait()
    {
        var email = Accounts.NewEmail();
        await _client.Register(email);
        var before = await factory.UserByEmail(email);

        var tooSoon = await _client.Register(email, password: "another password");
        Assert.Equal(HttpStatusCode.NoContent, tooSoon.StatusCode);
        Assert.Single(factory.Mail.SentTo(email));

        factory.Clock.Advance(TimeSpan.FromSeconds(61));
        var later = await _client.Register(email, password: "another password");

        Assert.Equal(HttpStatusCode.NoContent, later.StatusCode);
        Assert.Equal(2, factory.Mail.SentTo(email).Count);
        Assert.Contains("#verify=", factory.Mail.SentTo(email)[^1].Link);
        Assert.Equal(before!.PasswordHash, (await factory.UserByEmail(email))!.PasswordHash);
    }

    [Fact]
    public async Task Emails_are_compared_without_case_or_spaces()
    {
        var email = Accounts.NewEmail();
        var typed = "  " + email.ToUpperInvariant() + " ";

        await _client.Register(typed);

        Assert.NotNull(await factory.UserByEmail(email));
        Assert.Equal(HttpStatusCode.NoContent, (await _client.VerifyEmail(factory.Mail.LatestToken(email))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.Login($" {email.ToUpperInvariant()} ")).StatusCode);
    }
}
