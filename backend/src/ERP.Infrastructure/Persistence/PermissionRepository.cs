using Dapper;
using ERP.Application.Abstractions;
using ERP.Infrastructure.Database;
using ERP.Application.Authorization;

namespace ERP.Infrastructure.Persistence;

// Resolve permissões exclusivamente pelos perfis; usuario_claims não participa como override nesta etapa.
public sealed class PermissionRepository(IMariaDbConnectionFactory connections) : IPermissionResolver
{
    // EXISTS evita materializar IDs CHAR(36) e consulta somente o código parametrizado solicitado pela policy.
    public async Task<bool> HasPermissionAsync(string userId, string permission, CancellationToken cancellationToken = default)
    {
        // Códigos fora do catálogo oficial falham fechados e jamais viram uma consulta permissiva ao banco.
        var definition = Permissions.All.SingleOrDefault(item => item.Code == permission);
        if (definition is null) return false;
        await using var connection = await connections.OpenConnectionAsync(cancellationToken);
        const string sql = """
            SELECT EXISTS(
                SELECT 1
                FROM usuario_perfis up
                INNER JOIN perfis p ON p.id_perfil=up.id_perfil
                INNER JOIN perfil_permissao pp ON pp.id_perfil=p.id_perfil
                INNER JOIN permissao pe ON pe.id_permissao=pp.id_permissao
                WHERE up.id_usuario=@UserId AND pe.modulo=@Module AND pe.nome=@Permission)
            """;
        return await connection.ExecuteScalarAsync<bool>(new CommandDefinition(
            sql, new { UserId = userId, definition.Module, Permission = permission }, cancellationToken: cancellationToken));
    }
}
