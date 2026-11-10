using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Microsoft.EntityFrameworkCore;
using Mtf.Api.Data;
using Mtf.Api.Services.Interfaces;
using Testcontainers.PostgreSql;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>
/// The real app against Postgres 17 in a container, with mail, Google and the clock faked.
/// Runs as "Testing", not Development, so every production setting is required, as on Render.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string AllowedOrigin = "https://mtf.zynis.com.ar";
    public const string FrontendUrl = "https://mtf.zynis.com.ar";
    public const string ApiUrl = "https://api.mtf.zynis.com.ar";
    public const string JwtKey = "integration-test-signing-key-32-chars!";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:17-alpine").Build();

    public FakeEmailSender Mail { get; } = new();
    public FakeGoogleClient Google { get; } = new();
    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.UtcNow);
    public LogCapture Logs { get; } = new();
    public QueryCounter Queries { get; } = new();
    public CountingPasswordHasher Passwords { get; } = new();

    public string ConnectionString => _db.GetConnectionString();
    public PostgreSqlContainer Database => _db;

    /// <summary>Extra settings for one test class, such as low rate limits.</summary>
    protected virtual IDictionary<string, string> Settings => new Dictionary<string, string>();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.UseSetting("ConnectionStrings:DefaultConnection", _db.GetConnectionString());
        builder.UseSetting("Jwt:Key", JwtKey);
        builder.UseSetting("App:FrontendUrl", FrontendUrl);
        builder.UseSetting("App:ApiUrl", ApiUrl);
        builder.UseSetting("Cors:AllowedOrigins:0", AllowedOrigin);
        builder.UseSetting("Google:ClientId", "test-client-id.apps.googleusercontent.com");
        builder.UseSetting("Google:ClientSecret", "test-client-secret");
        builder.UseSetting("RESEND_API_KEY", "re_test_key");
        builder.UseSetting("Email:From", "MTF By Zynis <no-reply@zynis.com.ar>");

        // Relaxed so endpoint tests never trip 429; RateLimitingTests lowers them.
        builder.UseSetting("RateLimiting:Global:PermitLimit", "100000");
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "100000");
        builder.UseSetting("RateLimiting:Session:PermitLimit", "100000");

        foreach (var (key, value) in Settings)
            builder.UseSetting(key, value);

        builder.ConfigureLogging(logging => logging.AddProvider(Logs));

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Mail);
            services.RemoveAll<IGoogleClient>();
            services.AddSingleton<IGoogleClient>(Google);
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<IPasswordHasher>();
            services.AddSingleton<IPasswordHasher>(Passwords);
            services.AddControllers().AddApplicationPart(typeof(ApiFactory).Assembly);
            services.ConfigureDbContext<AppDbContext>(options => options.AddInterceptors(Queries));
        });
    }

    public async Task InitializeAsync() => await _db.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}

/// <summary>
/// One shared container for the endpoint tests. They run one class at a time, so moving the
/// shared clock never races another test; each test uses its own email addresses.
/// </summary>
[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
