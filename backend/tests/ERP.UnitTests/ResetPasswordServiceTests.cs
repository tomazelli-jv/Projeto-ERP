using ERP.AdminCli;
using ERP.Application.Abstractions;

namespace ERP.UnitTests;

public sealed class ResetPasswordServiceTests
{
    [Fact]
    public async Task ResetsPasswordWithNormalizedEmailAndGeneratedHash()
    {
        var repository = new PasswordRepositoryStub(true);
        var service = new ResetPasswordService(repository, new PasswordHasherStub());

        var email = await service.ResetAsync(new(" User@Example.com ", "uma senha longa", "uma senha longa"));

        Assert.Equal("user@example.com", email);
        Assert.Equal("user@example.com", repository.Email);
        Assert.Equal("generated-hash", repository.PasswordHash);
    }

    [Theory]
    [InlineData("invalid", "uma senha longa", "uma senha longa")]
    [InlineData("user@example.com", "curta", "curta")]
    [InlineData("user@example.com", "uma senha longa", "outra senha longa")]
    public async Task RejectsInvalidInput(string email, string password, string confirmation)
    {
        var service = new ResetPasswordService(new PasswordRepositoryStub(true), new PasswordHasherStub());

        await Assert.ThrowsAsync<ResetPasswordValidationException>(() => service.ResetAsync(new(email, password, confirmation)));
    }

    [Fact]
    public async Task ReportsUnknownUser()
    {
        var service = new ResetPasswordService(new PasswordRepositoryStub(false), new PasswordHasherStub());

        await Assert.ThrowsAsync<ResetPasswordUserNotFoundException>(() =>
            service.ResetAsync(new("user@example.com", "uma senha longa", "uma senha longa")));
    }

    private sealed class PasswordRepositoryStub(bool updated) : IUserPasswordRepository
    {
        public string? Email { get; private set; }
        public string? PasswordHash { get; private set; }

        public Task<bool> UpdatePasswordAsync(string email, string passwordHash, CancellationToken cancellationToken = default)
        {
            Email = email;
            PasswordHash = passwordHash;
            return Task.FromResult(updated);
        }
    }

    private sealed class PasswordHasherStub : IPasswordHasher
    {
        public Task<string> HashAsync(string password, CancellationToken cancellationToken = default) => Task.FromResult("generated-hash");
        public Task<bool> VerifyAsync(string encodedHash, string password, CancellationToken cancellationToken = default) => Task.FromResult(false);
    }
}
