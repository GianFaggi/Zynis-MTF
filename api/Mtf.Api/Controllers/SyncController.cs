using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Services;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Controllers;

/// <summary>
/// The Desk travelling between an Account's devices (sync spec). The Account always comes from the
/// access token, never from a parameter. HTTP only: the rules live in <see cref="SyncService"/>.
/// </summary>
[ApiController]
[Route("api/sync")]
[Authorize]
[EnableRateLimiting(RateLimiting.Sync)]
public class SyncController(ISyncService sync) : ControllerBase
{
    [HttpPost("push")]
    [RequestSizeLimit(SyncService.MaxPushBytes)]
    public async Task<ActionResult<PushResponse>> Push([FromBody] PushRequest request, CancellationToken ct)
    {
        await sync.PushAsync(User.GetUserId(), request, ct);
        return Ok(new PushResponse());
    }

    [HttpGet("pull")]
    public async Task<ActionResult<PullResponse>> Pull([FromQuery] long after = 0,
        [FromQuery] int limit = SyncService.MaxPageSize, CancellationToken ct = default)
        => Ok(await sync.PullAsync(User.GetUserId(), after, limit, ct));
}
