using System.Text.Json;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Models;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

/// <summary>
/// Checks only the envelope of each record (kind, uuid id, a positive change time, an object when not
/// deleted) and never reads inside its data, so the Desk's shape stays on the front end (design D1).
/// </summary>
public class SyncService(IRecordDao records, TimeProvider time) : ISyncService
{
    /// <summary>A deleted record keeps its data this long, then the next push of its Account removes it.</summary>
    public static readonly TimeSpan DeletionLifetime = TimeSpan.FromDays(30);
    public const int MaxPageSize = 500;
    /// <summary>The push body limit; the app never sends more than 512 KB in one request (design D7).</summary>
    public const long MaxPushBytes = 1024 * 1024;

    // DateTimeOffset's range in epoch milliseconds: anything above cannot be a real change time.
    private static readonly long MaxUpdatedAt = DateTimeOffset.MaxValue.ToUnixTimeMilliseconds();

    public async Task PushAsync(Guid userId, PushRequest request, CancellationToken ct)
    {
        if (request.Records is null)
            throw Invalid();

        // The same record twice in one batch: keep its newest change, as the server would anyway.
        var changes = request.Records
            .Select(ToChange)
            .GroupBy(c => (c.Kind, c.Id))
            .Select(g => g.MaxBy(c => c.UpdatedAt)!)
            .ToList();

        var now = time.GetUtcNow();
        await records.SaveAsync(userId, changes, now - DeletionLifetime, now, ct);
    }

    public async Task<PullResponse> PullAsync(Guid userId, long after, int limit, CancellationToken ct)
    {
        if (after < 0)
            throw Invalid();
        limit = Math.Clamp(limit, 1, MaxPageSize);

        // A full pull (after = 0) is always allowed. Otherwise the cursor must lie between what was
        // purged (older: a deletion it never saw is gone) and the highest seq this Account ever held
        // (newer: the server lost its data or was restored older, and the device must refill it).
        if (after > 0)
        {
            var bounds = await records.CursorBoundsAsync(userId, ct);
            if (after < bounds.PurgedSeq || after > bounds.HighestSeq)
                throw new ApiException(StatusCodes.Status410Gone, ErrorCodes.CursorExpired);
        }

        var rows = await records.ReadAfterAsync(userId, after, limit + 1, ct);
        var page = rows.Take(limit).ToList();
        return new PullResponse(
            page.Select(ToSyncRecord).ToList(),
            Next: page.Count > 0 ? page[^1].Seq : after,
            More: rows.Count > limit);
    }

    private static RecordChange ToChange(SyncRecord? record)
    {
        if (record is null
            || record.Kind is null || !RecordKinds.All.Contains(record.Kind)
            || record.Id == Guid.Empty
            || record.UpdatedAt <= 0 || record.UpdatedAt > MaxUpdatedAt)
            throw Invalid();

        var updatedAt = DateTimeOffset.FromUnixTimeMilliseconds(record.UpdatedAt);
        if (record.Deleted)
            return new RecordChange(record.Kind, record.Id, null, updatedAt, updatedAt);

        if (record.Data is not { ValueKind: JsonValueKind.Object } data)
            throw Invalid();
        return new RecordChange(record.Kind, record.Id, data.GetRawText(), updatedAt, null);
    }

    private static SyncRecord ToSyncRecord(Record record)
    {
        var deleted = record.DeletedAt is not null;
        JsonElement? data = deleted || record.Data is null
            ? null
            : JsonDocument.Parse(record.Data).RootElement.Clone();
        return new SyncRecord(record.Kind, record.Id, record.UpdatedAt.ToUnixTimeMilliseconds(), deleted, data);
    }

    private static ApiException Invalid() => new(StatusCodes.Status400BadRequest, ErrorCodes.InvalidRequest);
}
