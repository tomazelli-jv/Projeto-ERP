using ERP.AdminCli;
using ERP.Application.Abstractions;
using ERP.Infrastructure.Security;
using Microsoft.Extensions.Options;

namespace ERP.UnitTests;

public sealed class CreateUserServiceTests
{
    [Fact]
    public async Task ValidData_IsNormalizedAndStoredWithArgon2idHash()
    {
        var repository = new RecordingRepository();
        var hasher = new Argon2idPasswordHasher(Options.Create(new PasswordSecurityOptions()));
        var service = new CreateUserService(repository, hasher);
        const string password = "uma frase senha segura";

        var result = await service.CreateAsync(new("  primeiro.usuario  ", " USER@Example.COM ", password, password));

        Assert.Equal("user@example.com", result.Email);
        Assert.NotNull(repository.User);
        Assert.Equal("primeiro.usuario", repository.User.UserName);
        Assert.Equal("user@example.com", repository.User.Email);
        Assert.StartsWith("$argon2id$", repository.User.PasswordHash);
        Assert.DoesNotContain(password, repository.User.PasswordHash, StringComparison.Ordinal);
        Assert.True(await hasher.VerifyAsync(repository.User.PasswordHash, password));
    }

    [Fact]
    public async Task InvalidPassword_IsRejectedBeforePersistence()
    {
        var repository = new RecordingRepository();
        var service = new CreateUserService(repository, new StubHasher());
        await Assert.ThrowsAsync<CreateUserValidationException>(() =>
            service.CreateAsync(new("usuario", "user@example.com", "curta", "curta")));
        Assert.Null(repository.User);
    }

    [Fact]
    public async Task EmptyUserName_IsRejectedBeforePersistence()
    {
        var repository = new RecordingRepository();
        var service = new CreateUserService(repository, new StubHasher());
        await Assert.ThrowsAsync<CreateUserValidationException>(() =>
            service.CreateAsync(new("  ", "user@example.com", "uma frase senha segura", "uma frase senha segura")));
        Assert.Null(repository.User);
    }

    [Fact]
    public async Task DifferentConfirmation_IsRejectedBeforePersistence()
    {
        var repository = new RecordingRepository();
        var service = new CreateUserService(repository, new StubHasher());
        await Assert.ThrowsAsync<CreateUserValidationException>(() =>
            service.CreateAsync(new("usuario", "user@example.com", "uma frase senha segura", "outra frase senha")));
        Assert.Null(repository.User);
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("a@@example.com")]
    public async Task InvalidEmail_IsRejectedBeforePersistence(string email)
    {
        var repository = new RecordingRepository();
        var service = new CreateUserService(repository, new StubHasher());
        await Assert.ThrowsAsync<CreateUserValidationException>(() =>
            service.CreateAsync(new("usuario", email, "uma frase senha segura", "uma frase senha segura")));
        Assert.Null(repository.User);
    }

    [Theory]
    [InlineData(CreateUserConflict.Email)]
    [InlineData(CreateUserConflict.UserName)]
    public async Task DuplicateIdentity_IsReportedWithoutDatabaseDetails(CreateUserConflict conflict)
    {
        var repository = new RecordingRepository { Conflict = conflict };
        var service = new CreateUserService(repository, new StubHasher());
        var exception = await Assert.ThrowsAsync<CreateUserConflictException>(() =>
            service.CreateAsync(new("usuario", "user@example.com", "uma frase senha segura", "uma frase senha segura")));
        Assert.DoesNotContain("SQL", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class RecordingRepository : IUserBootstrapRepository
    {
        public CreateUserConflict Conflict { get; init; }
        public UserBootstrapRecord? User { get; private set; }
        public Task<CreateUserConflict> CreateAsync(UserBootstrapRecord user, CancellationToken cancellationToken = default)
        {
            User = user;
            return Task.FromResult(Conflict);
        }
    }

    private sealed class StubHasher : IPasswordHasher
    {
        public Task<string> HashAsync(string password, CancellationToken cancellationToken = default) => Task.FromResult("$argon2id$test");
        public Task<bool> VerifyAsync(string encodedHash, string password, CancellationToken cancellationToken = default) => Task.FromResult(true);
    }
}
