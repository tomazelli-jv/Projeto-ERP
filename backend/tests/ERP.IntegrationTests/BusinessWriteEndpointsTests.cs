using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using Dapper;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Exercita as escritas públicas contra MariaDB e verifica escopo, atomicidade, validação e erros previsíveis.
[Collection(DatabaseCollection.Name)]
public sealed class BusinessWriteEndpointsTests(DatabaseFixture database)
{
    // Nenhuma operação de escrita pode alcançar service ou banco sem um access token válido.
    [Fact]
    public async Task WriteRoutes_RequireAuthentication()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        var empresaId = Guid.NewGuid();
        var lojaId = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PutAsJsonAsync($"/api/v1/empresas/{empresaId}", EmpresaPayload("Empresa", true))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync($"/api/v1/empresas/{empresaId}/lojas", LojaPayload(Document(), "SP", true))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PutAsJsonAsync($"/api/v1/lojas/{lojaId}", LojaPayload(Document(), "SP", true))).StatusCode);
    }

    // Usuário ativo sem funcionário permanece autenticável, mas recebe o erro empresarial 403 nas escritas.
    [Fact]
    public async Task UserWithoutFuncionario_CannotWriteBusinessData()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        var identity = await CreateUserAsync(dataSource, factory, "sem contexto de escrita");
        var accessToken = await LoginAsync(factory, identity.Email, identity.Password);
        using var client = factory.CreateClient();

        using var updateEmpresa = await SendAsync(client, HttpMethod.Put, $"/api/v1/empresas/{Guid.NewGuid()}", EmpresaPayload("Empresa", true), accessToken);
        Assert.Equal(HttpStatusCode.Forbidden, updateEmpresa.StatusCode);
        Assert.Contains("BUSINESS_CONTEXT_REQUIRED", await updateEmpresa.Content.ReadAsStringAsync());
        using var createLoja = await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{Guid.NewGuid()}/lojas", LojaPayload(Document(), "SP", true), accessToken);
        Assert.Equal(HttpStatusCode.Forbidden, createLoja.StatusCode);
        Assert.Contains("BUSINESS_CONTEXT_REQUIRED", await createLoja.Content.ReadAsStringAsync());
    }

    // O endpoint de empresa não cria dados enquanto não existir uma autoridade global confiável no modelo.
    [Fact]
    public async Task CreateEmpresa_IsExplicitlyForbiddenWithoutGlobalAuthority()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        var setup = await CreateBusinessContextAsync(dataSource, factory);
        using var client = factory.CreateClient();
        using var response = await SendAsync(client, HttpMethod.Post, "/api/v1/empresas", EmpresaPayload("Nova Empresa", true), setup.AccessToken);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("EMPRESA_CREATION_FORBIDDEN", await response.Content.ReadAsStringAsync());
    }

    // Cenário completo comprova escrita própria, bloqueio entre empresas, vínculo atômico e persistência real.
    [Fact]
    public async Task EmpresaAndLojaWrites_AreValidatedScopedAndPersisted()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        var setup = await CreateBusinessContextAsync(dataSource, factory);
        using var client = factory.CreateClient();

        // PUT empresa aceita apenas a empresa própria e persiste nome aparado e estado inativo.
        using var updateEmpresa = await SendAsync(client, HttpMethod.Put, $"/api/v1/empresas/{setup.EmpresaId}", EmpresaPayload("  Empresa Atualizada  ", false), setup.AccessToken);
        Assert.Equal(HttpStatusCode.OK, updateEmpresa.StatusCode);
        await using (var verification = await dataSource.OpenConnectionAsync())
        {
            var persisted = await verification.QuerySingleAsync<(string Nome, bool Ativo)>(
                "SELECT nome Nome,ativo Ativo FROM empresa WHERE id_empresa=@Id", new { Id = setup.EmpresaId });
            Assert.Equal("Empresa Atualizada", persisted.Nome);
            Assert.False(persisted.Ativo);
        }
        using var foreignEmpresa = await SendAsync(client, HttpMethod.Put, $"/api/v1/empresas/{setup.OutraEmpresaId}", EmpresaPayload("Ataque", true), setup.AccessToken);
        Assert.Equal(HttpStatusCode.NotFound, foreignEmpresa.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Put, $"/api/v1/empresas/{setup.EmpresaId}", EmpresaPayload("   ", true), setup.AccessToken)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Put, $"/api/v1/empresas/{setup.EmpresaId}", EmpresaPayload(new string('x', 161), true), setup.AccessToken)).StatusCode);

        // POST loja cria loja e funcionario_loja juntos; a representação criada já fica visível no GET.
        var createdDocument = Document();
        using var createLoja = await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{setup.EmpresaId}/lojas", LojaPayload(createdDocument, "SP", true), setup.AccessToken);
        Assert.Equal(HttpStatusCode.Created, createLoja.StatusCode);
        using var createdJson = JsonDocument.Parse(await createLoja.Content.ReadAsStringAsync());
        var createdId = createdJson.RootElement.GetProperty("data").GetProperty("id").GetString()!;
        Assert.Equal("SP", createdJson.RootElement.GetProperty("data").GetProperty("uf").GetString());
        await using (var verification = await dataSource.OpenConnectionAsync())
        {
            Assert.Equal(1, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM loja WHERE id_loja=@Id AND id_empresa=@EmpresaId", new { Id = createdId, setup.EmpresaId }));
            Assert.Equal(1, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM funcionario_loja WHERE id_funcionario=@FuncionarioId AND id_loja=@LojaId AND id_empresa=@EmpresaId", new { setup.FuncionarioId, LojaId = createdId, setup.EmpresaId }));
        }
        using var list = await SendAsync(client, HttpMethod.Get, $"/api/v1/empresas/{setup.EmpresaId}/lojas", null, setup.AccessToken);
        Assert.Contains(createdId, await list.Content.ReadAsStringAsync());

        // Empresa alheia e formatos inválidos são rejeitados antes de qualquer criação parcial.
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{setup.OutraEmpresaId}/lojas", LojaPayload(Document(), "SP", true), setup.AccessToken)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{setup.EmpresaId}/lojas", LojaPayload("123", "SP", true), setup.AccessToken)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{setup.EmpresaId}/lojas", LojaPayload(Document(), "SP", true, cep: "12A45678"), setup.AccessToken)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{setup.EmpresaId}/lojas", LojaPayload(Document(), "sp", true), setup.AccessToken)).StatusCode);

        // Documento duplicado vira 409 e não cria novo vínculo nem registro de loja.
        int linksBefore;
        await using (var verification = await dataSource.OpenConnectionAsync())
            linksBefore = await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM funcionario_loja WHERE id_funcionario=@Id", new { Id = setup.FuncionarioId });
        using var duplicateCreate = await SendAsync(client, HttpMethod.Post, $"/api/v1/empresas/{setup.EmpresaId}/lojas", LojaPayload(createdDocument, "TO", true), setup.AccessToken);
        Assert.Equal(HttpStatusCode.Conflict, duplicateCreate.StatusCode);
        Assert.Contains("LOJA_DOCUMENTO_ALREADY_EXISTS", await duplicateCreate.Content.ReadAsStringAsync());
        await using (var verification = await dataSource.OpenConnectionAsync())
        {
            Assert.Equal(1, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM loja WHERE documento=@Document", new { Document = createdDocument }));
            Assert.Equal(linksBefore, await verification.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM funcionario_loja WHERE id_funcionario=@Id", new { Id = setup.FuncionarioId }));
        }

        // PUT loja persiste campos permitidos, inclusive inativação, sem aceitar lojas não vinculadas ou externas.
        var updatedDocument = Document();
        using var updateLoja = await SendAsync(client, HttpMethod.Put, $"/api/v1/lojas/{createdId}", LojaPayload(updatedDocument, "TO", false, nomeFantasia: "Loja Atualizada"), setup.AccessToken);
        Assert.Equal(HttpStatusCode.OK, updateLoja.StatusCode);
        await using (var verification = await dataSource.OpenConnectionAsync())
        {
            var persisted = await verification.QuerySingleAsync<(string NomeFantasia, string Documento, bool Ativo)>(
                "SELECT nome_fantasia NomeFantasia,documento Documento,ativo Ativo FROM loja WHERE id_loja=@Id", new { Id = createdId });
            Assert.Equal("Loja Atualizada", persisted.NomeFantasia);
            Assert.Equal(updatedDocument, persisted.Documento);
            Assert.False(persisted.Ativo);
        }
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(client, HttpMethod.Put, $"/api/v1/lojas/{setup.LojaSemVinculoId}", LojaPayload(Document(), "SP", true), setup.AccessToken)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await SendAsync(client, HttpMethod.Put, $"/api/v1/lojas/{setup.LojaOutraEmpresaId}", LojaPayload(Document(), "SP", true), setup.AccessToken)).StatusCode);
        using var duplicateUpdate = await SendAsync(client, HttpMethod.Put, $"/api/v1/lojas/{createdId}", LojaPayload(setup.DocumentoExistente, "SP", true), setup.AccessToken);
        Assert.Equal(HttpStatusCode.Conflict, duplicateUpdate.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SendAsync(client, HttpMethod.Put, $"/api/v1/lojas/{createdId}", LojaPayload(Document(), "S1", true, razaoSocial: new string('x', 181)), setup.AccessToken)).StatusCode);
    }

    // Prepara duas empresas, lojas vinculadas e não vinculadas e uma identidade autenticada sem usar seed.
    private static async Task<BusinessSetup> CreateBusinessContextAsync(MySqlDataSource dataSource, ApiFactory factory)
    {
        var identity = await CreateUserAsync(dataSource, factory, "contexto de escrita");
        var empresaId = Guid.NewGuid().ToString();
        var outraEmpresaId = Guid.NewGuid().ToString();
        var funcionarioId = Guid.NewGuid().ToString();
        var lojaSemVinculoId = Guid.NewGuid().ToString();
        var lojaOutraEmpresaId = Guid.NewGuid().ToString();
        var documentoExistente = Document();
        await using var connection = await dataSource.OpenConnectionAsync();
        await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@Own,'Empresa Própria'),(@Other,'Outra Empresa')", new { Own = empresaId, Other = outraEmpresaId });
        await connection.ExecuteAsync(
            "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,uf) VALUES (@Unlinked,@Own,'Sem Vínculo Ltda','Sem Vínculo',@ExistingDocument,'SP'),(@Foreign,@Other,'Externa Ltda','Externa',@ForeignDocument,'TO')",
            new { Unlinked = lojaSemVinculoId, Own = empresaId, ExistingDocument = documentoExistente, Foreign = lojaOutraEmpresaId, Other = outraEmpresaId, ForeignDocument = Document() });
        await connection.ExecuteAsync("INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@EmpresaId,'Funcionário Escrita')", new { Id = funcionarioId, UserId = identity.UserId, EmpresaId = empresaId });
        var accessToken = await LoginAsync(factory, identity.Email, identity.Password);
        return new(identity.UserId, funcionarioId, empresaId, outraEmpresaId, lojaSemVinculoId, lojaOutraEmpresaId, documentoExistente, accessToken);
    }

    // Cria credencial Argon2id real para que os testes atravessem autenticação, sessão e autorização HTTP completas.
    private static async Task<TestIdentity> CreateUserAsync(MySqlDataSource dataSource, ApiFactory factory, string label)
    {
        var userId = Guid.NewGuid().ToString();
        var email = $"write-{Guid.NewGuid():N}@example.test";
        var password = $"uma frase senha {label}";
        var hash = await factory.Services.GetRequiredService<IPasswordHasher>().HashAsync(password);
        await using var connection = await dataSource.OpenConnectionAsync();
        await connection.ExecuteAsync("INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,1)", new { Id = userId, UserName = $"write.{Guid.NewGuid():N}", Hash = hash, Email = email });
        return new(userId, email, password);
    }

    // Usa o service real para garantir que o Bearer token esteja ligado a uma sessão persistida válida.
    private static async Task<string> LoginAsync(ApiFactory factory, string email, string password) =>
        (await factory.Services.GetRequiredService<AuthenticationService>().LoginAsync(
            new LoginRequest { Email = email, Password = password }, null, "business-write-test", CancellationToken.None)).AccessToken;

    // Serializa somente contratos permitidos; parâmetros opcionais facilitam cenários negativos sem alterar o DTO de produção.
    private static object LojaPayload(string documento, string uf, bool ativo, string cep = "12345678", string nomeFantasia = "Loja Nova", string razaoSocial = "Loja Nova Ltda") =>
        new { razaoSocial, nomeFantasia, documento, telefone = "11999999999", email = "loja@example.test", cep, rua = "Rua Um", numero = "10", complemento = "Sala 1", bairro = "Centro", cidade = "São Paulo", uf, ativo };

    // Empresa recebe somente campos mutáveis para testar também a proteção contra mass assignment.
    private static object EmpresaPayload(string nome, bool ativo) => new { nome, ativo };

    // Gera documento numérico de 14 dígitos para evitar colisões entre execuções do banco de CI.
    private static string Document() => $"{RandomNumberGenerator.GetInt32(100_000_000, 1_000_000_000)}{RandomNumberGenerator.GetInt32(10_000, 100_000)}";

    // Constrói cada mensagem HTTP com Bearer próprio e corpo opcional, sem compartilhar estado mutável.
    private static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, object? body, string accessToken)
    {
        var request = new HttpRequestMessage(method, path) { Content = body is null ? null : JsonContent.Create(body) };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client.SendAsync(request);
    }

    // Records locais agrupam apenas dados de preparação dos testes e nunca atravessam contratos da API.
    private sealed record TestIdentity(string UserId, string Email, string Password);
    private sealed record BusinessSetup(string UserId, string FuncionarioId, string EmpresaId, string OutraEmpresaId,
        string LojaSemVinculoId, string LojaOutraEmpresaId, string DocumentoExistente, string AccessToken);
}
