using Microsoft.EntityFrameworkCore;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Data;
using Mtf.Api.Models;

namespace Mtf.Api.DAOs;

public class SessionDao(AppDbContext db) : ISessionDao
{
    public async Task CreateAsync(Session session, CancellationToken ct)
    {
        db.Sessions.Add(session);
        await db.SaveChangesAsync(ct);
    }

    public Task<Session?> FindByTokenHashAsync(string tokenHash, CancellationToken ct)
        => db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.TokenHash == tokenHash, ct);

    public Task<Session?> FindByPreviousTokenHashAsync(string tokenHash, CancellationToken ct)
        => db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.PreviousTokenHash == tokenHash, ct);

    public async Task<bool> TryRotateAsync(Guid id, string expectedTokenHash, string newTokenHash,
        DateTimeOffset rotatedAt, DateTimeOffset expiresAt, CancellationToken ct)
    {
        var rows = await db.Sessions
            .Where(s => s.Id == id && s.TokenHash == expectedTokenHash)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.PreviousTokenHash, expectedTokenHash)
                .SetProperty(x => x.TokenHash, newTokenHash)
                .SetProperty(x => x.RotatedAt, rotatedAt)
                .SetProperty(x => x.ExpiresAt, expiresAt)
                .SetProperty(x => x.UpdatedAt, rotatedAt), ct);
        return rows == 1;
    }

    public Task DeleteAsync(Guid id, CancellationToken ct)
        => db.Sessions.Where(s => s.Id == id).ExecuteDeleteAsync(ct);

    public Task DeleteByTokenHashAsync(string tokenHash, CancellationToken ct)
        => db.Sessions.Where(s => s.TokenHash == tokenHash || s.PreviousTokenHash == tokenHash).ExecuteDeleteAsync(ct);

    public Task DeleteAllForUserAsync(Guid userId, CancellationToken ct)
        => db.Sessions.Where(s => s.UserId == userId).ExecuteDeleteAsync(ct);

    public Task DeleteExpiredForUserAsync(Guid userId, DateTimeOffset now, CancellationToken ct)
        => db.Sessions.Where(s => s.UserId == userId && s.ExpiresAt <= now).ExecuteDeleteAsync(ct);
}
