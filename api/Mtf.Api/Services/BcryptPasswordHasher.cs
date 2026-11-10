using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

/// <summary>
/// bcrypt at BCrypt.Net-Next's default cost (11), as in Zynis Cal. At Render's 0.1 CPU a check takes
/// seconds, so skipping it for an unknown email would reveal who has an account (design decision 3).
/// </summary>
public class BcryptPasswordHasher : IPasswordHasher
{
    private static readonly Lazy<string> DummyHash = new(() => BCrypt.Net.BCrypt.HashPassword(SecretToken.New()));

    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);

    public bool Verify(string password, string? hash)
    {
        if (hash is null)
        {
            BCrypt.Net.BCrypt.Verify(password, DummyHash.Value);
            return false;
        }
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
