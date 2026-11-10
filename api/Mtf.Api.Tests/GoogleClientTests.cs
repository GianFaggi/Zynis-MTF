using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Mtf.Api.Services;

namespace Mtf.Api.Tests;

/// <summary>
/// The real Google client, with no fake: the ID-token check is the one thing the seam must not hide.
/// Validation fetches Google's public keys, so these tests need the network.
/// </summary>
public class GoogleClientTests
{
    private const string ClientId = "mtf-client.apps.googleusercontent.com";

    private static GoogleClient Client(string? clientId = ClientId)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Google:ClientId"] = clientId,
            ["Google:ClientSecret"] = "secret",
            ["App:ApiUrl"] = "https://api.mtf.zynis.com.ar",
        }).Build();
        return new GoogleClient(new HttpClient(), config, NullLogger<GoogleClient>.Instance);
    }

    /// <summary>A token shaped exactly like Google's, but signed with a key that is not Google's.</summary>
    private static string ForgedIdToken(string audience)
    {
        using var rsa = RSA.Create(2048);
        var key = new RsaSecurityKey(rsa) { KeyId = Guid.NewGuid().ToString("N") };
        var now = DateTime.UtcNow;
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = "https://accounts.google.com",
            Audience = audience,
            Subject = new ClaimsIdentity(
            [
                new Claim("sub", "1234567890"),
                new Claim("email", "victim@example.com"),
                new Claim("email_verified", "true", ClaimValueTypes.Boolean),
            ]),
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddMinutes(30),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.RsaSha256),
        });
    }

    [Fact]
    public async Task A_token_signed_by_another_key_is_refused()
    {
        Assert.Null(await Client().ValidateIdTokenAsync(ForgedIdToken(ClientId), ClientId));
    }

    [Fact]
    public async Task A_token_for_another_application_is_refused()
    {
        Assert.Null(await Client().ValidateIdTokenAsync(ForgedIdToken("someone-else.apps.googleusercontent.com"), ClientId));
    }

    [Fact]
    public async Task Text_that_is_not_a_token_is_refused()
    {
        Assert.Null(await Client().ValidateIdTokenAsync("not-a-token", ClientId));
    }

    [Fact]
    public void Google_is_asked_only_for_the_email_identity()
    {
        var url = new Uri(Client().AuthorizationUrl("the-handoff-hash")!);
        var query = System.Web.HttpUtility.ParseQueryString(url.Query);

        Assert.Equal("accounts.google.com", url.Host);
        Assert.Equal("openid email", query["scope"]);
        Assert.Equal("select_account", query["prompt"]);
        Assert.Equal("code", query["response_type"]);
        Assert.Equal("the-handoff-hash", query["state"]);
        Assert.Equal(ClientId, query["client_id"]);
        Assert.Equal("https://api.mtf.zynis.com.ar/api/auth/google/callback", query["redirect_uri"]);
        Assert.Null(query["access_type"]);
    }

    [Fact]
    public void With_no_client_set_up_there_is_no_address()
    {
        Assert.Null(Client(clientId: null).AuthorizationUrl("hash"));
    }
}
