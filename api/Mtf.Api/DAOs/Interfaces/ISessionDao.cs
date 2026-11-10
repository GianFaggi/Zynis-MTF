using Mtf.Api.Models;

namespace Mtf.Api.DAOs.Interfaces;

public interface ISessionDao
{
    Task CreateAsync(Session session, CancellationToken ct);
    Task<Session?> FindByTokenHashAsync(string tokenHash, CancellationToken ct);
    Task<Session?> FindByPreviousTokenHashAsync(string tokenHash, CancellationToken ct);

    /// <summary>
    /// Rotates only if the session still holds <paramref name="expectedTokenHash"/>, which becomes the
    /// previous one. False when another renewal rotated it first, so the caller reads it again.
    /// </summary>
    Task<bool> TryRotateAsync(Guid id, string expectedTokenHash, string newTokenHash,
        DateTimeOffset rotatedAt, DateTimeOffset expiresAt, CancellationToken ct);

    Task DeleteAsync(Guid id, CancellationToken ct);
    /// <summary>Signs out the session holding this token, current or just retired.</summary>
    Task DeleteByTokenHashAsync(string tokenHash, CancellationToken ct);
    Task DeleteAllForUserAsync(Guid userId, CancellationToken ct);
    Task DeleteExpiredForUserAsync(Guid userId, DateTimeOffset now, CancellationToken ct);
}
