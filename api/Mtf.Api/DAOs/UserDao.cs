using Microsoft.EntityFrameworkCore;
using Mtf.Api.DAOs.Interfaces;
using Mtf.Api.Data;
using Mtf.Api.Models;

namespace Mtf.Api.DAOs;

public class UserDao(AppDbContext db) : IUserDao
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct)
        => db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct)
        => db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<User?> GetByGoogleIdAsync(string googleId, CancellationToken ct)
        => db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.GoogleId == googleId, ct);

    public async Task<User> CreateAsync(User user, CancellationToken ct)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return user;
    }

    public async Task UpdateAsync(User user, CancellationToken ct)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync(ct);
    }
}
