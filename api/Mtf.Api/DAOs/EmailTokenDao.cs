using Microsoft.EntityFrameworkCore;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Data;
using Mtf.Api.Models;

namespace Mtf.Api.DAOs;

public class EmailTokenDao(AppDbContext db) : IEmailTokenDao
{
    public Task<EmailToken?> GetAsync(Guid userId, EmailTokenPurpose purpose, CancellationToken ct)
        => db.EmailTokens.AsNoTracking().FirstOrDefaultAsync(t => t.UserId == userId && t.Purpose == purpose, ct);

    public async Task ReplaceAsync(Guid userId, EmailTokenPurpose purpose, string tokenHash,
        DateTimeOffset issuedAt, DateTimeOffset expiresAt, CancellationToken ct)
    {
        var token = await db.EmailTokens.FirstOrDefaultAsync(t => t.UserId == userId && t.Purpose == purpose, ct);
        if (token is null)
        {
            db.EmailTokens.Add(new EmailToken
            {
                UserId = userId,
                Purpose = purpose,
                TokenHash = tokenHash,
                ExpiresAt = expiresAt,
            });
        }
        else
        {
            token.TokenHash = tokenHash;
            token.ExpiresAt = expiresAt;
            // A new token, so a new created_at: it is what the 60-second wait counts from.
            token.CreatedAt = issuedAt;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<Guid?> ConsumeAsync(string tokenHash, EmailTokenPurpose purpose, DateTimeOffset now,
        CancellationToken ct)
    {
        var token = await db.EmailTokens.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.Purpose == purpose && t.ExpiresAt > now, ct);
        if (token is null)
            return null;

        var deleted = await db.EmailTokens.Where(t => t.Id == token.Id).ExecuteDeleteAsync(ct);
        return deleted == 1 ? token.UserId : null;
    }
}
