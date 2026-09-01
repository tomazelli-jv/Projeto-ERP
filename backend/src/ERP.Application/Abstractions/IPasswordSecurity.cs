namespace ERP.Application.Abstractions;

public interface IPasswordHasher
{
    Task<string> HashAsync(string password, CancellationToken cancellationToken = default);
    Task<bool> VerifyAsync(string encodedHash, string password, CancellationToken cancellationToken = default);
}
