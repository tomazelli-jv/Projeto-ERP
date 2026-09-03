namespace ERP.Application.Authorization;

// Cada definição reúne o código estável usado na autorização e os metadados persistidos no catálogo.
public sealed record PermissionDefinition(string Code, string Module, string Description);

// Catálogo único impede strings divergentes entre controllers, bootstrap e testes.
public static class Permissions
{
    public const string AdministracaoUsuariosVisualizar = "administracao.usuarios.visualizar";
    public const string AdministracaoUsuariosGerenciar = "administracao.usuarios.gerenciar";
    public const string AdministracaoEmpresaVisualizar = "administracao.empresa.visualizar";
    public const string AdministracaoEmpresaEditar = "administracao.empresa.editar";
    public const string AdministracaoLojasVisualizar = "administracao.lojas.visualizar";
    public const string AdministracaoLojasGerenciar = "administracao.lojas.gerenciar";

    // A ordem determinística facilita bootstrap, auditoria e testes sem ampliar o escopo para módulos futuros.
    public static IReadOnlyList<PermissionDefinition> All { get; } =
    [
        new(AdministracaoUsuariosVisualizar, "administracao", "Visualizar usuários e funcionários."),
        new(AdministracaoUsuariosGerenciar, "administracao", "Gerenciar usuários e funcionários."),
        new(AdministracaoEmpresaVisualizar, "administracao", "Visualizar dados da empresa."),
        new(AdministracaoEmpresaEditar, "administracao", "Editar dados da empresa."),
        new(AdministracaoLojasVisualizar, "administracao", "Visualizar lojas autorizadas."),
        new(AdministracaoLojasGerenciar, "administracao", "Criar e editar lojas autorizadas.")
    ];
}

// Perfil inicial tem nome normalizado estável, mas recebe UUID gerado no banco de cada instalação.
public static class InitialProfiles
{
    public const string AdministratorName = "Administrador";
    public const string AdministratorNormalizedName = "ADMINISTRADOR";
    public static IReadOnlyList<string> AdministratorPermissions { get; } = Permissions.All.Select(item => item.Code).ToArray();
}
