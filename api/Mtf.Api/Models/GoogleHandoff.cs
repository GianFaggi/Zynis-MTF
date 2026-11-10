namespace Mtf.Api.Models;

/// <summary>
/// A Google sign-in in progress (ADR 0011). The app holds the secret; the row holds its hash,
/// and gets the user once Google's callback succeeds.
/// </summary>
public class GoogleHandoff : Entity
{
    public required string SecretHash { get; set; }
    public required string Language { get; set; }
    public Guid? UserId { get; set; }
    public bool Failed { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
