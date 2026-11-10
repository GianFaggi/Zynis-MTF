using Mtf.Api.Models;

namespace Mtf.Api.DAOs.Interfaces;

public interface IGoogleHandoffDao
{
    Task CreateAsync(GoogleHandoff handoff, CancellationToken ct);
    Task<GoogleHandoff?> FindBySecretHashAsync(string secretHash, CancellationToken ct);
    Task UpdateAsync(GoogleHandoff handoff, CancellationToken ct);

    /// <summary>Deletes the hand-off in one statement; true only for the one request that did it.</summary>
    Task<bool> ConsumeAsync(Guid id, CancellationToken ct);

    Task DeleteExpiredAsync(DateTimeOffset now, CancellationToken ct);
}
