using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Mtf.Api.Infrastructure;
using Mtf.Api.Models;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

public class TokenService(IConfiguration config, TimeProvider time) : ITokenService
{
    private readonly SigningCredentials _credentials = new(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!.Trim())),
        SecurityAlgorithms.HmacSha256);

    public AccessToken CreateAccessToken(User user)
    {
        var now = time.GetUtcNow();
        var expiresAt = now + AccessTokenDefaults.Lifetime;
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = AccessTokenDefaults.Issuer,
            Audience = AccessTokenDefaults.Audience,
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
            ]),
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = _credentials,
        };
        return new AccessToken(new JsonWebTokenHandler().CreateToken(descriptor), expiresAt);
    }
}
