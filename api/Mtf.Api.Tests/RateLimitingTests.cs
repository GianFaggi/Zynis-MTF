using System.Net;
using System.Net.Http.Json;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>
/// accounts spec: "Abuse is rate limited". Low limits, and each test sends from an address of its own
/// (X-Forwarded-For, as behind Render's proxy), so tests never share a bucket.
/// </summary>
public class RateLimitingTests(RateLimitingTests.LowLimitsFactory factory) : IClassFixture<RateLimitingTests.LowLimitsFactory>
{
    private const int AuthLimit = 3;
    private const int SessionLimit = 4;
    private const int GlobalLimit = 20;

    public class LowLimitsFactory : ApiFactory
    {
        protected override IDictionary<string, string> Settings => new Dictionary<string, string>
        {
            ["RateLimiting:Auth:PermitLimit"] = AuthLimit.ToString(),
            ["RateLimiting:Session:PermitLimit"] = SessionLimit.ToString(),
            ["RateLimiting:Global:PermitLimit"] = GlobalLimit.ToString(),
        };
    }

    private HttpClient ClientFrom(string ip)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", ip);
        return client;
    }

    [Fact]
    public async Task Too_many_sign_ins_answer_429_with_a_code_and_a_wait()
    {
        var client = ClientFrom("203.0.113.1");
        for (var i = 0; i < AuthLimit; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.Login(Accounts.NewEmail())).StatusCode);

        var refused = await client.Login(Accounts.NewEmail());

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.Equal("too_many_requests", await refused.Code());
        Assert.True(refused.Headers.TryGetValues("Retry-After", out var retryAfter));
        Assert.True(int.Parse(Assert.Single(retryAfter)) > 0);
    }

    [Fact]
    public async Task A_blocked_sign_in_does_not_check_the_password()
    {
        var client = ClientFrom("203.0.113.2");
        for (var i = 0; i < AuthLimit; i++)
            await client.Login(Accounts.NewEmail());
        var before = factory.Passwords.Verifications;

        var refused = await client.Login(Accounts.NewEmail());

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.Equal(before, factory.Passwords.Verifications);
    }

    [Fact]
    public async Task Every_mail_endpoint_shares_the_auth_limit()
    {
        var client = ClientFrom("203.0.113.3");
        var email = Accounts.NewEmail();
        await client.PostAsJsonAsync("/api/auth/forgot-password", new { email, language = "es" });
        await client.PostAsJsonAsync("/api/auth/resend-verification", new { email, language = "es" });
        await client.Register(Accounts.NewEmail());

        var refused = await client.VerifyEmail("any-token");

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
    }

    [Fact]
    public async Task Renewals_have_a_limit_of_their_own()
    {
        var client = ClientFrom("203.0.113.4");
        for (var i = 0; i < SessionLimit; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.Refresh("unknown")).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.Refresh("unknown")).StatusCode);
        // The auth bucket is separate, so signing in still works from the same address.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.Login(Accounts.NewEmail())).StatusCode);
    }

    [Fact]
    public async Task Two_addresses_have_separate_buckets()
    {
        var first = ClientFrom("203.0.113.5");
        for (var i = 0; i < AuthLimit; i++)
            await first.Login(Accounts.NewEmail());
        Assert.Equal(HttpStatusCode.TooManyRequests, (await first.Login(Accounts.NewEmail())).StatusCode);

        var second = ClientFrom("203.0.113.6");

        Assert.Equal(HttpStatusCode.Unauthorized, (await second.Login(Accounts.NewEmail())).StatusCode);
    }

    [Fact]
    public async Task Health_is_never_limited()
    {
        var client = ClientFrom("203.0.113.7");

        for (var i = 0; i < GlobalLimit * 2; i++)
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
    }
}
