using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Controllers;

/// <summary>Email and password accounts and sessions (design decision 10). HTTP only: the rules live in the services.</summary>
[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth, ISessionService sessions) : ControllerBase
{
    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        await auth.RegisterAsync(request, ct);
        return NoContent();
    }

    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] TokenRequest request, CancellationToken ct)
    {
        await auth.VerifyEmailAsync(request.Token, ct);
        return NoContent();
    }

    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] EmailRequest request, CancellationToken ct)
    {
        await auth.ResendVerificationAsync(request, ct);
        return NoContent();
    }

    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpPost("login")]
    public async Task<ActionResult<TokensResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
        => Ok(await auth.LoginAsync(request, ct));

    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] EmailRequest request, CancellationToken ct)
    {
        await auth.ForgotPasswordAsync(request, ct);
        return NoContent();
    }

    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await auth.ResetPasswordAsync(request, ct);
        return NoContent();
    }

    [EnableRateLimiting(RateLimiting.Session)]
    [HttpPost("refresh")]
    public async Task<ActionResult<TokensResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
        => Ok(await sessions.RefreshAsync(request.RefreshToken, ct));

    [EnableRateLimiting(RateLimiting.Session)]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request, CancellationToken ct)
    {
        await sessions.LogoutAsync(request.RefreshToken, ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me(CancellationToken ct)
        => Ok(await auth.GetMeAsync(User.GetUserId(), ct));
}
