using Mtf.Api.Models;

namespace Mtf.Api.Services.Interfaces;

/// <summary>Mail links: sending one, at most once a minute per purpose, and using one, once.</summary>
public interface IEmailLinkService
{
    /// <summary>Sends unless a mail of the same purpose went out in the last 60 seconds. A failed send is logged, not thrown.</summary>
    Task SendAsync(User user, AccountMail mail, string? language, CancellationToken ct);

    /// <summary>The user the link belongs to, or null when it is unknown, expired or already used.</summary>
    Task<Guid?> ConsumeAsync(string token, EmailTokenPurpose purpose, CancellationToken ct);
}
