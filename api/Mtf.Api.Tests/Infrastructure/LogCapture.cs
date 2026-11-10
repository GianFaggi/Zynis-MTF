using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Mtf.Api.Tests.Infrastructure;

/// <summary>Keeps every log line written by the app, so tests can check what reaches the log.</summary>
public class LogCapture : ILoggerProvider
{
    private readonly ConcurrentQueue<string> _lines = new();

    public IReadOnlyList<string> Lines => [.. _lines];

    public ILogger CreateLogger(string categoryName) => new Logger(_lines);

    public void Dispose() { }

    private sealed class Logger(ConcurrentQueue<string> lines) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            lines.Enqueue(formatter(state, exception) + (exception is null ? "" : " " + exception));
    }
}
