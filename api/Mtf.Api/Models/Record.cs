namespace Mtf.Api.Models;

/// <summary>
/// One Area, Card (with its Items) or Win of an Account, kept as opaque JSON (sync, design D1).
/// Does not inherit <see cref="Entity"/>: <see cref="UpdatedAt"/> is the moment the device made the
/// change, sent by the device, not a server stamp, and the data inside already carries its own createdAt.
/// </summary>
public class Record
{
    public Guid UserId { get; set; }
    /// <summary>One of <see cref="RecordKinds"/>.</summary>
    public required string Kind { get; set; }
    public Guid Id { get; set; }
    /// <summary>The entity as the app sent it (jsonb). Kept on a deletion for 30 days; null only for a
    /// deletion of a record the server never held.</summary>
    public string? Data { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    /// <summary>Position in the Account's change stream, from the <c>records_seq</c> sequence.</summary>
    public long Seq { get; set; }
}

public static class RecordKinds
{
    public const string Area = "area";
    public const string Card = "card";
    public const string Win = "win";

    public static readonly IReadOnlySet<string> All = new HashSet<string> { Area, Card, Win };
}
