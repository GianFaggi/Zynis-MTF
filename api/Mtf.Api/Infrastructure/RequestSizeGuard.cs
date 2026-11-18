using Microsoft.AspNetCore.Http.Metadata;

namespace Mtf.Api.Infrastructure;

/// <summary>
/// Refuses a body larger than its endpoint allows (64 KB, or a sync push's 1 MB) from its declared length,
/// before anything reads it, with 413 <c>request_too_large</c>. Kestrel's own limit stays for bodies sent
/// with no length; this guard also holds where Kestrel is not in front, such as the test server.
/// </summary>
public static class RequestSizeGuard
{
    public static IApplicationBuilder UseRequestSizeGuard(this IApplicationBuilder app, long defaultLimit)
        => app.Use(async (context, next) =>
        {
            var limit = context.GetEndpoint()?.Metadata.GetMetadata<IRequestSizeLimitMetadata>()?.MaxRequestBodySize
                ?? defaultLimit;
            if (context.Request.ContentLength > limit)
            {
                context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
                await context.Response.WriteAsJsonAsync(
                    ApiExceptionHandler.Problem(StatusCodes.Status413PayloadTooLarge, ErrorCodes.RequestTooLarge));
                return;
            }
            await next();
        });
}
