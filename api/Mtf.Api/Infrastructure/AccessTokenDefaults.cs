namespace Mtf.Api.Infrastructure;

/// <summary>
/// What every access token carries and how long it lives (design decision 4).
/// </summary>
public static class AccessTokenDefaults
{
    public const string Issuer = "mtf";
    public const string Audience = "mtf";
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(15);
}
