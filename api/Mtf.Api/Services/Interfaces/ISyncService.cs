using Mtf.Api.DTOs;

namespace Mtf.Api.Services.Interfaces;

/// <summary>The Desk's records of one Account, per session (sync spec, ADR 0012).</summary>
public interface ISyncService
{
    /// <summary>Writes a batch; the newest change of each record wins. Refuses a bad envelope with 400.</summary>
    Task PushAsync(Guid userId, PushRequest request, CancellationToken ct);

    /// <summary>The records changed after <paramref name="after"/>; 410 <c>cursor_expired</c> when the
    /// device must start over (design D3, D15).</summary>
    Task<PullResponse> PullAsync(Guid userId, long after, int limit, CancellationToken ct);
}
