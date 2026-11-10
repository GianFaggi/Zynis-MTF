using Mtf.Api.Services;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>The real bcrypt hasher, counting checks: proves when a password is, or is not, checked.</summary>
public class CountingPasswordHasher : IPasswordHasher
{
    private readonly BcryptPasswordHasher _inner = new();
    private int _verifications;

    public int Verifications => _verifications;

    public string Hash(string password) => _inner.Hash(password);

    public bool Verify(string password, string? hash)
    {
        Interlocked.Increment(ref _verifications);
        return _inner.Verify(password, hash);
    }
}
