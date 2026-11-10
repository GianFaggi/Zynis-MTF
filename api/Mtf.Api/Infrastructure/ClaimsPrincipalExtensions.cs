using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Mtf.Api.Infrastructure;

public static class ClaimsPrincipalExtensions
{
    /// <summary>The user id from the `sub` claim the API issues (inbound claims are not renamed).</summary>
    public static Guid GetUserId(this ClaimsPrincipal principal)
        => Guid.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id)
            ? id
            : throw new ApiException(StatusCodes.Status401Unauthorized, ErrorCodes.SessionEnded);
}
