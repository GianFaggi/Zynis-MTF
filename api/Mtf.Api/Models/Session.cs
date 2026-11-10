namespace Mtf.Api.Models;

/// <summary>
/// One signed-in device. Holds only hashes of the renewal token (ADR 0010).
/// </summary>
public class Session : Entity
{
    public Guid UserId { get; set; }
    public required string TokenHash { get; set; }
    /// <summary>The token retired by the last rotation, accepted again for 2 minutes.</summary>
    public string? PreviousTokenHash { get; set; }
    public DateTimeOffset? RotatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
