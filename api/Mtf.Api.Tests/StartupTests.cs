using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Mtf.Api.Infrastructure;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>
/// The settings guard (design decision 1) and errors that never leak internals (backend-service spec).
/// </summary>
[Collection(ApiCollection.Name)]
public class StartupTests(ApiFactory factory)
{
    private const string ConnectionString = "Host=db.example;Database=mtf;Username=mtf;Password=pg-secret-value";
    private const string GoogleSecret = "google-secret-value";
    private const string ResendKey = "re_resend-secret-value";

    private static Dictionary<string, string> AllProductionSettings() => new()
    {
        ["ConnectionStrings:DefaultConnection"] = ConnectionString,
        ["Jwt:Key"] = ApiFactory.JwtKey,
        ["App:FrontendUrl"] = ApiFactory.FrontendUrl,
        ["App:ApiUrl"] = ApiFactory.ApiUrl,
        ["Cors:AllowedOrigins:0"] = ApiFactory.AllowedOrigin,
        ["Google:ClientId"] = "client-id",
        ["Google:ClientSecret"] = GoogleSecret,
        ["RESEND_API_KEY"] = ResendKey,
        ["Email:From"] = "MTF By Zynis <no-reply@zynis.com.ar>",
    };

    [Fact]
    public void A_missing_signing_key_stops_the_start_and_names_it_without_secrets()
    {
        var settings = AllProductionSettings();
        settings.Remove("Jwt:Key");

        var message = StartFailure(settings);

        Assert.Contains("Jwt__Key is missing", message);
        Assert.DoesNotContain("pg-secret-value", message);
        Assert.DoesNotContain(GoogleSecret, message);
        Assert.DoesNotContain(ResendKey, message);
    }

    [Fact]
    public void A_signing_key_under_32_characters_stops_the_start_without_showing_it()
    {
        var settings = AllProductionSettings();
        settings["Jwt:Key"] = "short-but-secret";

        var message = StartFailure(settings);

        Assert.Contains("Jwt__Key must be at least 32 characters", message);
        Assert.DoesNotContain("short-but-secret", message);
    }

    [Fact]
    public void DATABASE_URL_is_not_a_fallback()
    {
        var settings = AllProductionSettings();
        settings.Remove("ConnectionStrings:DefaultConnection");
        settings["DATABASE_URL"] = "postgres://mtf:secret@db.example/mtf";

        var message = StartFailure(settings);

        Assert.Contains("ConnectionStrings__DefaultConnection is missing", message);
    }

    [Theory]
    [InlineData("ConnectionStrings:DefaultConnection", "ConnectionStrings__DefaultConnection")]
    [InlineData("Jwt:Key", "Jwt__Key")]
    [InlineData("App:FrontendUrl", "App__FrontendUrl")]
    [InlineData("App:ApiUrl", "App__ApiUrl")]
    [InlineData("Cors:AllowedOrigins:0", "Cors__AllowedOrigins__0")]
    [InlineData("Google:ClientId", "Google__ClientId")]
    [InlineData("Google:ClientSecret", "Google__ClientSecret")]
    [InlineData("RESEND_API_KEY", "RESEND_API_KEY")]
    [InlineData("Email:From", "Email__From")]
    public void Every_production_setting_is_required(string key, string named)
    {
        var settings = AllProductionSettings();
        settings.Remove(key);

        var problems = RequiredSettings.Problems(Config(settings), isDevelopment: false);

        Assert.Equal($"{named} is missing", Assert.Single(problems));
    }

    [Fact]
    public void Development_does_not_need_Google_or_mail()
    {
        var settings = AllProductionSettings();
        foreach (var key in new[] { "Google:ClientId", "Google:ClientSecret", "RESEND_API_KEY", "Email:From" })
            settings.Remove(key);

        Assert.Empty(RequiredSettings.Problems(Config(settings), isDevelopment: true));
        Assert.Equal(4, RequiredSettings.Problems(Config(settings), isDevelopment: false).Count);
    }

    [Fact]
    public async Task An_unexpected_failure_answers_500_with_no_internal_detail()
    {
        var response = await factory.CreateClient().GetAsync("/test/throw");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.DoesNotContain("password_hash", body);
        Assert.DoesNotContain("InvalidOperationException", body);
        Assert.DoesNotContain(" at ", body);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("server_error", problem.GetProperty("code").GetString());
        Assert.Contains(factory.Logs.Lines, line => line.Contains(ThrowingController.InternalDetail));
    }

    private static IConfiguration Config(Dictionary<string, string> settings) =>
        new ConfigurationBuilder().AddInMemoryCollection(settings!).Build();

    /// <summary>Starts the app as in production and returns why it refused to start.</summary>
    private static string StartFailure(Dictionary<string, string> settings)
    {
        using var app = new SettingsOnlyFactory(settings);
        var exception = Record.Exception(() => app.CreateClient());
        Assert.NotNull(exception);
        var messages = new List<string>();
        for (var e = exception; e is not null; e = e.InnerException)
            messages.Add(e.Message);
        return string.Join(" | ", messages);
    }

    /// <summary>The app with exactly these settings and no database: the guard runs before any connection.</summary>
    private sealed class SettingsOnlyFactory(Dictionary<string, string> settings) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            foreach (var (key, value) in settings)
                builder.UseSetting(key, value);
        }
    }
}
