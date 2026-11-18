using System.Net;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>backend-service spec: "Sync requests have their own limits" — the sync policy, 30 a minute per address.</summary>
public class SyncRateLimitTests(SyncRateLimitTests.SyncLimitFactory factory) : IClassFixture<SyncRateLimitTests.SyncLimitFactory>
{
    public const int SyncLimit = 30;

    /// <summary>The production sync limit, with the global one out of the way so only the sync policy can refuse.</summary>
    public class SyncLimitFactory : ApiFactory
    {
        protected override IDictionary<string, string> Settings => new Dictionary<string, string>
        {
            ["RateLimiting:Sync:PermitLimit"] = SyncLimit.ToString(),
        };
    }

    [Fact]
    public async Task The_31st_sync_request_in_a_minute_answers_429_and_sign_in_still_works()
    {
        var email = Accounts.NewEmail();
        var token = (await factory.SignedInUser(email)).AccessToken;
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("CF-Connecting-IP", "203.0.113.30");

        for (var i = 0; i < SyncLimit; i++)
        {
            var response = i % 2 == 0
                ? await client.PullResponse(token)
                : await client.Push(token, Sync.Card(Guid.NewGuid(), factory.Clock.GetUtcNow().ToUnixTimeMilliseconds()));
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        var refused = await client.PullResponse(token);
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.Equal("too_many_requests", await refused.Code());
        // Sign-in has its own bucket.
        Assert.Equal(HttpStatusCode.OK, (await client.Login(email)).StatusCode);
    }
}
