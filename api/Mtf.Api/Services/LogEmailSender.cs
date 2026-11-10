using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

/// <summary>Development with no Resend key: the link goes to the log, to be opened by hand.</summary>
public class LogEmailSender(ILogger<LogEmailSender> logger) : IEmailSender
{
    public Task SendAsync(OutgoingMail mail, CancellationToken ct)
    {
        logger.LogInformation("Mail not sent (no RESEND_API_KEY). To: {To}. Subject: {Subject}. Link: {Link}",
            mail.To, mail.Subject, mail.Link);
        return Task.CompletedTask;
    }
}
