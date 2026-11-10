using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Mtf.Api.Data;
using Mtf.Api.DTOs;
using Mtf.Api.Models;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>Steps many tests share, so each test reads as its scenario.</summary>
public static class Accounts
{
    public const string Password = "correct horse battery";

    /// <summary>An address no other test uses, since the endpoint tests share one database.</summary>
    public static string NewEmail() => $"user-{Guid.NewGuid():N}@example.com";

    public static Task<HttpResponseMessage> Register(this HttpClient client, string email,
        string password = Password, string language = "es")
        => client.PostAsJsonAsync("/api/auth/register", new { email, password, language });

    public static Task<HttpResponseMessage> Login(this HttpClient client, string email, string password = Password)
        => client.PostAsJsonAsync("/api/auth/login", new { email, password });

    public static Task<HttpResponseMessage> VerifyEmail(this HttpClient client, string token)
        => client.PostAsJsonAsync("/api/auth/verify-email", new { token });

    public static Task<HttpResponseMessage> Refresh(this HttpClient client, string refreshToken)
        => client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken });

    /// <summary>Registers, follows the verification link and signs in.</summary>
    public static async Task<TokensResponse> SignedInUser(this ApiFactory factory, string email)
    {
        var client = factory.CreateClient();
        await client.VerifiedUser(factory, email);
        var response = await client.Login(email);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<TokensResponse>())!;
    }

    public static async Task VerifiedUser(this HttpClient client, ApiFactory factory, string email)
    {
        Assert.Equal(HttpStatusCode.NoContent, (await client.Register(email)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.VerifyEmail(factory.Mail.LatestToken(email))).StatusCode);
    }

    public static async Task<string?> Code(this HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.TryGetProperty("code", out var code) ? code.GetString() : null;
    }

    public static async Task<T> Db<T>(this ApiFactory factory, Func<AppDbContext, Task<T>> query)
    {
        using var scope = factory.Services.CreateScope();
        return await query(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public static Task<User?> UserByEmail(this ApiFactory factory, string email)
        => factory.Db(db => db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email));

    public static Task<User> AddUser(this ApiFactory factory, User user)
        => factory.Db(async db =>
        {
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return user;
        });
}
