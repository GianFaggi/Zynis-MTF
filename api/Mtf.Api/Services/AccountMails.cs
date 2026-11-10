using System.Net;
using Mtf.Api.Services.Interfaces;

namespace Mtf.Api.Services;

public enum AccountMail
{
    Verification,
    AccountExists,
    Recovery,
}

/// <summary>
/// The three account mails, in Spanish and English. Short HTML in Paper ink, no name, no accent color,
/// and every one says it can be ignored (accounts spec, "Mails come from Zynis").
/// </summary>
public static class AccountMails
{
    public static string Language(string? language) => language == "en" ? "en" : "es";

    public static OutgoingMail Compose(AccountMail kind, string language, string to, string link)
    {
        var text = (kind, Language(language)) switch
        {
            (AccountMail.Verification, "en") => new Text(
                "Confirm your email — MTF",
                "To finish creating your MTF account, confirm your email.",
                "Confirm email",
                "The link expires in 24 hours.",
                "If you didn't create an MTF account, you can ignore this email."),
            (AccountMail.Verification, _) => new Text(
                "Confirmá tu email — MTF",
                "Para terminar de crear tu cuenta de MTF, confirmá tu email.",
                "Confirmar email",
                "El enlace vence en 24 horas.",
                "Si no creaste una cuenta de MTF, podés ignorar este mail."),
            (AccountMail.AccountExists, "en") => new Text(
                "You already have an MTF account",
                "Someone, maybe you, tried to create an MTF account with this email, but you already have one. If you forgot your password, you can choose a new one.",
                "Choose a new password",
                "The link expires in 1 hour.",
                "If it wasn't you, you can ignore this email: your account has not changed."),
            (AccountMail.AccountExists, _) => new Text(
                "Ya tenés una cuenta de MTF",
                "Alguien, quizás vos, intentó crear una cuenta de MTF con este email, pero ya tenés una. Si olvidaste tu contraseña, podés elegir una nueva.",
                "Elegir una contraseña nueva",
                "El enlace vence en 1 hora.",
                "Si no fuiste vos, podés ignorar este mail: tu cuenta no cambió."),
            (AccountMail.Recovery, "en") => new Text(
                "Choose a new password — MTF",
                "You asked to recover your MTF password.",
                "Choose a new password",
                "The link expires in 1 hour.",
                "If you didn't ask for this, you can ignore this email: your password stays the same."),
            (_, _) => new Text(
                "Elegí una contraseña nueva — MTF",
                "Pediste recuperar tu contraseña de MTF.",
                "Elegir una contraseña nueva",
                "El enlace vence en 1 hora.",
                "Si no lo pediste, podés ignorar este mail: tu contraseña no cambia."),
        };

        return new OutgoingMail(to, text.Subject, Html(text, link), link);
    }

    private static string Html(Text text, string link)
    {
        var href = WebUtility.HtmlEncode(link);
        return $"""
            <div style="font-family:Georgia,serif;color:#2A2724;background:#F5F1EA;padding:24px;">
              <div style="max-width:480px;margin:0 auto;background:#FCFAF6;border:1px solid #E3DCD1;border-radius:12px;padding:24px;">
                <p style="font-size:20px;margin:0 0 16px;">MTF</p>
                <p style="font-size:16px;line-height:1.5;margin:0 0 20px;">{text.Lead}</p>
                <p style="margin:0 0 20px;"><a href="{href}" style="background:#2A2724;color:#FCFAF6;padding:10px 20px;border-radius:999px;text-decoration:none;display:inline-block;">{text.Action}</a></p>
                <p style="font-size:14px;color:#766E66;margin:0 0 8px;">{text.Expiry}</p>
                <p style="font-size:14px;color:#766E66;margin:0;">{text.Ignore}</p>
              </div>
            </div>
            """;
    }

    private record Text(string Subject, string Lead, string Action, string Expiry, string Ignore);
}
