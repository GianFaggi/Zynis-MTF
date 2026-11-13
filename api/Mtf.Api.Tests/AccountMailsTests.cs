using Mtf.Api.Services;

namespace Mtf.Api.Tests;

/// <summary>The three mails, in both languages: the link, the expiry and "you can ignore this" in every one.</summary>
public class AccountMailsTests
{
    private const string Link = "https://mtf.zynis.com.ar/#reset=abc_DEF-123";

    public static TheoryData<AccountMail, string, string, string> Mails => new()
    {
        { AccountMail.Verification, "es", "Confirmá tu email", "podés ignorar este mail" },
        { AccountMail.Verification, "en", "Confirm your email", "you can ignore this email" },
        { AccountMail.AccountExists, "es", "Ya tenés una cuenta", "podés ignorar este mail" },
        { AccountMail.AccountExists, "en", "You already have an MTF account", "you can ignore this email" },
        { AccountMail.Recovery, "es", "Elegí una contraseña nueva", "podés ignorar este mail" },
        { AccountMail.Recovery, "en", "Choose a new password", "you can ignore this email" },
    };

    [Theory]
    [MemberData(nameof(Mails))]
    public void Each_mail_renders_in_its_language(AccountMail kind, string language, string subject, string ignoreLine)
    {
        var mail = AccountMails.Compose(kind, language, "gian@example.com", Link);

        Assert.Equal("gian@example.com", mail.To);
        Assert.StartsWith(subject, mail.Subject);
        Assert.Contains(ignoreLine, mail.Html);
        Assert.Contains($"href=\"{Link}\"", mail.Html);
        Assert.StartsWith($"<div lang=\"{language}\"", mail.Html);
        Assert.Equal(Link, mail.Link);
    }

    [Theory]
    [InlineData(AccountMail.Verification, "24")]
    [InlineData(AccountMail.AccountExists, "1")]
    [InlineData(AccountMail.Recovery, "1")]
    public void Each_mail_says_when_its_link_expires(AccountMail kind, string hours)
    {
        Assert.Contains($" {hours} hora", AccountMails.Compose(kind, "es", "a@example.com", Link).Html);
        Assert.Contains($" {hours} hour", AccountMails.Compose(kind, "en", "a@example.com", Link).Html);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("fr")]
    public void An_unknown_language_falls_back_to_Spanish(string? language)
        => Assert.Equal("es", AccountMails.Language(language));

    [Fact]
    public void No_mail_uses_the_accent_color()
    {
        foreach (var kind in Enum.GetValues<AccountMail>())
        foreach (var language in new[] { "es", "en" })
        {
            var html = AccountMails.Compose(kind, language, "a@example.com", Link).Html;
            Assert.DoesNotContain("#B85A3A", html, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("#9C4527", html, StringComparison.OrdinalIgnoreCase);
        }
    }
}

public class SecretTokenTests
{
    [Fact]
    public void A_token_is_256_random_bits_in_base64url()
    {
        var token = SecretToken.New();

        Assert.Equal(43, token.Length);
        Assert.Matches("^[A-Za-z0-9_-]+$", token);
        Assert.NotEqual(token, SecretToken.New());
    }

    [Fact]
    public void The_hash_is_SHA256_in_base64url_with_no_padding_the_same_vector_the_app_tests()
    {
        // The app hashes a Google hand-off secret itself (src/account/google.ts) and must match exactly.
        Assert.Equal("ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0", SecretToken.Hash("abc"));
    }

    [Fact]
    public void Its_hash_is_stable_and_never_the_token()
    {
        var token = SecretToken.New();

        Assert.Equal(SecretToken.Hash(token), SecretToken.Hash(token));
        Assert.NotEqual(token, SecretToken.Hash(token));
        Assert.NotEqual(SecretToken.Hash(token), SecretToken.Hash(SecretToken.New()));
    }
}
