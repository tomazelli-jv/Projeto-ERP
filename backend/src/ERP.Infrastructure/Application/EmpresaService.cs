using ERP.Application.Contracts;
using ERP.Domain.Business;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;

namespace ERP.Infrastructure.Application;

// Coordena o contexto empresarial do usuário e traduz linhas internas em contratos públicos da API.
public sealed class EmpresaService(IMariaDbConnectionFactory connections, EmpresaRepository repository)
{
    // Lista somente a empresa associada ao funcionário autenticado.
    public async Task<IReadOnlyList<EmpresaResponse>> ListEmpresasAsync(string userId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        return (await repository.ListEmpresasAsync(connection, context.EmpresaId, token)).Select(ToResponse).ToArray();
    }

    // Retorna 404 tanto para id inexistente quanto para empresa fora do escopo do usuário.
    public async Task<EmpresaResponse> FindEmpresaAsync(string userId, string empresaId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        var empresa = await repository.FindEmpresaAsync(connection, context.EmpresaId, empresaId, token)
            ?? throw BusinessErrors.EmpresaNotFound();
        return ToResponse(empresa);
    }

    // Valida primeiro a empresa da URL e depois limita lojas aos vínculos de funcionario_loja.
    public async Task<IReadOnlyList<LojaResponse>> ListLojasAsync(string userId, string empresaId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        _ = await repository.FindEmpresaAsync(connection, context.EmpresaId, empresaId, token)
            ?? throw BusinessErrors.EmpresaNotFound();
        return (await repository.ListLojasAsync(connection, context, empresaId, token)).Select(ToResponse).ToArray();
    }

    // A loja só é retornada quando o vínculo explícito pertence ao funcionário e à sua empresa.
    public async Task<LojaResponse> FindLojaAsync(string userId, string lojaId, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        var loja = await repository.FindLojaAsync(connection, context, lojaId, token)
            ?? throw BusinessErrors.LojaNotFound();
        return ToResponse(loja);
    }

    // Centralizar a resolução garante 403 consistente para qualquer rota de negócio sem funcionário.
    private async Task<BusinessContextRecord> RequiredContextAsync(MySqlConnector.MySqlConnection connection, string userId, CancellationToken token) =>
        await repository.FindContextAsync(connection, userId, token) ?? throw BusinessErrors.ContextRequired();

    // O mapeamento explícito evita expor records de persistência ou nomes físicos do banco.
    private static EmpresaResponse ToResponse(EmpresaRecord empresa) =>
        new(empresa.Id, empresa.Nome, empresa.Ativo, empresa.DataCadastro);

    // O documento permanece com os 14 dígitos armazenados; formatação pertence ao frontend.
    private static LojaResponse ToResponse(LojaRecord loja) =>
        new(loja.Id, loja.IdEmpresa, loja.RazaoSocial, loja.NomeFantasia, loja.Documento, loja.Telefone,
            loja.Email, loja.Cep, loja.Rua, loja.Numero, loja.Complemento, loja.Bairro, loja.Cidade,
            loja.Uf, loja.Ativo, loja.DataCadastro);
}
