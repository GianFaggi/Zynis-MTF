namespace Mtf.Api.Models;

/// <summary>
/// Sync bookkeeping of one Account, apart from <see cref="User"/> so users stays the minimal record #36
/// promised. Keyed by the user, so it does not inherit <see cref="Entity"/>; RecordDao writes it with SQL.
/// </summary>
public class SyncAccount
{
    public Guid UserId { get; set; }
    /// <summary>The highest seq ever purged for this Account: an older cursor is expired (design D3).</summary>
    public long PurgedSeq { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
