namespace Mtf.Api.Services.Interfaces;

/// <summary>A rendered mail. <see cref="Link"/> is the one link it carries, kept apart for logging and tests.</summary>
public record OutgoingMail(string To, string Subject, string Html, string Link);

/// <summary>
/// Sends a mail: Resend in production, the log in development, a fake in tests (design decision 6).
/// </summary>
public interface IEmailSender
{
    Task SendAsync(OutgoingMail mail, CancellationToken ct);
}
