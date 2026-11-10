using Mtf.Api.DTOs;

namespace Mtf.Api.Services.Interfaces;

/// <summary>Email and password accounts (accounts spec).</summary>
public interface IAuthService
{
    Task RegisterAsync(RegisterRequest request, CancellationToken ct);
    Task VerifyEmailAsync(string token, CancellationToken ct);
    Task ResendVerificationAsync(EmailRequest request, CancellationToken ct);
    Task<TokensResponse> LoginAsync(LoginRequest request, CancellationToken ct);
    Task ForgotPasswordAsync(EmailRequest request, CancellationToken ct);
    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct);
    Task<MeResponse> GetMeAsync(Guid userId, CancellationToken ct);
}
