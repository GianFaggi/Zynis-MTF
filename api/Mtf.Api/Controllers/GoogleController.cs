using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Services;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Controllers;

/// <summary>Google sign-in by hand-off (design decision 5, ADR 0011). HTTP only: the rules live in the service.</summary>
[ApiController]
[Route("api/auth/google")]
public class GoogleController(IGoogleAuthService google) : ControllerBase
{
    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpGet("login")]
    public async Task<IActionResult> Login([FromQuery] string handoff, [FromQuery] string? lang, CancellationToken ct)
    {
        var url = await google.StartAsync(handoff, lang, ct);
        return url is null ? Page(succeeded: false, AccountMails.Language(lang)) : Redirect(url);
    }

    [EnableRateLimiting(RateLimiting.Auth)]
    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string? code, [FromQuery] string? state,
        [FromQuery] string? error, CancellationToken ct)
    {
        var result = await google.CallbackAsync(code, state, error, ct);
        return Page(result.Succeeded, result.Language);
    }

    [EnableRateLimiting(RateLimiting.Session)]
    [HttpPost("exchange")]
    public async Task<IActionResult> Exchange([FromBody] GoogleExchangeRequest request, CancellationToken ct)
    {
        var tokens = await google.ExchangeAsync(request.Secret, ct);
        return tokens is null ? Accepted() : Ok(tokens);
    }

    private ContentResult Page(bool succeeded, string language)
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers["Referrer-Policy"] = "no-referrer";
        return Content(GooglePages.Render(succeeded, language), "text/html; charset=utf-8");
    }
}
