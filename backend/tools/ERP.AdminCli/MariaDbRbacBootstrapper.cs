using Dapper;
using ERP.Application.Authorization;
using MySqlConnector;

namespace ERP.AdminCli;

// Compartilha o catálogo idempotente entre bootstrap-company e ensure-rbac dentro da transação de cada comando.
public static class MariaDbRbacBootstrapper
{
    // Garante perfil, seis permissões, vínculos do perfil e vínculo do usuário sem apagar ou renumerar dados existentes.
    public static async Task EnsureAdministratorAsync(
        MySqlConnection connection,
        MySqlTransaction transaction,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var profileCandidateId = Guid.NewGuid().ToString();
        // ON DUPLICATE preserva o UUID e os dados do Administrador já presentes na instalação.
        await connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO perfis (id_perfil,nome,nome_normalizado,concorrencia_stamp) VALUES (@Id,@Name,@Normalized,@Stamp) ON DUPLICATE KEY UPDATE id_perfil=id_perfil",
            new { Id = profileCandidateId, Name = InitialProfiles.AdministratorName, Normalized = InitialProfiles.AdministratorNormalizedName, Stamp = Guid.NewGuid().ToString() },
            transaction, cancellationToken: cancellationToken));
        var profileId = await connection.QuerySingleAsync<string>(new CommandDefinition(
            "SELECT CAST(id_perfil AS CHAR(36)) FROM perfis WHERE nome_normalizado=@Normalized FOR UPDATE",
            new { Normalized = InitialProfiles.AdministratorNormalizedName }, transaction, cancellationToken: cancellationToken));

        foreach (var permission in Permissions.All)
        {
            var permissionCandidateId = Guid.NewGuid().ToString();
            // A chave módulo/nome torna a inserção repetível sem modificar IDs ou permissões desconhecidas.
            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO permissao (id_permissao,nome,descricao,modulo) VALUES (@Id,@Code,@Description,@Module) ON DUPLICATE KEY UPDATE id_permissao=id_permissao",
                new { Id = permissionCandidateId, permission.Code, permission.Description, permission.Module },
                transaction, cancellationToken: cancellationToken));
            var permissionId = await connection.QuerySingleAsync<string>(new CommandDefinition(
                "SELECT CAST(id_permissao AS CHAR(36)) FROM permissao WHERE modulo=@Module AND nome=@Code FOR UPDATE",
                new { permission.Module, permission.Code }, transaction, cancellationToken: cancellationToken));
            // A PK composta completa somente vínculos ausentes e nunca remove concessões existentes.
            await connection.ExecuteAsync(new CommandDefinition(
                "INSERT INTO perfil_permissao (id_perfil,id_permissao) VALUES (@ProfileId,@PermissionId) ON DUPLICATE KEY UPDATE id_perfil=id_perfil",
                new { ProfileId = profileId, PermissionId = permissionId }, transaction, cancellationToken: cancellationToken));
        }

        // A PK composta torna a associação do usuário ao Administrador segura para reexecuções.
        await connection.ExecuteAsync(new CommandDefinition(
            "INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UserId,@ProfileId) ON DUPLICATE KEY UPDATE id_usuario=id_usuario",
            new { UserId = userId, ProfileId = profileId }, transaction, cancellationToken: cancellationToken));
    }
}
