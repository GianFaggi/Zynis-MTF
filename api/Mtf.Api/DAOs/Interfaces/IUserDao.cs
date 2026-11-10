using Mtf.Api.Models;

namespace Mtf.Api.DAOs.Interfaces;

public interface IUserDao
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);
    /// <summary>Expects an already normalized email.</summary>
    Task<User?> GetByEmailAsync(string email, CancellationToken ct);
    Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken ct);
    Task<User> CreateAsync(User user, CancellationToken ct);
    Task UpdateAsync(User user, CancellationToken ct);
}
