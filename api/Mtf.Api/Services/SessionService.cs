using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Models;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

public class SessionService(ISessionDao sessions, IUserDao users, ITokenService tokens, TimeProvider time)
    : ISessionService
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(180);
    public static readonly TimeSpan Grace = TimeSpan.FromMinutes(2);

    // A rotation that loses a race reads the session again; a few rounds cover any real pair of tabs.
    private const int RotationAttempts = 3;

    public async Task<TokensResponse> StartAsync(User user, CancellationToken ct)
    {
        var now = time.GetUtcNow();
        // Clean-up with no background job: a user's expired sessions go when they sign in.
        await sessions.DeleteExpiredForUserAsync(user.Id, now, ct);

        var refreshToken = SecretToken.New();
        await sessions.CreateAsync(new Session
        {
            UserId = user.Id,
            TokenHash = SecretToken.Hash(refreshToken),
            ExpiresAt = now + Lifetime,
        }, ct);
        return Tokens(user, refreshToken);
    }

    public async Task<TokensResponse> RefreshAsync(string refreshToken, CancellationToken ct)
    {
        var hash = SecretToken.Hash(refreshToken);
        for (var attempt = 0; attempt < RotationAttempts; attempt++)
        {
            var now = time.GetUtcNow();

            var current = await sessions.FindByTokenHashAsync(hash, ct);
            if (current is not null)
            {
                if (current.ExpiresAt <= now)
                    throw await End(current);
                var rotated = await Rotate(current, expectedTokenHash: hash, now, ct);
                if (rotated is not null)
                    return rotated;
                continue;
            }

            var retired = await sessions.FindByPreviousTokenHashAsync(hash, ct);
            if (retired is not null)
            {
                // A lost answer or a second tab: the token retired less than 2 minutes ago still works.
                // Later than that, someone else may hold a copy, so the session ends.
                if (retired.RotatedAt is null || retired.RotatedAt <= now - Grace || retired.ExpiresAt <= now)
                    throw await End(retired);
                var rotated = await Rotate(retired, expectedTokenHash: retired.TokenHash, now, ct);
                if (rotated is not null)
                    return rotated;
                continue;
            }

            // Unknown: refused, and no session changes.
            throw SessionEnded();
        }
        throw SessionEnded();

        async Task<ApiException> End(Session session)
        {
            await sessions.DeleteAsync(session.Id, ct);
            return SessionEnded();
        }
    }

    public Task LogoutAsync(string refreshToken, CancellationToken ct)
        => sessions.DeleteByTokenHashAsync(SecretToken.Hash(refreshToken), ct);

    public Task EndAllAsync(Guid userId, CancellationToken ct)
        => sessions.DeleteAllForUserAsync(userId, ct);

    private async Task<TokensResponse?> Rotate(Session session, string expectedTokenHash, DateTimeOffset now,
        CancellationToken ct)
    {
        var user = await users.GetByIdAsync(session.UserId, ct) ?? throw SessionEnded();
        var refreshToken = SecretToken.New();
        var rotated = await sessions.TryRotateAsync(session.Id, expectedTokenHash, SecretToken.Hash(refreshToken),
            rotatedAt: now, expiresAt: now + Lifetime, ct);
        return rotated ? Tokens(user, refreshToken) : null;
    }

    private TokensResponse Tokens(User user, string refreshToken)
    {
        var access = tokens.CreateAccessToken(user);
        return new TokensResponse(access.Token, access.ExpiresAt, refreshToken, user.Email);
    }

    private static ApiException SessionEnded() => new(StatusCodes.Status401Unauthorized, ErrorCodes.SessionEnded);
}
