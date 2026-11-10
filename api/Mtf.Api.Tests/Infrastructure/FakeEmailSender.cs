using System.Collections.Concurrent;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>Keeps every mail instead of sending it, so tests can follow its link.</summary>
public class FakeEmailSender : IEmailSender
{
    private readonly ConcurrentQueue<OutgoingMail> _sent = new();

    public IReadOnlyList<OutgoingMail> Sent => [.. _sent];

    public IReadOnlyList<OutgoingMail> SentTo(string email) =>
        [.. _sent.Where(m => m.To.Equals(email, StringComparison.OrdinalIgnoreCase))];

    /// <summary>The token of the latest mail to <paramref name="email"/>, from its link's fragment.</summary>
    public string LatestToken(string email)
    {
        var link = SentTo(email)[^1].Link;
        return link[(link.IndexOf('=') + 1)..];
    }

    public Task SendAsync(OutgoingMail mail, CancellationToken ct)
    {
        _sent.Enqueue(mail);
        return Task.CompletedTask;
    }
}
