using System.Text.RegularExpressions;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Models;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

public partial class GoogleAuthService(
    IGoogleHandoffDao handoffs,
    IUserDao users,
    IGoogleClient google,
    ISessionService sessions,
    TimeProvider time,
    ILogger<GoogleAuthService> logger) : IGoogleAuthService
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(5);

    public async Task<string?> StartAsync(string handoffHash, string? language, CancellationToken ct)
    {
        if (!HandoffHash().IsMatch(handoffHash))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidRequest);

        var now = time.GetUtcNow();
        // Clean-up with no background job: expired hand-offs go when the next one starts.
        await handoffs.DeleteExpiredAsync(now, ct);

        var url = google.AuthorizationUrl(state: handoffHash);
        // A reload of the window reuses the hand-off it already started.
        if (await handoffs.FindBySecretHashAsync(handoffHash, ct) is null)
        {
            await handoffs.CreateAsync(new GoogleHandoff
            {
                SecretHash = handoffHash,
                Language = AccountMails.Language(language),
                ExpiresAt = now + Lifetime,
                Failed = url is null,
            }, ct);
        }
        return url;
    }

    public async Task<GoogleCallbackResult> CallbackAsync(string? code, string? state, string? error,
        CancellationToken ct)
    {
        var handoff = state is null ? null : await handoffs.FindBySecretHashAsync(state, ct);
        if (handoff is null || handoff.ExpiresAt <= time.GetUtcNow())
            return new GoogleCallbackResult(false, handoff?.Language ?? AccountMails.Language(null));

        var user = error is null && code is not null ? await SignedInUser(code, ct) : null;
        if (user is null)
            handoff.Failed = true;
        else
            handoff.UserId = user.Id;
        await handoffs.UpdateAsync(handoff, ct);

        return new GoogleCallbackResult(user is not null, handoff.Language);
    }

    public async Task<TokensResponse?> ExchangeAsync(string secret, CancellationToken ct)
    {
        var handoff = await handoffs.FindBySecretHashAsync(SecretToken.Hash(secret), ct);
        if (handoff is null || handoff.ExpiresAt <= time.GetUtcNow())
            throw GoogleFailed();
        if (handoff.Failed)
        {
            await handoffs.ConsumeAsync(handoff.Id, ct);
            throw GoogleFailed();
        }
        if (handoff.UserId is null)
            return null;

        // Handed over once: only the request that deletes the row gets the session.
        var user = await users.GetByIdAsync(handoff.UserId.Value, ct);
        if (!await handoffs.ConsumeAsync(handoff.Id, ct) || user is null)
            throw GoogleFailed();
        return await sessions.StartAsync(user, ct);
    }

    /// <summary>The account Google's identity signs in to, or null when Google did not prove the email.</summary>
    private async Task<User?> SignedInUser(string code, CancellationToken ct)
    {
        GoogleIdentity? identity;
        try
        {
            identity = await google.ExchangeCodeAsync(code, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Google's sign-in could not be completed");
            return null;
        }
        if (identity is not { EmailVerified: true })
            return null;

        // By Google id first, so a changed email at Google still reaches the same account.
        var user = await users.GetByGoogleIdAsync(identity.Subject, ct);
        if (user is not null)
            return user;

        var email = EmailAddress.Normalize(identity.Email);
        user = await users.GetByEmailAsync(email, ct);
        if (user is null)
            return await users.CreateAsync(new User { Email = email, GoogleId = identity.Subject, EmailVerified = true }, ct);

        user.GoogleId ??= identity.Subject;
        if (!user.EmailVerified)
        {
            // Nobody proved the password's owner had this address: it could be someone who registered
            // the victim's email first, waiting for them to arrive by Google (pre-hijacking).
            user.PasswordHash = null;
            user.EmailVerified = true;
        }
        await users.UpdateAsync(user, ct);
        return user;
    }

    private static ApiException GoogleFailed() => new(StatusCodes.Status410Gone, ErrorCodes.GoogleFailed);

    // SHA-256 in base64url with no padding, as SecretToken.Hash writes it and the app computes it.
    [GeneratedRegex("^[A-Za-z0-9_-]{43}$")]
    private static partial Regex HandoffHash();
}
