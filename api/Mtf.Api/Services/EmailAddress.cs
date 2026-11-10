using System.Net.Mail;

namespace Mtf.Api.Services;

/// <summary>Emails are compared without case or surrounding spaces, so one address has one account.</summary>
public static class EmailAddress
{
    private const int MaxLength = 320;

    public static string Normalize(string email) => email.Trim().ToLowerInvariant();

    /// <summary>A single plain address (no display name), with a domain.</summary>
    public static bool IsValid(string normalized) =>
        normalized.Length <= MaxLength
        && MailAddress.TryCreate(normalized, out var address)
        && address.Address == normalized
        && address.Host.Contains('.');
}
