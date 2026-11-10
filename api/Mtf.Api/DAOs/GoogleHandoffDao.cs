using Microsoft.EntityFrameworkCore;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Data;
using Mtf.Api.Models;

namespace Mtf.Api.DAOs;

public class GoogleHandoffDao(AppDbContext db) : IGoogleHandoffDao
{
    public async Task CreateAsync(GoogleHandoff handoff, CancellationToken ct)
    {
        db.GoogleHandoffs.Add(handoff);
        await db.SaveChangesAsync(ct);
    }

    public Task<GoogleHandoff?> FindBySecretHashAsync(string secretHash, CancellationToken ct)
        => db.GoogleHandoffs.AsNoTracking().FirstOrDefaultAsync(h => h.SecretHash == secretHash, ct);

    public async Task UpdateAsync(GoogleHandoff handoff, CancellationToken ct)
    {
        db.GoogleHandoffs.Update(handoff);
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> ConsumeAsync(Guid id, CancellationToken ct)
        => await db.GoogleHandoffs.Where(h => h.Id == id).ExecuteDeleteAsync(ct) == 1;

    public Task DeleteExpiredAsync(DateTimeOffset now, CancellationToken ct)
        => db.GoogleHandoffs.Where(h => h.ExpiresAt <= now).ExecuteDeleteAsync(ct);
}
