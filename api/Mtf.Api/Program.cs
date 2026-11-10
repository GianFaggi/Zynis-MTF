using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Mtf.Api.DAOs;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Data;
using Mtf.Api.Infrastructure;
using Mtf.Api.Services;
using Mtf.Api.Services.Interfaces;
using Resend;

var builder = WebApplication.CreateBuilder(args);

// Fail at start-up, naming what is missing, instead of on the first request (design decision 1).
RequiredSettings.Check(builder.Configuration, builder.Environment.IsDevelopment());

var config = builder.Configuration;

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
        options.InvalidModelStateResponseFactory = _ => new BadRequestObjectResult(
            ApiExceptionHandler.Problem(StatusCodes.Status400BadRequest, ErrorCodes.InvalidRequest)));
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddSingleton(TimeProvider.System);

// The connection string comes only from this setting: no DATABASE_URL fallback (ADR 0009, rule 2).
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

// Controller → service → DAO, each behind its interface (design decision 1).
builder.Services.AddScoped<IUserDao, UserDao>();
builder.Services.AddScoped<IEmailTokenDao, EmailTokenDao>();
builder.Services.AddScoped<ISessionDao, SessionDao>();
builder.Services.AddScoped<IGoogleHandoffDao, GoogleHandoffDao>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailLinkService, EmailLinkService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddHttpClient<IGoogleClient, GoogleClient>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();

// Mail goes through Resend; with no key (Development only, see RequiredSettings) the link is logged instead.
var resendApiKey = config["RESEND_API_KEY"];
if (!string.IsNullOrWhiteSpace(resendApiKey))
{
    builder.Services.AddOptions<ResendClientOptions>().Configure(o => o.ApiToken = resendApiKey);
    builder.Services.AddHttpClient<ResendClient>();
    builder.Services.AddTransient<IResend, ResendClient>();
    builder.Services.AddTransient<IEmailSender, ResendEmailSender>();
}
else
{
    builder.Services.AddTransient<IEmailSender, LogEmailSender>();
}

var jwtKey = config["Jwt:Key"]!.Trim();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<TimeProvider>((options, time) =>
    {
        // Read the id from the `sub` claim the API issues, not the framework's rename of it.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = AccessTokenDefaults.Issuer,
            ValidAudience = AccessTokenDefaults.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            // The API issues and checks its own tokens, so there is no clock to drift from: no skew,
            // and the injected clock, so tests can move it past the 15 minutes.
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            LifetimeValidator = (notBefore, expires, _, _) =>
            {
                var now = time.GetUtcNow().UtcDateTime;
                return (notBefore is null || notBefore <= now) && expires > now;
            },
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddHealthChecks();
builder.Services.AddMtfRateLimiting(config);

var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader()));

// Render runs the API behind its proxy: read X-Forwarded-For so per-IP limits see the real client.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.WebHost.ConfigureKestrel(options =>
    options.Limits.MaxRequestBodySize = config.GetValue("RequestLimits:MaxBodyBytes", 64L * 1024));

var app = builder.Build();

// An empty database builds itself; a restored one skips what it has (ADR 0009, rule 3).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
// No database check: Render calls it all the time and must never keep Neon awake (ADR 0009, rule 4).
app.MapHealthChecks("/health").DisableRateLimiting();
app.MapControllers();
app.Run();

public partial class Program { }
