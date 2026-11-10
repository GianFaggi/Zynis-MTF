using System.Text;

namespace Mtf.Api.Services;

/// <summary>
/// At least 8 characters, at most 72 bytes: bcrypt silently ignores whatever comes after byte 72.
/// </summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;
    public const int MaxBytes = 72;

    public static bool IsValid(string password) =>
        password.Length >= MinLength && Encoding.UTF8.GetByteCount(password) <= MaxBytes;
}
