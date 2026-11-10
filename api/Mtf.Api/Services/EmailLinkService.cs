using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Models;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

public class EmailLinkService(
    IEmailTokenDao emailTokens,
    IEmailSender sender,
    IConfiguration config,
    TimeProvider time,
    ILogger<EmailLinkService> logger) : IEmailLinkService
{
    public static readonly TimeSpan MinimumWait = TimeSpan.FromSeconds(60);
    public static readonly TimeSpan VerifyLifetime = TimeSpan.FromHours(24);
    public static readonly TimeSpan ResetLifetime = TimeSpan.FromHours(1);

    public async Task SendAsync(User user, AccountMail mail, string? language, CancellationToken ct)
    {
        // The "account exists" mail reuses a reset token: same wait, same link, no new table (design decision 3).
        var purpose = mail == AccountMail.Verification ? EmailTokenPurpose.Verify : EmailTokenPurpose.Reset;
        var now = time.GetUtcNow();

        var previous = await emailTokens.GetAsync(user.Id, purpose, ct);
        if (previous is not null && previous.CreatedAt > now - MinimumWait)
            return;

        var token = SecretToken.New();
        var lifetime = purpose == EmailTokenPurpose.Verify ? VerifyLifetime : ResetLifetime;
        await emailTokens.ReplaceAsync(user.Id, purpose, SecretToken.Hash(token), now, now + lifetime, ct);

        // The token travels in the fragment, which never reaches Vercel's logs (design decision 3).
        var fragment = purpose == EmailTokenPurpose.Verify ? "verify" : "reset";
        var link = $"{config["App:FrontendUrl"]!.TrimEnd('/')}/#{fragment}={token}";

        try
        {
            await sender.SendAsync(AccountMails.Compose(mail, AccountMails.Language(language), user.Email, link), ct);
        }
        catch (Exception ex)
        {
            // The answer stays the same; the user can ask again after the wait.
            logger.LogWarning(ex, "Could not send the {Mail} mail to user {UserId}", mail, user.Id);
        }
    }

    public Task<Guid?> ConsumeAsync(string token, EmailTokenPurpose purpose, CancellationToken ct)
        => emailTokens.ConsumeAsync(SecretToken.Hash(token), purpose, time.GetUtcNow(), ct);
}
