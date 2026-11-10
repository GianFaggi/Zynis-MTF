using System.Net;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>
/// ADR 0009, rule 4: Render calls /health all the time, so it must never touch the database.
/// Has a container of its own, because it stops it.
/// </summary>
public class HealthEndpointTests : IAsyncLifetime
{
    private readonly ApiFactory _factory = new();

    public Task InitializeAsync() => _factory.InitializeAsync();

    public Task DisposeAsync() => _factory.DisposeAsync();

    [Fact]
    public async Task Health_answers_without_querying_the_database()
    {
        var client = _factory.CreateClient();
        var before = _factory.Queries.Count;

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(before, _factory.Queries.Count);
    }

    [Fact]
    public async Task Health_answers_with_the_database_stopped()
    {
        var client = _factory.CreateClient();
        await _factory.Database.StopAsync();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
