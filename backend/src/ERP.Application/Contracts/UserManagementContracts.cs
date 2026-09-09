using System.Text.Json;
using System.Text.Json.Serialization;

namespace ERP.Application.Contracts;

// Respostas administrativas separam identidade, pessoa, perfil e lojas sem expor credenciais.
public sealed record ManagedUserListItem(string IdUsuario, string UserName, string Email, bool Ativo, DateTime DataCadastro,
    string IdFuncionario, string NomeFuncionario, string? Perfil, long QuantidadeLojas);
public sealed record ManagedProfile(string IdPerfil, string Nome);
public sealed record ManagedStore(string IdLoja, string NomeFantasia, bool Ativo);
public sealed record ManagedEmployeeSummary(string IdFuncionario, string Nome, bool PossuiUsuario, string? IdUsuario,
    string? UserName, string? Email, long QuantidadeLojas);
public sealed record ManagedEmployeeDetail(string IdFuncionario, string Nome, string? IdUsuario, IReadOnlyList<ManagedStore> Lojas);
public sealed record ManagedUserDetail(string IdUsuario, string UserName, string Email, bool Ativo, DateTime DataCadastro,
    ManagedEmployeeDetail Funcionario, ManagedProfile? Perfil, IReadOnlyList<ManagedStore> Lojas);

// Criação controla todos os IDs no servidor e rejeita propriedades desconhecidas para evitar mass assignment.
public sealed class CreateUserEmployeeRequest
{
    public string? UserName { get; init; }
    public string? Email { get; init; }
    public string? Password { get; init; }
    public string? NomeFuncionario { get; init; }
    public bool? Ativo { get; init; }
    public string? IdPerfil { get; init; }
    public IReadOnlyList<string>? IdsLojas { get; init; }
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

// Atualizações de usuário nunca aceitam hash, empresa ou identificadores controlados pelo banco.
public sealed class UpdateManagedUserRequest
{
    public string? UserName { get; init; }
    public string? Email { get; init; }
    public bool? Ativo { get; init; }
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

// Funcionário permite editar somente o nome; sua empresa é imutável por contrato.
public sealed class UpdateManagedEmployeeRequest
{
    public string? Nome { get; init; }
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}

// Perfil e lojas usam contratos próprios para manter operações e validações independentes.
public sealed class UpdateManagedProfileRequest
{
    public string? IdPerfil { get; init; }
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}
public sealed class UpdateManagedStoresRequest
{
    public IReadOnlyList<string>? IdsLojas { get; init; }
    [JsonExtensionData] public IDictionary<string, JsonElement>? Extra { get; init; }
}
