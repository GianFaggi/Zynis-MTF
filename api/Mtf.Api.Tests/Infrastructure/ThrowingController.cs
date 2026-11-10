using Microsoft.AspNetCore.Mvc;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>Exists only in tests: fails the way an unexpected bug would.</summary>
[ApiController]
[Route("test/throw")]
public class ThrowingController : ControllerBase
{
    public const string InternalDetail = "SELECT password_hash FROM users WHERE id = 42";

    [HttpGet]
    public IActionResult Throw() => throw new InvalidOperationException(InternalDetail);
}
