using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>
/// Google without the network: a test says which identity a code turns into, or that it fails.
/// </summary>
public class FakeGoogleClient : IGoogleClient
{
    private readonly Dictionary<string, GoogleIdentity?> _codes = [];

    public void WillReturn(string code, GoogleIdentity? identity)
    {
        lock (_codes) _codes[code] = identity;
    }

    public string? AuthorizationUrl(string state) =>
        "https://accounts.google.com/o/oauth2/v2/auth?state=" + Uri.EscapeDataString(state);

    public Task<GoogleIdentity?> ExchangeCodeAsync(string code, CancellationToken ct)
    {
        lock (_codes) return Task.FromResult(_codes.GetValueOrDefault(code));
    }
}
