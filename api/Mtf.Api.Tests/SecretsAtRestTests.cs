using System.Net.Http.Json;
using Mtf.Api.Tests.Infrastructure;
using Npgsql;

namespace Mtf.Api.Tests;

/// <summary>
/// accounts spec: "Secrets are not stored readable". Reads every row as text, straight from Postgres,
/// so a copy of the database could not sign anyone in.
/// </summary>
[Collection(ApiCollection.Name)]
public class SecretsAtRestTests(ApiFactory factory)
{
    [Fact]
    public async Task No_table_holds_a_password_or_a_token_in_readable_form()
    {
        var client = factory.CreateClient();
        var email = Accounts.NewEmail();
        var session = await factory.SignedInUser(email);
        await client.PostAsJsonAsync("/api/auth/forgot-password", new { email, language = "es" });
        var recoveryToken = factory.Mail.LatestToken(email);

        var rows = await AllRowsAsText();

        Assert.NotEmpty(rows);
        foreach (var row in rows)
        {
            Assert.DoesNotContain(Accounts.Password, row);
            Assert.DoesNotContain(session.RefreshToken, row);
            Assert.DoesNotContain(recoveryToken, row);
        }
        Assert.Contains(rows, row => row.Contains(email));
    }

    private async Task<List<string>> AllRowsAsText()
    {
        var rows = new List<string>();
        await using var connection = new NpgsqlConnection(factory.ConnectionString);
        await connection.OpenAsync();
        foreach (var table in new[] { "users", "sessions", "email_tokens", "google_handoffs" })
        {
            await using var command = new NpgsqlCommand($"SELECT row_to_json(t)::text FROM {table} t", connection);
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                rows.Add(reader.GetString(0));
        }
        return rows;
    }
}
