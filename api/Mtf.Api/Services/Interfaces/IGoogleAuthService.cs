using Mtf.Api.DTOs;

namespace Mtf.Api.Services.Interfaces;

/// <summary>How a Google sign-in ended at the callback, and in which language to say so.</summary>
public record GoogleCallbackResult(bool Succeeded, string Language);

/// <summary>
/// Google sign-in by hand-off (ADR 0011): the app keeps a secret and sends only its hash; the session
/// goes to whoever presents the secret, never to the browser that ran Google's screen.
/// </summary>
public interface IGoogleAuthService
{
    /// <summary>Records the hand-off and returns Google's address, or null when Google is not set up.</summary>
    Task<string?> StartAsync(string handoffHash, string? language, CancellationToken ct);

    Task<GoogleCallbackResult> CallbackAsync(string? code, string? state, string? error, CancellationToken ct);

    /// <summary>
    /// The session, once; null while Google has not finished. Refuses with 410 <c>google_failed</c>
    /// when it failed, expired, was already handed over or never existed.
    /// </summary>
    Task<TokensResponse?> ExchangeAsync(string secret, CancellationToken ct);
}
