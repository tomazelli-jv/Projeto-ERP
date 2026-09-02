using System.Net.Mail;

namespace ERP.AdminCli;

// Entrada interativa contém somente os três valores necessários para configurar o primeiro contexto empresarial.
public sealed record BootstrapCompanyInput(string? Email, string? CompanyName, string? EmployeeName);

// O resultado omite identificadores internos porque o operador precisa apenas confirmar os dados informados.
public sealed record BootstrappedCompany(string Email, string CompanyName, string EmployeeName);

// O repositório distingue resultados esperados sem propagar detalhes físicos do MariaDB para o console.
public enum BootstrapCompanyOutcome
{
    Created,
    UserNotFound,
    BusinessContextAlreadyConfigured
}

// O comando entrega dados já normalizados; a implementação concreta controla a transação atômica.
public interface ICompanyBootstrapRepository
{
    Task<BootstrapCompanyOutcome> BootstrapAsync(
        BootstrapCompanyInput input,
        CancellationToken cancellationToken = default);
}

// Falhas de entrada recebem código de saída próprio e mensagem adequada para operação manual.
public sealed class BootstrapCompanyValidationException(string message) : Exception(message);

// Conflitos esperados são separados de falhas técnicas para não expor SQL ou detalhes do banco.
public sealed class BootstrapCompanyConflictException(string message) : Exception(message);

// O serviço valida e normaliza a entrada antes de permitir qualquer abertura de transação no repositório.
public sealed class BootstrapCompanyService(ICompanyBootstrapRepository repository)
{
    // A criação só é considerada concluída quando o repositório confirma empresa e funcionário persistidos juntos.
    public async Task<BootstrappedCompany> BootstrapAsync(
        BootstrapCompanyInput input,
        CancellationToken cancellationToken = default)
    {
        var email = NormalizeEmail(input.Email);
        var companyName = RequiredName(input.CompanyName, "O nome da empresa", 160);
        var employeeName = RequiredName(input.EmployeeName, "O nome do funcionário", 160);
        var normalized = new BootstrapCompanyInput(email, companyName, employeeName);

        var outcome = await repository.BootstrapAsync(normalized, cancellationToken);
        if (outcome == BootstrapCompanyOutcome.UserNotFound)
            throw new BootstrapCompanyConflictException("Não existe um usuário cadastrado com este e-mail.");
        if (outcome == BootstrapCompanyOutcome.BusinessContextAlreadyConfigured)
            throw new BootstrapCompanyConflictException("Este usuário já possui contexto empresarial configurado.");

        return new BootstrappedCompany(email, companyName, employeeName);
    }

    // A normalização replica a política do create-user para que consulta e cadastro usem o mesmo e-mail canônico.
    private static string NormalizeEmail(string? value)
    {
        var email = value?.Trim().ToLowerInvariant() ?? "";
        if (email.Length is 0 or > 254 || !MailAddress.TryCreate(email, out var parsed) ||
            !string.Equals(parsed.Address, email, StringComparison.OrdinalIgnoreCase))
            throw new BootstrapCompanyValidationException("Informe um e-mail válido.");
        return email;
    }

    // Nomes são aparados antes da persistência e limitados ao VARCHAR(160) definido no baseline.
    private static string RequiredName(string? value, string label, int maximumLength)
    {
        var normalized = value?.Trim() ?? "";
        if (normalized.Length is 0 || normalized.Length > maximumLength)
            throw new BootstrapCompanyValidationException($"{label} é obrigatório e deve possuir no máximo {maximumLength} caracteres.");
        return normalized;
    }
}
