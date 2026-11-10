using Mtf.Api.Services.Interfaces;
using Resend;

namespace Mtf.Api.Services;

/// <summary>Sends through Resend's HTTPS API: Render blocks SMTP (ADR 0009).</summary>
public class ResendEmailSender(IResend resend, IConfiguration config) : IEmailSender
{
    public async Task SendAsync(OutgoingMail mail, CancellationToken ct)
    {
        var message = new EmailMessage
        {
            From = config["Email:From"]!,
            To = { mail.To },
            Subject = mail.Subject,
            HtmlBody = mail.Html,
        };
        await resend.EmailSendAsync(message, ct);
    }
}
