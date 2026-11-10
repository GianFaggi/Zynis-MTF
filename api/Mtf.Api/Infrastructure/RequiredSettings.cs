namespace Mtf.Api.Infrastructure;

/// <summary>
/// Stops the start when a setting is missing, naming it but never showing a value
/// (design decision 1). Names are written as environment variables, the way they are set on Render.
/// </summary>
public static class RequiredSettings
{
    public const int MinJwtKeyLength = 32;

    // Always required: the service cannot run without them, not even locally.
    private static readonly string[] Core =
    [
        "ConnectionStrings:DefaultConnection",
        "Jwt:Key",
        "App:FrontendUrl",
        "App:ApiUrl",
        "Cors:AllowedOrigins:0",
    ];

    // Optional in Development: Google answers that it is not set up, and mail is logged instead of sent.
    private static readonly string[] Production =
    [
        "Google:ClientId",
        "Google:ClientSecret",
        "RESEND_API_KEY",
        "Email:From",
    ];

    public static IReadOnlyList<string> Problems(IConfiguration config, bool isDevelopment)
    {
        var required = isDevelopment ? Core : [.. Core, .. Production];
        var problems = required
            .Where(key => string.IsNullOrWhiteSpace(config[key]))
            .Select(key => $"{AsEnvironmentVariable(key)} is missing")
            .ToList();

        var jwtKey = config["Jwt:Key"];
        if (!string.IsNullOrWhiteSpace(jwtKey) && jwtKey.Trim().Length < MinJwtKeyLength)
            problems.Add($"Jwt__Key must be at least {MinJwtKeyLength} characters");

        return problems;
    }

    public static void Check(IConfiguration config, bool isDevelopment)
    {
        var problems = Problems(config, isDevelopment);
        if (problems.Count > 0)
            throw new InvalidOperationException(
                "The API cannot start: " + string.Join("; ", problems) + ".");
    }

    private static string AsEnvironmentVariable(string key) => key.Replace(":", "__");
}
