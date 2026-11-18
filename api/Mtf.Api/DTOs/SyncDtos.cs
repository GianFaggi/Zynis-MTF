using System.Text.Json;

namespace Mtf.Api.DTOs;

/// <summary>
/// One Area, Card or Win as it travels (sync, design D2/D3). <c>UpdatedAt</c> is epoch milliseconds set
/// by the device; <c>Data</c> is the entity, never read by the server, and absent on a deletion.
/// </summary>
public record SyncRecord(string Kind, Guid Id, long UpdatedAt, bool Deleted, JsonElement? Data);

// Requests.
public record PushRequest(List<SyncRecord> Records);

// Answers.
public record PushResponse;
public record PullResponse(IReadOnlyList<SyncRecord> Records, long Next, bool More);
