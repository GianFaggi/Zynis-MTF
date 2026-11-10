namespace Mtf.Api.Services.Interfaces;

public interface IPasswordHasher
{
    string Hash(string password);

    /// <summary>
    /// Checks a password against a hash. With no hash (unknown email, Google-only account) it still
    /// runs a full check against a dummy hash and returns false, so the answer takes the same time.
    /// </summary>
    bool Verify(string password, string? hash);
}
