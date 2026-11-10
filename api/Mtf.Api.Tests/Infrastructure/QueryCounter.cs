using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>Counts every command EF sends to the database.</summary>
public class QueryCounter : DbCommandInterceptor
{
    private int _count;

    public int Count => _count;

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
        CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken ct = default)
    {
        Interlocked.Increment(ref _count);
        return base.ReaderExecutingAsync(command, eventData, result, ct);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command,
        CommandEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        Interlocked.Increment(ref _count);
        return base.NonQueryExecutingAsync(command, eventData, result, ct);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(DbCommand command,
        CommandEventData eventData, InterceptionResult<object> result, CancellationToken ct = default)
    {
        Interlocked.Increment(ref _count);
        return base.ScalarExecutingAsync(command, eventData, result, ct);
    }
}
