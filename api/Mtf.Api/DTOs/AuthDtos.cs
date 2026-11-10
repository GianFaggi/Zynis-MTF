namespace Mtf.Api.DTOs;

// Requests. A missing field answers 400 invalid_request; the services check the values themselves.
public record RegisterRequest(string Email, string Password, string? Language);
public record EmailRequest(string Email, string? Language);
public record LoginRequest(string Email, string Password);
public record TokenRequest(string Token);
public record ResetPasswordRequest(string Token, string NewPassword);
public record RefreshRequest(string RefreshToken);
public record GoogleExchangeRequest(string Secret);

// Answers.
public record TokensResponse(string AccessToken, DateTimeOffset AccessTokenExpiresAt, string RefreshToken, string Email);
public record MeResponse(string Email, bool HasPassword, bool HasGoogle);
