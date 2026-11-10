namespace Mtf.Api.Infrastructure;

/// <summary>Every code the API answers with. The app translates them; the API sends no text for users.</summary>
public static class ErrorCodes
{
    public const string InvalidRequest = "invalid_request";
    public const string InvalidEmail = "invalid_email";
    public const string InvalidPassword = "invalid_password";
    public const string InvalidToken = "invalid_token";
    public const string InvalidCredentials = "invalid_credentials";
    public const string EmailNotVerified = "email_not_verified";
    public const string SessionEnded = "session_ended";
    public const string GoogleFailed = "google_failed";
    public const string TooManyRequests = "too_many_requests";
    public const string ServerError = "server_error";
}
