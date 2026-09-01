using ERP.Application.Contracts;
using ERP.Domain.Business;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Persistence;
using MySqlConnector;

namespace ERP.Infrastructure.Application;

// Coordena o contexto empresarial do usuário e traduz linhas internas em contratos públicos da API.
public sealed class EmpresaService(IMariaDbConnectionFactory connections, EmpresaRepository repository)
{
    // A rota existe para firmar o contrato, mas nenhuma criação é permitida sem autoridade global definida no modelo.
    public async Task<EmpresaResponse> CreateEmpresaAsync(string userId, CreateEmpresaRequest? request, CancellationToken token)
    {
        await using var connection = await connections.OpenConnectionAsync(token);
        _ = await RequiredContextAsync(connection, userId, token);
        _ = request; // O payload não concede autoridade e não é usado para contornar a decisão de segurança.
        throw BusinessErrors.EmpresaCreationForbidden();
    }

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

    // Atualiza apenas nome e estado da empresa do contexto e confirma a representação persistida antes de responder.
    public async Task<EmpresaResponse> UpdateEmpresaAsync(string userId, string empresaId, UpdateEmpresaRequest? request, CancellationToken token)
    {
        var input = BusinessInput.ValidateEmpresa(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        var affected = await repository.UpdateEmpresaAsync(connection, context.EmpresaId, empresaId, input.Nome, input.Ativo, token);
        var empresa = await repository.FindEmpresaAsync(connection, context.EmpresaId, empresaId, token);
        if (affected == 0 && empresa is null) throw BusinessErrors.EmpresaNotFound();
        return ToResponse(empresa ?? throw BusinessErrors.EmpresaNotFound());
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

    // Loja e funcionario_loja são criados na mesma transação para impedir loja órfã caso o vínculo falhe.
    public async Task<LojaResponse> CreateLojaAsync(string userId, string empresaId, CreateLojaRequest? request, CancellationToken token)
    {
        var input = BusinessInput.ValidateLoja(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        _ = await repository.FindEmpresaAsync(connection, context.EmpresaId, empresaId, token)
            ?? throw BusinessErrors.EmpresaNotFound();
        var lojaId = Guid.NewGuid().ToString();
        await using var transaction = await connection.BeginTransactionAsync(token);
        try
        {
            var created = await repository.CreateLojaAsync(connection, transaction, lojaId, context.EmpresaId, input, token);
            var linked = await repository.CreateFuncionarioLojaAsync(connection, transaction, Guid.NewGuid().ToString(), context, lojaId, token);
            if (created != 1 || linked != 1)
                throw new InvalidOperationException("Store creation did not persist all required records.");
            await transaction.CommitAsync(token);
        }
        catch (MySqlException exception) when (IsDocumentoDuplicate(exception))
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw BusinessErrors.LojaDocumentoAlreadyExists();
        }
        catch
        {
            if (transaction.Connection is not null) await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
        var loja = await repository.FindLojaAsync(connection, context, lojaId, token)
            ?? throw new InvalidOperationException("Created store could not be read through its owner link.");
        return ToResponse(loja);
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

    // Atualização usa UPDATE JOIN com funcionario_loja e traduz somente a unique conhecida de documento.
    public async Task<LojaResponse> UpdateLojaAsync(string userId, string lojaId, UpdateLojaRequest? request, CancellationToken token)
    {
        var input = BusinessInput.ValidateLoja(request);
        await using var connection = await connections.OpenConnectionAsync(token);
        var context = await RequiredContextAsync(connection, userId, token);
        try
        {
            var affected = await repository.UpdateLojaAsync(connection, context, lojaId, input, token);
            var loja = await repository.FindLojaAsync(connection, context, lojaId, token);
            if (affected == 0 && loja is null) throw BusinessErrors.LojaNotFound();
            return ToResponse(loja ?? throw BusinessErrors.LojaNotFound());
        }
        catch (MySqlException exception) when (IsDocumentoDuplicate(exception))
        {
            throw BusinessErrors.LojaDocumentoAlreadyExists();
        }
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

    // Somente o erro 1062 da constraint global de documento é previsível; demais falhas SQL permanecem 500.
    private static bool IsDocumentoDuplicate(MySqlException exception) =>
        exception.Number == 1062 && exception.Message.Contains("uq_loja_documento", StringComparison.OrdinalIgnoreCase);
}
