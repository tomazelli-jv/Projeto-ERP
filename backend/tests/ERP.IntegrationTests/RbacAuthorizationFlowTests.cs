using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Dapper;
using ERP.AdminCli;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Application.Authorization;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Valida a ordem segurança HTTP: autenticação, permissão e, somente depois, escopo empresarial existente.
[Collection(DatabaseCollection.Name)]
public sealed class RbacAuthorizationFlowTests(DatabaseFixture database)
{
    [Fact]
    public async Task AuthenticatedUserWithoutProfile_IsForbidden()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        var identity = await CreateUserAsync(dataSource, factory);
        var token = await LoginAsync(factory, identity.Email, identity.Password);

        using var client = factory.CreateClient();
        using var response = await SendAsync(client, HttpMethod.Get, "/api/v1/empresas", null, token);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ReadOnlyProfile_CanReadButCannotManageCompanyOrStores()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        var identity = await CreateUserAsync(dataSource, factory);
        await new EnsureRbacService(new MariaDbConnectionFactory(dataSource)).EnsureAsync(identity.Email);
        var empresaId = Guid.NewGuid().ToString();
        var funcionarioId = Guid.NewGuid().ToString();
        var lojaId = Guid.NewGuid().ToString();
        var profileId = Guid.NewGuid().ToString();

        await using (var connection = await dataSource.OpenConnectionAsync())
        {
            // Remove somente o vínculo Administrador do usuário de teste e monta perfil sem permissões de escrita.
            await connection.ExecuteAsync("DELETE FROM usuario_perfis WHERE id_usuario=@UserId", new { identity.UserId });
            await connection.ExecuteAsync(
                "INSERT INTO perfis (id_perfil,nome,nome_normalizado,concorrencia_stamp) VALUES (@Id,'Somente leitura',@Normalized,@Stamp)",
                new { Id = profileId, Normalized = $"LEITURA_{Guid.NewGuid():N}", Stamp = Guid.NewGuid().ToString() });
            await connection.ExecuteAsync("INSERT INTO usuario_perfis (id_usuario,id_perfil) VALUES (@UserId,@ProfileId)", new { identity.UserId, ProfileId = profileId });
            await connection.ExecuteAsync(
                "INSERT INTO perfil_permissao (id_perfil,id_permissao) SELECT @ProfileId,id_permissao FROM permissao WHERE nome IN (@CompanyRead,@StoreRead)",
                new { ProfileId = profileId, CompanyRead = Permissions.AdministracaoEmpresaVisualizar, StoreRead = Permissions.AdministracaoLojasVisualizar });
            await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Id,'Empresa RBAC')", new { Id = empresaId });
            await connection.ExecuteAsync("INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@EmpresaId,'Leitor')", new { Id = funcionarioId, identity.UserId, EmpresaId = empresaId });
            await connection.ExecuteAsync("INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,uf) VALUES (@Id,@EmpresaId,'Loja RBAC Ltda','Loja RBAC',@Document,'SP')", new { Id = lojaId, EmpresaId = empresaId, Document = Random.Shared.NextInt64(10000000000000, 99999999999999).ToString() });
            await connection.ExecuteAsync("INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Id,@FuncionarioId,@LojaId,@EmpresaId)", new { Id = Guid.NewGuid().ToString(), FuncionarioId = funcionarioId, LojaId = lojaId, EmpresaId = empresaId });
        }

        var token = await LoginAsync(factory, identity.Email, identity.Password);
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(client, HttpMethod.Get, "/api/v1/empresas", null, token)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(client, HttpMethod.Get, $"/api/v1/empresas/{empresaId}/lojas", null, token)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await SendAsync(client, HttpMethod.Put, $"/api/v1/empresas/{empresaId}", new { nome = "Bloqueada", ativo = true }, token)).StatusCode);
        var storeBody = new { razaoSocial = "Nova Loja Ltda", nomeFantasia = "Nova Loja", documento = Random.Shared.NextInt64(10000000000000, 99999999999999).ToString(), telefone = (string?)null, email = (string?)null, cep = (string?)null, rua = (string?)null, numero = (string?)null, complemento = (string?)null, bairro = (string?)null, cidade = (string?)null, uf = "SP", ativo = true };
        Assert.Equal(HttpStatusCode.Forbidden, (await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{empresaId}/lojas", storeBody, token)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await SendAsync(client, HttpMethod.Put, $"/api/v1/lojas/{lojaId}", storeBody, token)).StatusCode);
    }

    // Cria credencial real sem perfil para que cada teste controle explicitamente suas concessões.
    private static async Task<TestIdentity> CreateUserAsync(MySqlDataSource dataSource, ApiFactory factory)
    {
        var id = Guid.NewGuid().ToString();
        var email = $"rbac-{Guid.NewGuid():N}@example.test";
        const string password = "uma frase senha para rbac";
        var hash = await factory.Services.GetRequiredService<IPasswordHasher>().HashAsync(password);
        await using var connection = await dataSource.OpenConnectionAsync();
        await connection.ExecuteAsync("INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@Name,@Hash,@Email,1)", new { Id = id, Name = $"rbac.{Guid.NewGuid():N}", Hash = hash, Email = email });
        return new(id, email, password);
    }

    // Login permanece inalterado e apenas fornece a sessão real usada pelas policies server-side.
    private static async Task<string> LoginAsync(ApiFactory factory, string email, string password) =>
        (await factory.Services.GetRequiredService<AuthenticationService>().LoginAsync(
            new LoginRequest { Email = email, Password = password }, null, "rbac-test", CancellationToken.None)).AccessToken;

    // Helper envia Bearer sem inserir permissões no token, preservando o requisito de decisão dinâmica no banco.
    private static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object? body, string token)
    {
        var request = new HttpRequestMessage(method, path) { Content = body is null ? null : JsonContent.Create(body) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client.SendAsync(request);
    }

    private sealed record TestIdentity(string UserId, string Email, string Password);
}
