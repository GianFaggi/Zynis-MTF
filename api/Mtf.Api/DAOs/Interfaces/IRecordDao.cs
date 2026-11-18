using Mtf.Api.Models;

namespace Mtf.Api.DAOs.Interfaces;

/// <summary>One change as the service decided it should be written (data is null on a deletion).</summary>
public record RecordChange(string Kind, Guid Id, string? Data, DateTimeOffset UpdatedAt, DateTimeOffset? DeletedAt);

/// <summary>The cursor limits of an Account: the highest seq purged and the highest seq it ever held.</summary>
public record CursorBounds(long PurgedSeq, long HighestSeq);

public interface IRecordDao
{
    /// <summary>
    /// In one transaction under the Account's advisory lock: writes each change whose
    /// <c>UpdatedAt</c> is newer than the stored one (taking a new seq), then removes the Account's
    /// deletions older than <paramref name="purgeBefore"/> and raises its purged seq.
    /// </summary>
    Task SaveAsync(Guid userId, IReadOnlyList<RecordChange> changes, DateTimeOffset purgeBefore,
        DateTimeOffset now, CancellationToken ct);

    /// <summary>The Account's records with <c>seq &gt; after</c>, ordered by seq, at most <paramref name="limit"/>.</summary>
    Task<IReadOnlyList<Record>> ReadAfterAsync(Guid userId, long after, int limit, CancellationToken ct);

    Task<CursorBounds> CursorBoundsAsync(Guid userId, CancellationToken ct);
}
