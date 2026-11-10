namespace Mtf.Api.Models;

/// <summary>
/// Exactly the minimal record of the accounts spec: no name, no photo, no tokens.
/// </summary>
public class User : Entity
{
    /// <summary>Normalized: trimmed and lower case, so a plain unique index is enough.</summary>
    public required string Email { get; set; }
    public string? PasswordHash { get; set; }
    public string? GoogleId { get; set; }
    public bool EmailVerified { get; set; }
}
