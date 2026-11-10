using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Mtf.Api.Models;

namespace Mtf.Api.Data;

public partial class AppDbContext(DbContextOptions<AppDbContext> options, TimeProvider time) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<EmailToken> EmailTokens => Set<EmailToken>();
    public DbSet<GoogleHandoff> GoogleHandoffs => Set<GoogleHandoff>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.GoogleId).IsUnique();
            entity.Property(u => u.Email).HasMaxLength(320);
            entity.Property(u => u.GoogleId).HasMaxLength(255);
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasIndex(s => s.TokenHash).IsUnique();
            entity.HasIndex(s => s.PreviousTokenHash);
            entity.HasOne<User>().WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailToken>(entity =>
        {
            entity.HasIndex(t => t.TokenHash).IsUnique();
            entity.HasIndex(t => new { t.UserId, t.Purpose }).IsUnique();
            entity.Property(t => t.Purpose).HasConversion<string>().HasMaxLength(10);
            entity.HasOne<User>().WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GoogleHandoff>(entity =>
        {
            entity.HasIndex(h => h.SecretHash).IsUnique();
            entity.Property(h => h.Language).HasMaxLength(5);
            entity.HasOne<User>().WithMany().HasForeignKey(h => h.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        UseSnakeCaseNames(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = time.GetUtcNow();
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = entry.Entity.UpdatedAt = now;
            else if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }

    // `users.password_hash` instead of `Users.PasswordHash`, without another package.
    private static void UseSnakeCaseNames(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            entity.SetTableName(SnakeCase(entity.ClrType.Name) + "s");
            foreach (var property in entity.GetProperties())
                property.SetColumnName(SnakeCase(property.Name));
            foreach (var key in entity.GetKeys())
                key.SetName(SnakeCase(key.GetName()!));
            foreach (var foreignKey in entity.GetForeignKeys())
                foreignKey.SetConstraintName(SnakeCase(foreignKey.GetConstraintName()!));
            foreach (var index in entity.GetIndexes())
                index.SetDatabaseName(SnakeCase(index.GetDatabaseName()!));
        }
    }

    private static string SnakeCase(string name) => UpperCase().Replace(name, "$1_$2").ToLowerInvariant();

    [GeneratedRegex("([a-z0-9])([A-Z])")]
    private static partial Regex UpperCase();
}
