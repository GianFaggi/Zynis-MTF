using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mtf.Api.Data;

/// <summary>
/// Lets `dotnet ef` build the model without starting the app. The connection is the local
/// docker-compose database; `dotnet ef database update` is never needed, the app migrates at start-up.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Port=5432;Database=mtf;Username=mtf;Password=mtf")
            .Options;

        return new AppDbContext(options, TimeProvider.System);
    }
}
