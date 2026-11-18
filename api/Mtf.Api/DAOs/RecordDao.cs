using Microsoft.EntityFrameworkCore;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Data;
using Mtf.Api.Models;

namespace Mtf.Api.DAOs;

/// <summary>
/// The only code touching <c>records</c> and <c>sync_accounts</c>. Raw SQL where EF's change tracker
/// cannot express it: the conditional upsert and the purge (design D2, D3).
/// </summary>
public class RecordDao(AppDbContext db) : IRecordDao
{
    public async Task SaveAsync(Guid userId, IReadOnlyList<RecordChange> changes, DateTimeOffset purgeBefore,
        DateTimeOffset now, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Two pushes of one Account never interleave, so its seqs commit in order and a pull running
        // between them can never move its cursor past a change that commits later.
        var lockKey = userId.ToString();
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({lockKey}, 0))", ct);

        if (changes.Count > 0)
        {
            var kinds = changes.Select(c => c.Kind).ToArray();
            var ids = changes.Select(c => c.Id).ToArray();
            var datas = changes.Select(c => c.Data).ToArray();
            var updatedAts = changes.Select(c => c.UpdatedAt).ToArray();
            var deletedAts = changes.Select(c => c.DeletedAt).ToArray();

            // A stored record takes the change only when the change is newer, and only then a new seq;
            // an unknown one is inserted. An older or equal change touches nothing, so a batch sent
            // twice changes nothing. A deletion keeps the stored data (the 30-day safety net).
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                WITH incoming AS (
                    SELECT * FROM unnest({kinds}::text[], {ids}::uuid[], {datas}::text[]::jsonb[],
                                         {updatedAts}::timestamptz[], {deletedAts}::timestamptz[])
                        AS t(kind, id, data, updated_at, deleted_at)
                ), accepted AS (
                    UPDATE records r
                    SET data = CASE WHEN i.deleted_at IS NULL THEN i.data ELSE r.data END,
                        updated_at = i.updated_at,
                        deleted_at = i.deleted_at,
                        seq = nextval('records_seq')
                    FROM incoming i
                    WHERE r.user_id = {userId} AND r.kind = i.kind AND r.id = i.id
                      AND r.updated_at < i.updated_at
                )
                INSERT INTO records (user_id, kind, id, data, updated_at, deleted_at, seq)
                SELECT {userId}, i.kind, i.id, i.data, i.updated_at, i.deleted_at, nextval('records_seq')
                FROM incoming i
                WHERE NOT EXISTS (
                    SELECT 1 FROM records r WHERE r.user_id = {userId} AND r.kind = i.kind AND r.id = i.id)
                """, ct);
        }

        // Clean-up with no background job (a job would wake Neon): old deletions go on the next push.
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            WITH gone AS (
                DELETE FROM records
                WHERE user_id = {userId} AND deleted_at IS NOT NULL AND deleted_at < {purgeBefore}
                RETURNING seq
            )
            INSERT INTO sync_accounts (user_id, purged_seq, created_at, updated_at)
            SELECT {userId}, max(seq), {now}, {now} FROM gone HAVING count(*) > 0
            ON CONFLICT (user_id) DO UPDATE
            SET purged_seq = GREATEST(sync_accounts.purged_seq, excluded.purged_seq),
                updated_at = excluded.updated_at
            """, ct);

        await tx.CommitAsync(ct);
    }

    public async Task<IReadOnlyList<Record>> ReadAfterAsync(Guid userId, long after, int limit, CancellationToken ct)
        => await db.Records.AsNoTracking()
            .Where(r => r.UserId == userId && r.Seq > after)
            .OrderBy(r => r.Seq)
            .Take(limit)
            .ToListAsync(ct);

    public async Task<CursorBounds> CursorBoundsAsync(Guid userId, CancellationToken ct)
    {
        var purged = await db.SyncAccounts.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => (long?)a.PurgedSeq)
            .FirstOrDefaultAsync(ct) ?? 0;
        var highestHeld = await db.Records.AsNoTracking()
            .Where(r => r.UserId == userId)
            .MaxAsync(r => (long?)r.Seq, ct) ?? 0;
        return new CursorBounds(purged, Math.Max(purged, highestHeld));
    }
}
