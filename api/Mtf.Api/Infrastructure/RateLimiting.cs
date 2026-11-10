using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace Mtf.Api.Infrastructure;

/// <summary>
/// Per-client-IP limits (design decision 7). A refused request answers 429 before reaching any
/// controller, so a blocked sign-in never checks a password. /health opts out.
/// </summary>
public static class RateLimiting
{
    public const string Auth = "auth";
    public const string Session = "session";

    public static IServiceCollection AddMtfRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        // Auth is 10, not Zynis Cal's 5: Cal's hosting notes warn 5 refuses real users behind
        // Argentine mobile CGNAT, where many phones share one address.
        var global = Limit(config, "Global", 60);
        var auth = Limit(config, "Auth", 10);
        var session = Limit(config, "Session", 30);

        return services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter($"global:{ClientIp(context)}", _ => global));
            options.AddPolicy(Auth, context =>
                RateLimitPartition.GetFixedWindowLimiter($"auth:{ClientIp(context)}", _ => auth));
            options.AddPolicy(Session, context =>
                RateLimitPartition.GetFixedWindowLimiter($"session:{ClientIp(context)}", _ => session));

            options.OnRejected = async (context, ct) =>
            {
                var response = context.HttpContext.Response;
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds))
                        .ToString(CultureInfo.InvariantCulture);
                response.StatusCode = StatusCodes.Status429TooManyRequests;
                await response.WriteAsJsonAsync(
                    ApiExceptionHandler.Problem(StatusCodes.Status429TooManyRequests, ErrorCodes.TooManyRequests), ct);
            };
        });
    }

    private static FixedWindowRateLimiterOptions Limit(IConfiguration config, string name, int defaultPermits) => new()
    {
        PermitLimit = config.GetValue($"RateLimiting:{name}:PermitLimit", defaultPermits),
        Window = TimeSpan.FromSeconds(config.GetValue($"RateLimiting:{name}:WindowSeconds", 60)),
    };

    // After UseForwardedHeaders, this is the client from X-Forwarded-For, not Render's proxy.
    private static string ClientIp(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
