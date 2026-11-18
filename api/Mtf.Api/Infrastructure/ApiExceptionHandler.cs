using System.Diagnostics;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Mtf.Api.Infrastructure;

/// <summary>
/// Turns every exception into ProblemDetails with a <c>code</c>. An unexpected one answers 500
/// with no internal detail; the exception goes to the log with the same trace id.
/// </summary>
public class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        var (status, code) = exception switch
        {
            ApiException api => (api.Status, api.Code),
            // A body over the endpoint's limit (64 KB, or 1 MB for a sync push): refused while reading,
            // before anything is written.
            BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge } =>
                (StatusCodes.Status413PayloadTooLarge, ErrorCodes.RequestTooLarge),
            _ => (StatusCodes.Status500InternalServerError, ErrorCodes.ServerError),
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Unhandled exception. TraceId: {TraceId}", traceId);

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(Problem(status, code, traceId), ct);
        return true;
    }

    public static ProblemDetails Problem(int status, string code, string? traceId = null)
    {
        var problem = new ProblemDetails { Status = status, Title = code };
        problem.Extensions["code"] = code;
        if (traceId is not null)
            problem.Extensions["traceId"] = traceId;
        return problem;
    }
}
