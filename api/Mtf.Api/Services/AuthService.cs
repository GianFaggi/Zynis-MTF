using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.DTOs;
using Mtf.Api.Infrastructure;
using Mtf.Api.Models;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

public class AuthService(
    IUserDao users,
    IEmailLinkService emailLinks,
    ISessionService sessions,
    IPasswordHasher passwords) : IAuthService
{
    public async Task RegisterAsync(RegisterRequest request, CancellationToken ct)
    {
        var email = EmailAddress.Normalize(request.Email);
        if (!EmailAddress.IsValid(email))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidEmail);
        if (!PasswordPolicy.IsValid(request.Password))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidPassword);

        // Hashed before the lookup, so a new and an existing email take the same time.
        var passwordHash = passwords.Hash(request.Password);
        var existing = await users.GetByEmailAsync(email, ct);

        // Same answer whoever has an account; only the mail differs, and no password changes.
        if (existing is null)
        {
            var user = await users.CreateAsync(new User { Email = email, PasswordHash = passwordHash }, ct);
            await emailLinks.SendAsync(user, AccountMail.Verification, request.Language, ct);
        }
        else if (existing.EmailVerified)
            await emailLinks.SendAsync(existing, AccountMail.AccountExists, request.Language, ct);
        else
            await emailLinks.SendAsync(existing, AccountMail.Verification, request.Language, ct);
    }

    public async Task VerifyEmailAsync(string token, CancellationToken ct)
    {
        var user = await UserOfLink(token, EmailTokenPurpose.Verify, ct);
        user.EmailVerified = true;
        await users.UpdateAsync(user, ct);
    }

    public async Task ResendVerificationAsync(EmailRequest request, CancellationToken ct)
    {
        var user = await users.GetByEmailAsync(EmailAddress.Normalize(request.Email), ct);
        if (user is { EmailVerified: false })
            await emailLinks.SendAsync(user, AccountMail.Verification, request.Language, ct);
    }

    public async Task<TokensResponse> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var user = await users.GetByEmailAsync(EmailAddress.Normalize(request.Email), ct);

        // Unknown email, Google-only account and wrong password: one answer, one bcrypt check each.
        if (!passwords.Verify(request.Password, user?.PasswordHash) || user is null)
            throw new ApiException(StatusCodes.Status401Unauthorized, ErrorCodes.InvalidCredentials);
        if (!user.EmailVerified)
            throw new ApiException(StatusCodes.Status403Forbidden, ErrorCodes.EmailNotVerified);

        return await sessions.StartAsync(user, ct);
    }

    public async Task ForgotPasswordAsync(EmailRequest request, CancellationToken ct)
    {
        var user = await users.GetByEmailAsync(EmailAddress.Normalize(request.Email), ct);
        if (user is not null)
            await emailLinks.SendAsync(user, AccountMail.Recovery, request.Language, ct);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct)
    {
        if (!PasswordPolicy.IsValid(request.NewPassword))
            throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidPassword);

        var user = await UserOfLink(request.Token, EmailTokenPurpose.Reset, ct);
        user.PasswordHash = passwords.Hash(request.NewPassword);
        // Using the link proves the address, and a new password signs out every device.
        user.EmailVerified = true;
        await users.UpdateAsync(user, ct);
        await sessions.EndAllAsync(user.Id, ct);
    }

    public async Task<MeResponse> GetMeAsync(Guid userId, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct)
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, ErrorCodes.SessionEnded);
        return new MeResponse(user.Email, user.PasswordHash is not null, user.GoogleId is not null);
    }

    private async Task<User> UserOfLink(string token, EmailTokenPurpose purpose, CancellationToken ct)
    {
        var userId = await emailLinks.ConsumeAsync(token, purpose, ct);
        var user = userId is null ? null : await users.GetByIdAsync(userId.Value, ct);
        return user ?? throw new ApiException(StatusCodes.Status400BadRequest, ErrorCodes.InvalidToken);
    }
}
