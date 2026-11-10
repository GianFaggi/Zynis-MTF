using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>Only the configured origin may call the API from a browser, /health included.</summary>
[Collection(ApiCollection.Name)]
public class CorsTests(ApiFactory factory)
{
    private const string OtherOrigin = "https://evil.example.com";

    [Theory]
    [InlineData("/health")]
    [InlineData("/api/auth/login")]
    public async Task The_allowed_origin_gets_its_header(string path)
    {
        var response = await Preflight(path, ApiFactory.AllowedOrigin);

        Assert.True(response.Headers.TryGetValues("Access-Control-Allow-Origin", out var values));
        Assert.Equal(ApiFactory.AllowedOrigin, Assert.Single(values));
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/api/auth/login")]
    public async Task Any_other_origin_gets_no_header(string path)
    {
        var response = await Preflight(path, OtherOrigin);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task A_simple_request_from_another_origin_is_not_allowed()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", OtherOrigin);

        var response = await factory.CreateClient().SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    private Task<HttpResponseMessage> Preflight(string path, string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, path);
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        request.Headers.Add("Access-Control-Request-Headers", "content-type");
        return factory.CreateClient().SendAsync(request);
    }
}
