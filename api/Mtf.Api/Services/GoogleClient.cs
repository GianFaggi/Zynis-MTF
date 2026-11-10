using System.Text.Json;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http.Extensions;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

/// <summary>
/// The code flow on the server, so the client secret and the ID-token check never reach the app.
/// Asks only for `openid email`: MTF stores no name or photo, and needs no Google refresh token.
/// </summary>
public class GoogleClient(HttpClient http, IConfiguration config, ILogger<GoogleClient> logger) : IGoogleClient
{
    private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";

    private string? ClientId => config["Google:ClientId"];
    private string RedirectUri => $"{config["App:ApiUrl"]!.TrimEnd('/')}/api/auth/google/callback";

    public string? AuthorizationUrl(string state)
    {
        if (string.IsNullOrWhiteSpace(ClientId))
            return null;

        var query = new QueryBuilder
        {
            { "client_id", ClientId },
            { "redirect_uri", RedirectUri },
            { "response_type", "code" },
            { "scope", "openid email" },
            { "prompt", "select_account" },
            { "state", state },
        };
        return AuthorizationEndpoint + query;
    }

    public async Task<GoogleIdentity?> ExchangeCodeAsync(string code, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(ClientId))
            return null;

        using var response = await http.PostAsync(TokenEndpoint, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = ClientId,
            ["client_secret"] = config["Google:ClientSecret"] ?? "",
            ["redirect_uri"] = RedirectUri,
            ["grant_type"] = "authorization_code",
        }), ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Google's token exchange answered {Status}", (int)response.StatusCode);
            return null;
        }

        using var body = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        return body.RootElement.TryGetProperty("id_token", out var idToken) && idToken.GetString() is { } token
            ? await ValidateIdTokenAsync(token, ClientId)
            : null;
    }

    /// <summary>
    /// Checks Google's signature, issuer, expiry and that the token is meant for MTF's client.
    /// Never hand-written: the library fetches and caches Google's keys.
    /// </summary>
    public async Task<GoogleIdentity?> ValidateIdTokenAsync(string idToken, string clientId)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
            return new GoogleIdentity(payload.Subject, payload.Email, payload.EmailVerified);
        }
        catch (InvalidJwtException ex)
        {
            logger.LogWarning(ex, "Google's ID token did not validate");
            return null;
        }
    }
}
