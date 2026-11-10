using Mtf.Api.DTOs;
using Mtf.Api.Models;

namespace Mtf.Api.Services.Interfaces;

/// <summary>Signed-in devices: renewal tokens that rotate, with a 2-minute grace (ADR 0010).</summary>
public interface ISessionService
{
    Task<TokensResponse> StartAsync(User user, CancellationToken ct);
    /// <summary>Refuses with 401 <c>session_ended</c>, the only answer that ends a session on the device.</summary>
    Task<TokensResponse> RefreshAsync(string refreshToken, CancellationToken ct);
    Task LogoutAsync(string refreshToken, CancellationToken ct);
    Task EndAllAsync(Guid userId, CancellationToken ct);
}
