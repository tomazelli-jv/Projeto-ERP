using ERP.Application.Abstractions;
using ERP.Domain.Errors;
using ERP.Infrastructure.Persistence;
using ERP.Infrastructure.Security;
using MySqlConnector;

namespace ERP.Infrastructure.Application;

public sealed record PasswordSetupIssuance(string UserId, string Email, string Token, DateTime ExpiresAtUtc);

public sealed class PasswordSetupWorkflow(
    PasswordSetupRepository repository,
    IPasswordHasher passwordHasher,
    IPasswordSetupNotifier notifier)
{
    public async Task<PasswordSetupIssuance?> IssueAsync(MySqlConnection connection, MySqlTransaction transaction, UserRecord user, DateTime now, CancellationToken token)
    {
        if (await repository.FindCredentialIdByUserIdAsync(connection, transaction, user.Id, token) is not null) return null;
        var rawToken = PasswordSetupTokenGenerator.Generate();
        await repository.RevokeActiveTokensAsync(connection, transaction, user.Id, "initial_password", now, token);
        await repository.CreateTokenAsync(connection, transaction,
            new PasswordSetupTokenWrite(Guid.NewGuid().ToString(), user.Id, PasswordSetupTokenGenerator.Hash(rawToken), "initial_password", now.AddHours(24), now), token);
        return new(user.Id, user.Email, rawToken, now.AddHours(24));
    }

    public Task DeliverAsync(PasswordSetupIssuance? issuance, CancellationToken token) => issuance is null
        ? Task.CompletedTask
        : notifier.DeliverAsync(new PasswordSetupNotification(issuance.Email, issuance.Token, issuance.ExpiresAtUtc), token);

    public async Task ConfirmAsync(MySqlConnection connection, MySqlTransaction transaction, string rawToken, string password, DateTime now, CancellationToken cancellationToken)
    {
        var token = await repository.FindTokenByHashForUpdateAsync(connection, transaction, PasswordSetupTokenGenerator.Hash(rawToken), cancellationToken);
        AssertUsable(token, now);
        _ = await repository.FindUserByIdForUpdateAsync(connection, transaction, token!.UserId, cancellationToken)
            ?? throw InvalidToken();
        if (await repository.FindCredentialIdByUserIdAsync(connection, transaction, token.UserId, cancellationToken) is not null)
            throw Error("PASSWORD_ALREADY_DEFINED", "A senha deste usuário já foi definida.", 409);
        var hash = await passwordHasher.HashAsync(password, cancellationToken);
        await repository.CreateCredentialAsync(connection, transaction, new CredentialWrite(Guid.NewGuid().ToString(), token.UserId, hash, now), cancellationToken);
        if (await repository.MarkTokenUsedAsync(connection, transaction, token.Id, now, cancellationToken) != 1)
            throw Error("PASSWORD_SETUP_TOKEN_CONSUMPTION_FAILED", "Não foi possível consumir o token.", 409);
        await repository.RevokeActiveTokensAsync(connection, transaction, token.UserId, "initial_password", now, cancellationToken);
    }

    private static void AssertUsable(PasswordSetupTokenRecord? token, DateTime now)
    {
        if (token is null) throw InvalidToken();
        if (token.Purpose != "initial_password") throw Error("PASSWORD_SETUP_TOKEN_PURPOSE_INVALID", "A finalidade do token é inválida.", 422);
        if (token.UsedAt is not null) throw Error("PASSWORD_SETUP_TOKEN_ALREADY_USED", "O token de definição de senha já foi utilizado.", 422);
        if (token.RevokedAt is not null) throw Error("PASSWORD_SETUP_TOKEN_REVOKED", "O token de definição de senha foi revogado.", 422);
        if (token.ExpiresAt <= now) throw Error("PASSWORD_SETUP_TOKEN_EXPIRED", "O token de definição de senha expirou.", 422);
    }
    private static DomainException InvalidToken() => Error("PASSWORD_SETUP_TOKEN_INVALID", "Não foi possível validar o link de definição de senha.", 422);
    private static DomainException Error(string code, string message, int status) => new(code, message, status);
}
