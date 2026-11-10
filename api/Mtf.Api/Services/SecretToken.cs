using System.Security.Cryptography;
using System.Text;

namespace Mtf.Api.Services;

/// <summary>
/// Mail links, renewal tokens and Google hand-off secrets: 256 random bits, base64url, stored as SHA-256.
/// SHA-256 is right here, unlike for passwords, because the input is already random: there is nothing to guess.
/// </summary>
public static class SecretToken
{
    public static string New() => Base64Url(RandomNumberGenerator.GetBytes(32));

    public static string Hash(string token) => Base64Url(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
