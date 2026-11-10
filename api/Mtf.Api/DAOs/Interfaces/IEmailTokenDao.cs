using Mtf.Api.Models;

namespace Mtf.Api.DAOs.Interfaces;

public interface IEmailTokenDao
{
    Task<EmailToken?> GetAsync(Guid userId, EmailTokenPurpose purpose, CancellationToken ct);

    /// <summary>Stores the user's one live token of that purpose, replacing the previous one.</summary>
    Task ReplaceAsync(Guid userId, EmailTokenPurpose purpose, string tokenHash,
        DateTimeOffset issuedAt, DateTimeOffset expiresAt, CancellationToken ct);

    /// <summary>
    /// Deletes a live token in one statement and returns its user, or null if it is unknown, expired
    /// or already used. Two requests with the same link can never both succeed.
    /// </summary>
    Task<Guid?> ConsumeAsync(string tokenHash, EmailTokenPurpose purpose, DateTimeOffset now, CancellationToken ct);
}
