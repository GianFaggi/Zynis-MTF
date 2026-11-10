namespace Mtf.Api.Services;

/// <summary>
/// The short page Google's window ends on. It carries no token and loads nothing from elsewhere; it only
/// says to go back to MTF and tries to close itself, which browsers allow for a window a page opened.
/// </summary>
public static class GooglePages
{
    public static string Render(bool succeeded, string language)
    {
        var english = language == "en";
        var message = (succeeded, english) switch
        {
            (true, true) => "Done. Go back to MTF to continue.",
            (true, false) => "Listo. Volvé a MTF para seguir.",
            (false, true) => "We couldn't sign you in with Google. Go back to MTF and try again.",
            (false, false) => "No pudimos iniciar sesión con Google. Volvé a MTF y probá de nuevo.",
        };
        return $$"""
            <!doctype html>
            <html lang="{{(english ? "en" : "es")}}">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>MTF</title>
              <style>
                body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #F5F1EA; color: #2A2724;
                       font: 18px/1.5 Georgia, serif; padding: 24px; box-sizing: border-box; text-align: center; }
                @media (prefers-color-scheme: dark) { body { background: #1C1A18; color: #ECE6DE; } }
              </style>
            </head>
            <body>
              <p>{{message}}</p>
              <script>window.close();</script>
            </body>
            </html>
            """;
    }
}
