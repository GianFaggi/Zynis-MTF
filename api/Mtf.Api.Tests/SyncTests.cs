using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Mtf.Api.DTOs;
using Mtf.Api.Tests.Infrastructure;

namespace Mtf.Api.Tests;

/// <summary>sync spec, the server's side: opaque records, newest change wins, pull by cursor (design D1–D3, D15).</summary>
[Collection(ApiCollection.Name)]
public class SyncTests(ApiFactory factory)
{
    private readonly HttpClient _client = factory.CreateClient();

    /// <summary>The device's clock, in step with the server's in these tests.</summary>
    private long Now() => factory.Clock.GetUtcNow().ToUnixTimeMilliseconds();

    private async Task<(string Email, string Token)> Account()
    {
        var email = Accounts.NewEmail();
        return (email, (await factory.SignedInUser(email)).AccessToken);
    }

    /// <summary>A fresh access token, for after the clock moved past the 15 minutes.</summary>
    private async Task<string> SignInAgain(string email)
    {
        var response = await _client.Login(email);
        return (await response.Content.ReadFromJsonAsync<TokensResponse>())!.AccessToken;
    }

    private Task<int> StoredCount(string email)
        => factory.Db(db => db.Records.CountAsync(r => db.Users.Any(u => u.Id == r.UserId && u.Email == email)));

    private Task<List<long>> StoredSeqs(string email)
        => factory.Db(db => db.Records
            .Where(r => db.Users.Any(u => u.Id == r.UserId && u.Email == email))
            .OrderBy(r => r.Seq).Select(r => r.Seq).ToListAsync());

    [Fact]
    public async Task No_token_or_an_expired_one_is_refused_and_nothing_is_written()
    {
        var (email, token) = await Account();
        var card = Sync.Card(Guid.NewGuid(), Now());

        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.Push(null, card)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PullResponse(null)).StatusCode);

        factory.Clock.Advance(TimeSpan.FromMinutes(16));
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.Push(token, card)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.PullResponse(token)).StatusCode);

        Assert.Equal(0, await StoredCount(email));
    }

    [Fact]
    public async Task A_pushed_record_comes_back_as_it_was_sent()
    {
        var (_, token) = await Account();
        var id = Guid.NewGuid();
        var at = Now();
        // A field the server has never heard of travels untouched (opaque records).
        var data = JsonSerializer.SerializeToElement(new { id, title = "Comprar pan", futureField = new[] { 1, 2 } });

        Assert.Equal(HttpStatusCode.OK, (await _client.Push(token, new SyncRecord("card", id, at, false, data))).StatusCode);
        var pulled = Assert.Single((await _client.Pull(token)).Records);

        Assert.Equal(("card", id, at, false), (pulled.Kind, pulled.Id, pulled.UpdatedAt, pulled.Deleted));
        Assert.Equal(data.GetRawText().Replace(" ", ""), pulled.Data!.Value.GetRawText().Replace(" ", ""));
    }

    [Fact]
    public async Task Two_Accounts_with_the_same_Card_id_never_see_each_others()
    {
        var (_, first) = await Account();
        var (_, second) = await Account();
        var id = Guid.NewGuid();

        await _client.Push(first, Sync.Card(id, Now(), "De la primera"));
        await _client.Push(second, Sync.Card(id, Now() - 1000, "De la segunda"));

        Assert.Equal("De la primera", Assert.Single((await _client.Pull(first)).Records).Title());
        Assert.Equal("De la segunda", Assert.Single((await _client.Pull(second)).Records).Title());
    }

    [Fact]
    public async Task The_same_batch_twice_changes_nothing()
    {
        var (email, token) = await Account();
        var batch = new[] { Sync.Card(Guid.NewGuid(), Now()), Sync.Card(Guid.NewGuid(), Now()) };

        await _client.Push(token, batch);
        var before = await StoredSeqs(email);
        Assert.Equal(HttpStatusCode.OK, (await _client.Push(token, batch)).StatusCode);

        Assert.Equal(before, await StoredSeqs(email));
    }

    [Fact]
    public async Task An_older_change_leaves_the_newer_copy()
    {
        var (_, token) = await Account();
        var id = Guid.NewGuid();
        var at = Now();

        await _client.Push(token, Sync.Card(id, at, "Del PC, más nueva"));
        await _client.Push(token, Sync.Card(id, at - 60_000, "Del teléfono, más vieja"));

        var pulled = Assert.Single((await _client.Pull(token)).Records);
        Assert.Equal(("Del PC, más nueva", at), (pulled.Title(), pulled.UpdatedAt));
    }

    [Fact]
    public async Task A_newer_change_replaces_the_record_and_moves_it_to_the_end()
    {
        var (_, token) = await Account();
        var (a, b) = (Guid.NewGuid(), Guid.NewGuid());
        await _client.Push(token, Sync.Card(a, Now()), Sync.Card(b, Now()));
        var cursor = (await _client.Pull(token)).Next;

        await _client.Push(token, Sync.Card(a, Now() + 1000, "Editada"));
        var pulled = await _client.Pull(token, cursor);

        Assert.Equal("Editada", Assert.Single(pulled.Records).Title());
        Assert.True(pulled.Next > cursor);
    }

    [Fact]
    public async Task A_pull_returns_only_what_is_after_the_cursor_in_order_and_in_pages()
    {
        var (_, token) = await Account();
        var ids = Enumerable.Range(0, 5).Select(_ => Guid.NewGuid()).ToList();
        foreach (var id in ids)
            await _client.Push(token, Sync.Card(id, Now()));
        var afterTwo = (await _client.Pull(token, limit: 2)).Next;

        var page = await _client.Pull(token, afterTwo, limit: 2);
        Assert.Equal(ids[2..4], page.Records.Select(r => r.Id));
        Assert.True(page.More);

        var last = await _client.Pull(token, page.Next, limit: 2);
        Assert.Equal(ids[4..], last.Records.Select(r => r.Id));
        Assert.False(last.More);

        var nothing = await _client.Pull(token, last.Next);
        Assert.Empty(nothing.Records);
        Assert.Equal(last.Next, nothing.Next);
    }

    [Fact]
    public async Task A_deletion_comes_back_marked_deleted_with_no_data()
    {
        var (_, token) = await Account();
        var id = Guid.NewGuid();
        await _client.Push(token, Sync.Card(id, Now()));

        await _client.Push(token, Sync.Deleted("card", id, Now() + 1000));

        var pulled = Assert.Single((await _client.Pull(token)).Records);
        Assert.True(pulled.Deleted);
        Assert.Null(pulled.Data);
    }

    [Fact]
    public async Task A_later_edit_brings_a_deleted_record_back()
    {
        var (_, token) = await Account();
        var id = Guid.NewGuid();
        await _client.Push(token, Sync.Deleted("card", id, Now()));

        await _client.Push(token, Sync.Card(id, Now() + 1000, "Editada después"));

        var pulled = Assert.Single((await _client.Pull(token)).Records);
        Assert.Equal((false, "Editada después"), (pulled.Deleted, pulled.Title()));
    }

    [Fact]
    public async Task A_deletion_is_kept_with_its_data_for_30_days_and_then_purged()
    {
        var (email, token) = await Account();
        var id = Guid.NewGuid();
        await _client.Push(token, Sync.Card(id, Now(), "La que se borra"));
        await _client.Push(token, Sync.Deleted("card", id, Now() + 1000));
        var oldCursor = (await _client.Pull(token)).Next;
        // Another device keeps syncing, so the cursor of the one that stays away falls behind.
        await _client.Push(token, Sync.Card(Guid.NewGuid(), Now()));

        factory.Clock.Advance(TimeSpan.FromDays(10));
        token = await SignInAgain(email);
        await _client.Push(token, Sync.Card(Guid.NewGuid(), Now()));
        var kept = await factory.Db(db => db.Records.AsNoTracking().SingleAsync(r => r.Id == id));
        Assert.NotNull(kept.DeletedAt);
        Assert.Contains("La que se borra", kept.Data);

        factory.Clock.Advance(TimeSpan.FromDays(21));
        token = await SignInAgain(email);
        await _client.Push(token, Sync.Card(Guid.NewGuid(), Now()));
        Assert.False(await factory.Db(db => db.Records.AnyAsync(r => r.Id == id)));

        var expired = await _client.PullResponse(token, oldCursor - 1);
        Assert.Equal(HttpStatusCode.Gone, expired.StatusCode);
        Assert.Equal("cursor_expired", await expired.Code());
        Assert.Equal(3, (await _client.Pull(token, 0)).Records.Count);
    }

    [Fact]
    public async Task Two_pushes_at_once_never_let_a_pull_skip_a_change()
    {
        var (_, token) = await Account();
        var first = Enumerable.Range(0, 150).Select(_ => Sync.Card(Guid.NewGuid(), Now())).ToArray();
        var second = Enumerable.Range(0, 150).Select(_ => Sync.Card(Guid.NewGuid(), Now())).ToArray();
        var seen = new HashSet<Guid>();
        long cursor = 0;

        var pushes = Task.WhenAll(_client.Push(token, first), _client.Push(token, second));
        while (!pushes.IsCompleted)
        {
            var page = await _client.Pull(token, cursor);
            seen.UnionWith(page.Records.Select(r => r.Id));
            cursor = page.Next;
        }
        Assert.All(await pushes, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));
        PullResponse last;
        do
        {
            last = await _client.Pull(token, cursor);
            seen.UnionWith(last.Records.Select(r => r.Id));
            cursor = last.Next;
        } while (last.More);

        Assert.Equal(first.Concat(second).Select(r => r.Id).ToHashSet(), seen);
    }

    [Fact]
    public async Task A_cursor_the_server_never_gave_is_expired_on_an_empty_Account()
    {
        var (_, token) = await Account();

        var response = await _client.PullResponse(token, after: 42);

        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        Assert.Equal("cursor_expired", await response.Code());
        Assert.Equal(HttpStatusCode.OK, (await _client.PullResponse(token, after: 0)).StatusCode);
    }

    [Fact]
    public async Task A_server_that_lost_its_records_tells_the_device_to_start_over()
    {
        var (email, token) = await Account();
        await _client.Push(token, Sync.Card(Guid.NewGuid(), Now()), Sync.Card(Guid.NewGuid(), Now()));
        var cursor = (await _client.Pull(token)).Next;

        await factory.Db(db => db.Records
            .Where(r => db.Users.Any(u => u.Id == r.UserId && u.Email == email))
            .ExecuteDeleteAsync());

        var response = await _client.PullResponse(token, cursor);
        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        Assert.Equal("cursor_expired", await response.Code());
    }

    public static TheoryData<string> BadEnvelopes => new()
    {
        """{"records":[{"kind":"note","id":"7f0c1a52-8f3e-4a8c-9d47-0b5a2c1e3f60","updatedAt":1,"deleted":false,"data":{}}]}""",
        """{"records":[{"kind":"card","id":"not-a-uuid","updatedAt":1,"deleted":false,"data":{}}]}""",
        """{"records":[{"kind":"card","id":"7f0c1a52-8f3e-4a8c-9d47-0b5a2c1e3f60","updatedAt":0,"deleted":false,"data":{}}]}""",
        """{"records":[{"kind":"card","id":"7f0c1a52-8f3e-4a8c-9d47-0b5a2c1e3f60","updatedAt":1,"deleted":false,"data":"text"}]}""",
        """{"records":[{"kind":"card","id":"7f0c1a52-8f3e-4a8c-9d47-0b5a2c1e3f60","updatedAt":1,"deleted":false}]}""",
        """{}""",
    };

    [Theory]
    [MemberData(nameof(BadEnvelopes))]
    public async Task A_bad_envelope_is_refused_and_nothing_is_written(string body)
    {
        var (email, token) = await Account();

        var response = await _client.Push(token, new StringContent(body, System.Text.Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_request", await response.Code());
        Assert.Equal(0, await StoredCount(email));
    }

    [Fact]
    public async Task A_whole_Desk_of_900_KB_is_accepted()
    {
        var (email, token) = await Account();
        var text = new string('a', 3000);
        var records = Enumerable.Range(0, 300).Select(_ => Sync.Card(Guid.NewGuid(), Now(), text)).ToArray();
        var body = JsonContent.Create(new { records });
        await body.LoadIntoBufferAsync();
        Assert.InRange(body.Headers.ContentLength!.Value, 880_000, 1_000_000);

        Assert.Equal(HttpStatusCode.OK, (await _client.Push(token, body)).StatusCode);
        Assert.Equal(300, await StoredCount(email));
    }

    [Fact]
    public async Task A_push_over_1_MB_is_refused_with_a_code_and_writes_nothing()
    {
        var (email, token) = await Account();
        var text = new string('a', 3000);
        var records = Enumerable.Range(0, 370).Select(_ => Sync.Card(Guid.NewGuid(), Now(), text)).ToArray();
        var body = JsonContent.Create(new { records });
        await body.LoadIntoBufferAsync();
        Assert.InRange(body.Headers.ContentLength!.Value, 1_100_000, 1_200_000);

        var response = await _client.Push(token, body);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        Assert.Equal("request_too_large", await response.Code());
        Assert.Equal(0, await StoredCount(email));
    }

    [Fact]
    public async Task Other_endpoints_keep_the_64_KB_limit()
    {
        var body = JsonContent.Create(new { email = Accounts.NewEmail(), password = new string('a', 70 * 1024) });

        var response = await _client.PostAsync("/api/auth/login", body);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        Assert.Equal("request_too_large", await response.Code());
    }
}
