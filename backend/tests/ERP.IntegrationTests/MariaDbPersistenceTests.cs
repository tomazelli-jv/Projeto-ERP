using Dapper;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.IntegrationTests;

[Collection(DatabaseCollection.Name)]
public sealed class MariaDbPersistenceTests(DatabaseFixture database)
{
    [Fact]
    public async Task Runner_PreservesKnexLedger_RollsBack_Reapplies_AndSerializes()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        var runner = new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource));

        await runner.UpAsync();
        var initial = await runner.StatusAsync();
        Assert.Equal(MigrationCatalog.All.Select(item => item.Name), initial.Select(item => item.Name));
        Assert.All(initial, item => Assert.True(item.Applied));
        Assert.Equal(["001_empresa_loja.js", "002_usuarios_funcionarios.js", "003_perfis_permissoes.js", "004_perfil_permissao.js", "005_autenticacao.js"], initial.Select(item => item.Name));

        await using (var ledger = await dataSource.OpenConnectionAsync())
        {
            await ledger.ExecuteAsync("UPDATE knex_migrations SET batch=1 WHERE name='001_empresa_loja.js'");
            await ledger.ExecuteAsync("UPDATE knex_migrations SET batch=2 WHERE name='002_usuarios_funcionarios.js'");
            await ledger.ExecuteAsync("UPDATE knex_migrations SET batch=3 WHERE name='003_perfis_permissoes.js'");
            await ledger.ExecuteAsync("UPDATE knex_migrations SET batch=4 WHERE name='004_perfil_permissao.js'");
            await ledger.ExecuteAsync("UPDATE knex_migrations SET batch=5 WHERE name='005_autenticacao.js'");
        }

        await using (var validation = await dataSource.OpenConnectionAsync())
        {
            var tables = (await validation.QueryAsync<string>(
                "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name NOT IN ('knex_migrations','knex_migrations_lock') ORDER BY table_name")).ToArray();
            Assert.Equal(["empresa", "evento_seguranca", "funcionario", "funcionario_loja", "loja", "perfil_permissao", "perfis", "permissao", "sessao_usuario", "tentativa_login", "token_refresh", "usuario_claims", "usuario_perfis", "usuarios"], tables);

            var empresaId = Guid.NewGuid().ToString();
            await validation.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Id,'Empresa Teste')", new { Id = empresaId });
            await validation.ExecuteAsync(
                "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,cep,uf) VALUES (@Id,@EmpresaId,'Loja Teste Ltda','Loja Teste','12345678000190','12345678','SP')",
                new { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId });

            Assert.Equal(1, await validation.ExecuteScalarAsync<int>("SELECT ativo FROM empresa WHERE id_empresa=@Id", new { Id = empresaId }));
            await Assert.ThrowsAsync<MySqlException>(() => validation.ExecuteAsync(
                "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento) VALUES (@Id,@EmpresaId,'Inválida','Inválida','123')",
                new { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId }));
            await Assert.ThrowsAsync<MySqlException>(() => validation.ExecuteAsync(
                "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,cep) VALUES (@Id,@EmpresaId,'Inválida','Inválida','12345678000191','12A45678')",
                new { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId }));
            await Assert.ThrowsAsync<MySqlException>(() => validation.ExecuteAsync(
                "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,uf) VALUES (@Id,@EmpresaId,'Inválida','Inválida','12345678000192','sp')",
                new { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId }));
            await Assert.ThrowsAsync<MySqlException>(() => validation.ExecuteAsync("DELETE FROM empresa WHERE id_empresa=@Id", new { Id = empresaId }));
        }

        Assert.Equal(1, await runner.DownAsync());
        var rolledBack = await runner.StatusAsync();
        Assert.True(rolledBack[0].Applied);
        Assert.True(rolledBack[1].Applied);
        Assert.True(rolledBack[2].Applied);
        Assert.True(rolledBack[3].Applied);
        Assert.False(rolledBack[4].Applied);
        await using (var preserved = await dataSource.OpenConnectionAsync())
        {
            Assert.True(await preserved.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM empresa") > 0);
            Assert.True(await preserved.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM loja") > 0);
            Assert.Equal(10, await preserved.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('empresa','loja','usuarios','funcionario','funcionario_loja','perfis','usuario_perfis','permissao','usuario_claims','perfil_permissao')"));
            Assert.Equal(0, await preserved.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('sessao_usuario','token_refresh','tentativa_login','evento_seguranca')"));
        }
        Assert.Equal(1, await runner.UpAsync());

        var concurrent = await Task.WhenAll(runner.UpAsync(), runner.UpAsync());
        Assert.Equal(0, concurrent.Sum());

        await using var connection = await dataSource.OpenConnectionAsync();
        var names = (await connection.QueryAsync<string>("SELECT name FROM knex_migrations ORDER BY id")).ToArray();
        Assert.Equal(MigrationCatalog.All.Select(item => item.Name), names);
        Assert.Equal(0, await connection.ExecuteScalarAsync<int>("SELECT is_locked FROM knex_migrations_lock WHERE `index`=1"));
    }

    [Fact]
    public async Task UsuariosFuncionarios_EnforceIdentityCompanyAndStoreIntegrity()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var connection = await dataSource.OpenConnectionAsync();

        var empresaId = Guid.NewGuid().ToString();
        var outraEmpresaId = Guid.NewGuid().ToString();
        var lojaId = Guid.NewGuid().ToString();
        var outraLojaId = Guid.NewGuid().ToString();
        var usuarioId = Guid.NewGuid().ToString();
        var funcionarioId = Guid.NewGuid().ToString();

        await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Id,'Empresa')", new { Id = empresaId });
        await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Id,'Outra Empresa')", new { Id = outraEmpresaId });
        await connection.ExecuteAsync(
            "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento) VALUES (@Id,@EmpresaId,'Loja Ltda','Loja','22345678000190')",
            new { Id = lojaId, EmpresaId = empresaId });
        await connection.ExecuteAsync(
            "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento) VALUES (@Id,@EmpresaId,'Outra Loja Ltda','Outra Loja','22345678000199')",
            new { Id = outraLojaId, EmpresaId = outraEmpresaId });
        await connection.ExecuteAsync(
            "INSERT INTO usuarios (id_usuario,user_name,password_hash,email) VALUES (@Id,'operador','hash-seguro','operador@example.test')",
            new { Id = usuarioId });
        await connection.ExecuteAsync(
            "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UsuarioId,@EmpresaId,'Funcionario')",
            new { Id = funcionarioId, UsuarioId = usuarioId, EmpresaId = empresaId });

        await connection.ExecuteAsync(
            "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,NULL,@EmpresaId,'Sem acesso')",
            new { Id = Guid.NewGuid().ToString(), EmpresaId = empresaId });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UsuarioId,@EmpresaId,'Duplicado')",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = usuarioId, EmpresaId = empresaId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UsuarioId,@EmpresaId,'Usuario inexistente')",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = Guid.NewGuid().ToString(), EmpresaId = empresaId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,NULL,@EmpresaId,'Empresa inexistente')",
            new { Id = Guid.NewGuid().ToString(), EmpresaId = Guid.NewGuid().ToString() }));

        await connection.ExecuteAsync(
            "INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Id,@FuncionarioId,@LojaId,@EmpresaId)",
            new { Id = Guid.NewGuid().ToString(), FuncionarioId = funcionarioId, LojaId = lojaId, EmpresaId = empresaId });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Id,@FuncionarioId,@LojaId,@EmpresaId)",
            new { Id = Guid.NewGuid().ToString(), FuncionarioId = funcionarioId, LojaId = lojaId, EmpresaId = empresaId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Id,@FuncionarioId,@LojaId,@EmpresaId)",
            new { Id = Guid.NewGuid().ToString(), FuncionarioId = funcionarioId, LojaId = outraLojaId, EmpresaId = empresaId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync("DELETE FROM usuarios WHERE id_usuario=@Id", new { Id = usuarioId }));
    }

    [Fact]
    public async Task PerfisPermissoesAndClaims_EnforceApprovedRelationshipsAndUniqueness()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var connection = await dataSource.OpenConnectionAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var usuarioId = Guid.NewGuid().ToString();
        var perfilId = Guid.NewGuid().ToString();
        await connection.ExecuteAsync(
            "INSERT INTO usuarios (id_usuario,user_name,password_hash,email) VALUES (@Id,@UserName,'hash-seguro',@Email)",
            new { Id = usuarioId, UserName = $"perfil-{suffix}", Email = $"perfil-{suffix}@example.test" });
        await connection.ExecuteAsync(
            "INSERT INTO perfis (id_perfil,nome,nome_normalizado,concorrencia_stamp) VALUES (@Id,'Administrador',@Normalizado,@Stamp)",
            new { Id = perfilId, Normalizado = $"ADMINISTRADOR-{suffix}", Stamp = Guid.NewGuid().ToString() });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO perfis (id_perfil,nome,nome_normalizado,concorrencia_stamp) VALUES (@Id,'Duplicado',@Normalizado,@Stamp)",
            new { Id = Guid.NewGuid().ToString(), Normalizado = $"ADMINISTRADOR-{suffix}", Stamp = Guid.NewGuid().ToString() }));

        await connection.ExecuteAsync(
            "INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UsuarioId,@PerfilId)",
            new { UsuarioId = usuarioId, PerfilId = perfilId });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UsuarioId,@PerfilId)",
            new { UsuarioId = usuarioId, PerfilId = perfilId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UsuarioId,@PerfilId)",
            new { UsuarioId = Guid.NewGuid().ToString(), PerfilId = perfilId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UsuarioId,@PerfilId)",
            new { UsuarioId = usuarioId, PerfilId = Guid.NewGuid().ToString() }));

        await connection.ExecuteAsync(
            "INSERT INTO permissao (id_permissao,nome,descricao,modulo) VALUES (@Id,'consultar','Consulta dados','cadastros')",
            new { Id = Guid.NewGuid().ToString() });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO permissao (id_permissao,nome,modulo) VALUES (@Id,'consultar','cadastros')",
            new { Id = Guid.NewGuid().ToString() }));

        await connection.ExecuteAsync(
            "INSERT INTO usuario_claims (id_claim,id_usuario,claim_type,claim_value) VALUES (@Id,@UsuarioId,'departamento','comercial')",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = usuarioId });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO usuario_claims (id_claim,id_usuario,claim_type,claim_value) VALUES (@Id,@UsuarioId,'departamento','comercial')",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = usuarioId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO usuario_claims (id_claim,id_usuario,claim_type,claim_value) VALUES (@Id,@UsuarioId,'departamento','comercial')",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = Guid.NewGuid().ToString() }));
    }

    [Fact]
    public async Task PerfilPermissao_EnforcesManyToManyIntegrity()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var connection = await dataSource.OpenConnectionAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var perfilId = Guid.NewGuid().ToString();
        var outroPerfilId = Guid.NewGuid().ToString();
        var permissaoId = Guid.NewGuid().ToString();
        var outraPermissaoId = Guid.NewGuid().ToString();
        await connection.ExecuteAsync(
            "INSERT INTO perfis (id_perfil,nome,nome_normalizado,concorrencia_stamp) VALUES (@Id,'Perfil',@Normalizado,@Stamp),(@OutroId,'Outro Perfil',@OutroNormalizado,@OutroStamp)",
            new { Id = perfilId, Normalizado = $"PERFIL-{suffix}", Stamp = Guid.NewGuid().ToString(), OutroId = outroPerfilId, OutroNormalizado = $"OUTRO-{suffix}", OutroStamp = Guid.NewGuid().ToString() });
        await connection.ExecuteAsync(
            "INSERT INTO permissao (id_permissao,nome,modulo) VALUES (@Id,'consultar',@Modulo),(@OutroId,'alterar',@Modulo)",
            new { Id = permissaoId, OutroId = outraPermissaoId, Modulo = $"modulo-{suffix}" });

        await connection.ExecuteAsync(
            "INSERT INTO perfil_permissao (id_perfil,id_permissao) VALUES (@PerfilId,@PermissaoId),(@PerfilId,@OutraPermissaoId),(@OutroPerfilId,@PermissaoId)",
            new { PerfilId = perfilId, PermissaoId = permissaoId, OutraPermissaoId = outraPermissaoId, OutroPerfilId = outroPerfilId });
        Assert.Equal(2, await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM perfil_permissao WHERE id_perfil=@Id", new { Id = perfilId }));
        Assert.Equal(2, await connection.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM perfil_permissao WHERE id_permissao=@Id", new { Id = permissaoId }));

        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO perfil_permissao (id_perfil,id_permissao) VALUES (@PerfilId,@PermissaoId)",
            new { PerfilId = perfilId, PermissaoId = permissaoId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO perfil_permissao (id_perfil,id_permissao) VALUES (@PerfilId,@PermissaoId)",
            new { PerfilId = Guid.NewGuid().ToString(), PermissaoId = permissaoId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO perfil_permissao (id_perfil,id_permissao) VALUES (@PerfilId,@PermissaoId)",
            new { PerfilId = perfilId, PermissaoId = Guid.NewGuid().ToString() }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "DELETE FROM perfis WHERE id_perfil=@Id", new { Id = perfilId }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "DELETE FROM permissao WHERE id_permissao=@Id", new { Id = permissaoId }));
    }

    [Fact]
    public async Task AutenticacaoSchema_EnforcesTokensEventsAndDeletionBehavior()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var connection = await dataSource.OpenConnectionAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var usuarioId = Guid.NewGuid().ToString();
        var sessaoId = Guid.NewGuid().ToString();
        var agora = DateTime.UtcNow;
        await connection.ExecuteAsync(
            "INSERT INTO usuarios (id_usuario,user_name,password_hash,email) VALUES (@Id,@UserName,'hash-seguro',@Email)",
            new { Id = usuarioId, UserName = $"auth-{suffix}", Email = $"auth-{suffix}@example.test" });
        await connection.ExecuteAsync(
            "INSERT INTO sessao_usuario (id_sessao,id_usuario,criada_em,ultimo_uso_em,expira_em,atualizada_em) VALUES (@Id,@UsuarioId,@Agora,@Agora,@Expira,@Agora)",
            new { Id = sessaoId, UsuarioId = usuarioId, Agora = agora, Expira = agora.AddDays(7) });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO sessao_usuario (id_sessao,id_usuario,criada_em,ultimo_uso_em,expira_em,atualizada_em) VALUES (@Id,@UsuarioId,@Agora,@Agora,@Expira,@Agora)",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = Guid.NewGuid().ToString(), Agora = agora, Expira = agora.AddDays(7) }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO sessao_usuario (id_sessao,id_usuario,criada_em,ultimo_uso_em,expira_em,atualizada_em) VALUES (@Id,@UsuarioId,@Agora,@Agora,@Expira,@Agora)",
            new { Id = Guid.NewGuid().ToString(), UsuarioId = usuarioId, Agora = agora, Expira = agora }));

        var tokenHash = new string('a', 64);
        var tokenAnteriorId = Guid.NewGuid().ToString();
        await connection.ExecuteAsync(
            "INSERT INTO token_refresh (id_token,id_sessao,token_hash,id_familia,id_token_anterior,criado_em,expira_em,atualizado_em) VALUES (@Id,@SessaoId,@Hash,@FamiliaId,@AnteriorId,@Agora,@Expira,@Agora)",
            new { Id = Guid.NewGuid().ToString(), SessaoId = sessaoId, Hash = tokenHash, FamiliaId = Guid.NewGuid().ToString(), AnteriorId = tokenAnteriorId, Agora = agora, Expira = agora.AddDays(7) });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO token_refresh (id_token,id_sessao,token_hash,id_familia,criado_em,expira_em,atualizado_em) VALUES (@Id,@SessaoId,@Hash,@FamiliaId,@Agora,@Expira,@Agora)",
            new { Id = Guid.NewGuid().ToString(), SessaoId = sessaoId, Hash = tokenHash, FamiliaId = Guid.NewGuid().ToString(), Agora = agora, Expira = agora.AddDays(7) }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO token_refresh (id_token,id_sessao,token_hash,id_familia,id_token_anterior,criado_em,expira_em,atualizado_em) VALUES (@Id,@SessaoId,@Hash,@FamiliaId,@AnteriorId,@Agora,@Expira,@Agora)",
            new { Id = Guid.NewGuid().ToString(), SessaoId = sessaoId, Hash = new string('b', 64), FamiliaId = Guid.NewGuid().ToString(), AnteriorId = tokenAnteriorId, Agora = agora, Expira = agora.AddDays(7) }));
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO token_refresh (id_token,id_sessao,token_hash,id_familia,criado_em,expira_em,atualizado_em) VALUES (@Id,@SessaoId,@Hash,@FamiliaId,@Agora,@Expira,@Agora)",
            new { Id = Guid.NewGuid().ToString(), SessaoId = Guid.NewGuid().ToString(), Hash = new string('c', 64), FamiliaId = Guid.NewGuid().ToString(), Agora = agora, Expira = agora.AddDays(7) }));

        await connection.ExecuteAsync(
            "INSERT INTO tentativa_login (id_tentativa,email_hash,id_usuario,sucesso,motivo,data_cadastro) VALUES (@Id,@Hash,NULL,0,'invalid_credentials',@Agora)",
            new { Id = Guid.NewGuid().ToString(), Hash = new string('d', 64), Agora = agora });
        var tentativaUsuarioId = Guid.NewGuid().ToString();
        await connection.ExecuteAsync(
            "INSERT INTO tentativa_login (id_tentativa,email_hash,id_usuario,sucesso,motivo,data_cadastro) VALUES (@Id,@Hash,@UsuarioId,1,'success',@Agora)",
            new { Id = tentativaUsuarioId, Hash = new string('e', 64), UsuarioId = usuarioId, Agora = agora });
        var eventoId = Guid.NewGuid().ToString();
        await connection.ExecuteAsync(
            "INSERT INTO evento_seguranca (id_evento,id_usuario,id_sessao,tipo_evento,resultado,data_cadastro) VALUES (@Id,@UsuarioId,@SessaoId,'login_succeeded','success',@Agora)",
            new { Id = eventoId, UsuarioId = usuarioId, SessaoId = sessaoId, Agora = agora });
        await Assert.ThrowsAsync<MySqlException>(() => connection.ExecuteAsync(
            "INSERT INTO evento_seguranca (id_evento,tipo_evento,resultado,data_cadastro) VALUES (@Id,'invalid','unknown',@Agora)",
            new { Id = Guid.NewGuid().ToString(), Agora = agora }));

        await connection.ExecuteAsync("DELETE FROM usuarios WHERE id_usuario=@Id", new { Id = usuarioId });
        Assert.Equal(0, await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM sessao_usuario WHERE id_sessao=@Id", new { Id = sessaoId }));
        Assert.Equal(0, await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM token_refresh WHERE token_hash=@Hash", new { Hash = tokenHash }));
        Assert.Null(await connection.ExecuteScalarAsync<string?>("SELECT id_usuario FROM tentativa_login WHERE id_tentativa=@Id", new { Id = tentativaUsuarioId }));
        Assert.Null(await connection.ExecuteScalarAsync<string?>("SELECT id_usuario FROM evento_seguranca WHERE id_evento=@Id", new { Id = eventoId }));
        Assert.Null(await connection.ExecuteScalarAsync<string?>("SELECT id_sessao FROM evento_seguranca WHERE id_evento=@Id", new { Id = eventoId }));
    }

    [Fact]
    public async Task Factory_OpensAndAsynchronouslyDisposesConnection()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        var factory = new MariaDbConnectionFactory(dataSource);
        var connection = await factory.OpenConnectionAsync();
        Assert.Equal(System.Data.ConnectionState.Open, connection.State);
        await connection.DisposeAsync();
        Assert.Equal(System.Data.ConnectionState.Closed, connection.State);
    }
}
