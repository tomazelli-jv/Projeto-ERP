namespace ERP.Application.Abstractions;

public interface IPasswordHasher
{
    Task<string> HashAsync(string password, CancellationToken cancellationToken = default);
    Task<bool> VerifyAsync(string encodedHash, string password, CancellationToken cancellationToken = default);
}

public interface IPasswordSetupNotifier
{
    Task DeliverAsync(PasswordSetupNotification notification, CancellationToken cancellationToken = default);
}

public sealed record PasswordSetupNotification(string Recipient, string Token, DateTime ExpiresAtUtc);
