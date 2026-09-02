using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using Dapper;
using ERP.Application.Abstractions;
using ERP.Application.Contracts;
using ERP.Infrastructure.Application;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Migrations;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MySqlConnector;

namespace ERP.IntegrationTests;

// Valida as rotas de leitura contra o schema real e protege contra vazamento entre empresas e lojas.
[Collection(DatabaseCollection.Name)]
public sealed class BusinessReadEndpointsTests(DatabaseFixture database)
{
    // A camada HTTP deve bloquear as rotas antes de qualquer consulta quando não há access token.
    [Fact]
    public async Task BusinessRoutes_RequireAuthentication()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/empresas")).StatusCode);
    }

    // Autenticação global não exige funcionário, mas as rotas empresariais devem responder 403 com código estável.
    [Fact]
    public async Task AuthenticatedUserWithoutFuncionario_ReceivesBusinessContextRequired()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        const string password = "uma frase senha empresarial";
        var email = $"no-context-{Guid.NewGuid():N}@example.test";
        await InsertUserAsync(dataSource, factory, Guid.NewGuid().ToString(), email, password);
        var accessToken = await LoginAsync(factory, email, password);

        using var client = factory.CreateClient();
        using var request = AuthorizedGet("/api/v1/empresas", accessToken);
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Contains("BUSINESS_CONTEXT_REQUIRED", await response.Content.ReadAsStringAsync());
    }

    // Este cenário cria empresas e lojas concorrentes para provar que todos os endpoints aplicam o vínculo do funcionário.
    [Fact]
    public async Task EmpresaAndLojaQueries_AreRestrictedToFuncionarioScope()
    {
        if (!database.Enabled) return;
        await using var dataSource = new MySqlDataSourceBuilder(database.ConnectionString).Build();
        await new MariaDbMigrationRunner(new MariaDbConnectionFactory(dataSource)).UpAsync();
        await using var factory = new ApiFactory();
        const string password = "outra frase senha empresarial";
        var userId = Guid.NewGuid().ToString();
        var funcionarioId = Guid.NewGuid().ToString();
        var empresaA = Guid.NewGuid().ToString();
        var empresaB = Guid.NewGuid().ToString();
        var lojaVinculada = Guid.NewGuid().ToString();
        var lojaSemVinculo = Guid.NewGuid().ToString();
        var lojaOutraEmpresa = Guid.NewGuid().ToString();
        var documentPrefix = RandomNumberGenerator.GetInt32(100_000_000, 1_000_000_000).ToString();
        var linkedDocument = $"{documentPrefix}00001";
        var unlinkedDocument = $"{documentPrefix}00002";
        var foreignDocument = $"{documentPrefix}00003";
        var email = $"business-{Guid.NewGuid():N}@example.test";
        await InsertUserAsync(dataSource, factory, userId, email, password);

        // Os dados são isolados por UUID e não dependem de seed ou estado preexistente do banco de teste.
        await using (var connection = await dataSource.OpenConnectionAsync())
        {
            await connection.ExecuteAsync("INSERT INTO empresa (id_empresa,nome) VALUES (@A,'Empresa A'),(@B,'Empresa B')", new { A = empresaA, B = empresaB });
            await connection.ExecuteAsync(
                "INSERT INTO loja (id_loja,id_empresa,razao_social,nome_fantasia,documento,uf) VALUES (@Linked,@A,'Loja A Ltda','Loja A',@LinkedDocument,'SP'),(@Unlinked,@A,'Loja sem Vínculo Ltda','Loja sem Vínculo',@UnlinkedDocument,'TO'),(@Other,@B,'Loja B Ltda','Loja B',@ForeignDocument,'SP')",
                new { Linked = lojaVinculada, Unlinked = lojaSemVinculo, Other = lojaOutraEmpresa, A = empresaA, B = empresaB, LinkedDocument = linkedDocument, UnlinkedDocument = unlinkedDocument, ForeignDocument = foreignDocument });
            await connection.ExecuteAsync(
                "INSERT INTO funcionario (id_funcionario,id_usuario,id_empresa,nome) VALUES (@Id,@UserId,@EmpresaId,'Funcionário A')",
                new { Id = funcionarioId, UserId = userId, EmpresaId = empresaA });
            await connection.ExecuteAsync(
                "INSERT INTO funcionario_loja (id_funcionario_loja,id_funcionario,id_loja,id_empresa) VALUES (@Id,@FuncionarioId,@LojaId,@EmpresaId)",
                new { Id = Guid.NewGuid().ToString(), FuncionarioId = funcionarioId, LojaId = lojaVinculada, EmpresaId = empresaA });
        }

        var accessToken = await LoginAsync(factory, email, password);
        using var client = factory.CreateClient();

        // A coleção de empresas contém somente A e mantém UUID CHAR(36) materializado como string.
        using var empresasResponse = await SendAsync(client, "/api/v1/empresas", accessToken);
        Assert.Equal(HttpStatusCode.OK, empresasResponse.StatusCode);
        using var empresasJson = JsonDocument.Parse(await empresasResponse.Content.ReadAsStringAsync());
        var empresas = empresasJson.RootElement.GetProperty("data").EnumerateArray().ToArray();
        var empresa = Assert.Single(empresas);
        Assert.Equal(empresaA, empresa.GetProperty("id").GetString());
        Assert.DoesNotContain(empresas, item => item.GetProperty("id").GetString() == empresaB);

        // A empresa própria é visível, enquanto a empresa B usa o mesmo 404 de recurso inexistente.
        using var ownEmpresa = await SendAsync(client, $"/api/v1/empresas/{empresaA}", accessToken);
        Assert.Equal(HttpStatusCode.OK, ownEmpresa.StatusCode);
        using var foreignEmpresa = await SendAsync(client, $"/api/v1/empresas/{empresaB}", accessToken);
        Assert.Equal(HttpStatusCode.NotFound, foreignEmpresa.StatusCode);
        Assert.Contains("EMPRESA_NOT_FOUND", await foreignEmpresa.Content.ReadAsStringAsync());

        // A listagem usa funcionario_loja: omite loja A sem vínculo e loja B de outra empresa.
        using var lojasResponse = await SendAsync(client, $"/api/v1/empresas/{empresaA}/lojas", accessToken);
        Assert.Equal(HttpStatusCode.OK, lojasResponse.StatusCode);
        using var lojasJson = JsonDocument.Parse(await lojasResponse.Content.ReadAsStringAsync());
        var lojas = lojasJson.RootElement.GetProperty("data").EnumerateArray().ToArray();
        var loja = Assert.Single(lojas);
        Assert.Equal(lojaVinculada, loja.GetProperty("id").GetString());
        Assert.Equal(empresaA, loja.GetProperty("idEmpresa").GetString());
        Assert.Equal(linkedDocument, loja.GetProperty("documento").GetString());

        // A consulta individual preserva o vínculo e retorna 404 para loja sem vínculo ou de outra empresa.
        using var ownLoja = await SendAsync(client, $"/api/v1/lojas/{lojaVinculada}", accessToken);
        Assert.Equal(HttpStatusCode.OK, ownLoja.StatusCode);
        using var unlinkedLoja = await SendAsync(client, $"/api/v1/lojas/{lojaSemVinculo}", accessToken);
        Assert.Equal(HttpStatusCode.NotFound, unlinkedLoja.StatusCode);
        using var foreignLoja = await SendAsync(client, $"/api/v1/lojas/{lojaOutraEmpresa}", accessToken);
        Assert.Equal(HttpStatusCode.NotFound, foreignLoja.StatusCode);
        Assert.Contains("LOJA_NOT_FOUND", await foreignLoja.Content.ReadAsStringAsync());
    }

    // Cria somente a identidade autenticável; funcionário e contexto são responsabilidade de cada cenário.
    private static async Task InsertUserAsync(MySqlDataSource dataSource, ApiFactory factory, string userId, string email, string password)
    {
        var hash = await factory.Services.GetRequiredService<IPasswordHasher>().HashAsync(password);
        await using var connection = await dataSource.OpenConnectionAsync();
        await connection.ExecuteAsync(
            "INSERT INTO usuarios (id_usuario,user_name,password_hash,email,ativo) VALUES (@Id,@UserName,@Hash,@Email,1)",
            new { Id = userId, UserName = $"business.{Guid.NewGuid():N}", Hash = hash, Email = email });
    }

    // Usa o fluxo real de login para produzir um JWT e uma sessão persistida antes das consultas de negócio.
    private static async Task<string> LoginAsync(ApiFactory factory, string email, string password)
    {
        var result = await factory.Services.GetRequiredService<AuthenticationService>()
            .LoginAsync(new LoginRequest { Email = email, Password = password }, null, "business-read-test", CancellationToken.None);
        return result.AccessToken;
    }

    // Centraliza o header Bearer para que cada asserção exercite exatamente a rota pública protegida.
    private static HttpRequestMessage AuthorizedGet(string path, string accessToken)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return request;
    }

    // Envia a requisição autorizada sem compartilhar mensagens mutáveis entre chamadas sequenciais.
    private static Task<HttpResponseMessage> SendAsync(HttpClient client, string path, string accessToken) =>
        client.SendAsync(AuthorizedGet(path, accessToken));
}
