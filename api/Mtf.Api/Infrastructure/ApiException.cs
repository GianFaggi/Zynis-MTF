namespace Mtf.Api.Infrastructure;

/// <summary>
/// An expected refusal: an HTTP status plus a stable code the app translates (design decision 10).
/// </summary>
public class ApiException(int status, string code) : Exception(code)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}
