using Mtf.Api.Models;

namespace Mtf.Api.Services.Interfaces;

public record AccessToken(string Token, DateTimeOffset ExpiresAt);

public interface ITokenService
{
    /// <summary>A 15-minute JWT carrying the user's id (`sub`) and email.</summary>
    AccessToken CreateAccessToken(User user);
}
