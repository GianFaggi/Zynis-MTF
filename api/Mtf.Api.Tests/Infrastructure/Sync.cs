using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Mtf.Api.DTOs;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>Sync steps the sync tests share: records as the app sends them, push and pull with a token.</summary>
public static class Sync
{
    public static SyncRecord Card(Guid id, long updatedAt, string title = "Una tarjeta")
        => new("card", id, updatedAt, false, JsonSerializer.SerializeToElement(new { id, title, items = Array.Empty<object>() }));

    public static SyncRecord Deleted(string kind, Guid id, long updatedAt) => new(kind, id, updatedAt, true, null);

    public static Task<HttpResponseMessage> Push(this HttpClient client, string? accessToken, params SyncRecord[] records)
        => client.Push(accessToken, JsonContent.Create(new { records }));

    public static Task<HttpResponseMessage> Push(this HttpClient client, string? accessToken, HttpContent body)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/sync/push") { Content = body };
        if (accessToken is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client.SendAsync(request);
    }

    public static Task<HttpResponseMessage> PullResponse(this HttpClient client, string? accessToken, long after = 0,
        int? limit = null)
    {
        var url = $"/api/sync/pull?after={after}" + (limit is null ? "" : $"&limit={limit}");
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (accessToken is not null)
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client.SendAsync(request);
    }

    public static async Task<PullResponse> Pull(this HttpClient client, string accessToken, long after = 0, int? limit = null)
    {
        var response = await client.PullResponse(accessToken, after, limit);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PullResponse>())!;
    }

    public static string? Title(this SyncRecord record)
        => record.Data?.GetProperty("title").GetString();
}
