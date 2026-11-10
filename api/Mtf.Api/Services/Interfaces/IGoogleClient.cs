namespace Mtf.Api.Services.Interfaces;

/// <summary>Who Google says signed in, taken from a validated ID token.</summary>
public record GoogleIdentity(string Subject, string Email, bool EmailVerified);

/// <summary>
/// Google's side of the code flow (design decision 5). A seam, so tests skip the real exchange;
/// the validation itself is tested against the real library.
/// </summary>
public interface IGoogleClient
{
    /// <summary>
    /// Google's consent screen, carrying <paramref name="state"/> back to the callback.
    /// Null when Google is not set up, which RequiredSettings allows only in Development.
    /// </summary>
    string? AuthorizationUrl(string state);

    /// <summary>Trades the code for an ID token and validates it; null when either fails.</summary>
    Task<GoogleIdentity?> ExchangeCodeAsync(string code, CancellationToken ct);
}
