namespace Mtf.Api.Models;

/// <summary>
/// uuid id plus created/updated times, like every entity on the front end.
/// AppDbContext stamps the times on save.
/// </summary>
public abstract class Entity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
