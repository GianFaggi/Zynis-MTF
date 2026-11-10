namespace Mtf.Api.Models;

public enum EmailTokenPurpose
{
    Verify,
    Reset,
}

/// <summary>
/// The one live mail link of a purpose for a user, replaced on every send:
/// its <see cref="Entity.CreatedAt"/> is the 60-second wait, and a new mail kills the old link.
/// </summary>
public class EmailToken : Entity
{
    public Guid UserId { get; set; }
    public EmailTokenPurpose Purpose { get; set; }
    public required string TokenHash { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
