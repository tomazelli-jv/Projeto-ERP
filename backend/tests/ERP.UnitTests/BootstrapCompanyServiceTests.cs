using ERP.AdminCli;

namespace ERP.UnitTests;

// Testa validação e decisões de domínio do comando sem abrir conexão ou depender de um banco DEV.
public sealed class BootstrapCompanyServiceTests
{
    [Fact]
    public async Task ValidInput_IsNormalizedBeforePersistence()
    {
        var repository = new RecordingRepository();
        var service = new BootstrapCompanyService(repository);

        var result = await service.BootstrapAsync(new(" ADMIN@Example.COM ", " Empresa Exemplo ", " João Silva "));

        Assert.Equal("admin@example.com", result.Email);
        Assert.Equal("Empresa Exemplo", result.CompanyName);
        Assert.Equal("João Silva", result.EmployeeName);
        Assert.Equal(result.Email, repository.Input?.Email);
        Assert.Equal(result.CompanyName, repository.Input?.CompanyName);
        Assert.Equal(result.EmployeeName, repository.Input?.EmployeeName);
    }

    // Entradas inválidas devem falhar antes de chamar a fronteira responsável pela transação.
    [Theory]
    [InlineData("invalid", "Empresa", "Funcionário")]
    [InlineData("admin@example.com", "", "Funcionário")]
    [InlineData("admin@example.com", "Empresa", "")]
    public async Task InvalidInput_IsRejectedBeforePersistence(string email, string companyName, string employeeName)
    {
        var repository = new RecordingRepository();
        var service = new BootstrapCompanyService(repository);

        await Assert.ThrowsAsync<BootstrapCompanyValidationException>(() =>
            service.BootstrapAsync(new(email, companyName, employeeName)));

        Assert.Null(repository.Input);
    }

    // Os limites refletem exatamente os VARCHAR(160) de empresa e funcionário no baseline atual.
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task OversizedNames_AreRejected(bool companyIsInvalid)
    {
        var repository = new RecordingRepository();
        var service = new BootstrapCompanyService(repository);
        var oversized = new string('x', 161);

        await Assert.ThrowsAsync<BootstrapCompanyValidationException>(() => service.BootstrapAsync(new(
            "admin@example.com",
            companyIsInvalid ? oversized : "Empresa",
            companyIsInvalid ? "Funcionário" : oversized)));

        Assert.Null(repository.Input);
    }

    // Usuário ausente gera mensagem operacional clara sem criar automaticamente uma identidade.
    [Fact]
    public async Task MissingUser_IsReportedAsConflict()
    {
        var service = new BootstrapCompanyService(new RecordingRepository { Outcome = BootstrapCompanyOutcome.UserNotFound });

        var exception = await Assert.ThrowsAsync<BootstrapCompanyConflictException>(() =>
            service.BootstrapAsync(new("admin@example.com", "Empresa", "Funcionário")));

        Assert.Contains("Não existe um usuário", exception.Message);
    }

    // Contexto prévio é preservado: o comando não move funcionário nem cria uma segunda empresa.
    [Fact]
    public async Task ExistingBusinessContext_IsReportedAsConflict()
    {
        var service = new BootstrapCompanyService(new RecordingRepository
        {
            Outcome = BootstrapCompanyOutcome.BusinessContextAlreadyConfigured
        });

        var exception = await Assert.ThrowsAsync<BootstrapCompanyConflictException>(() =>
            service.BootstrapAsync(new("admin@example.com", "Empresa", "Funcionário")));

        Assert.Contains("já possui contexto empresarial", exception.Message);
    }

    // Repositório gravador permite observar a fronteira transacional sem simular SQL em testes unitários.
    private sealed class RecordingRepository : ICompanyBootstrapRepository
    {
        public BootstrapCompanyOutcome Outcome { get; init; } = BootstrapCompanyOutcome.Created;
        public BootstrapCompanyInput? Input { get; private set; }

        public Task<BootstrapCompanyOutcome> BootstrapAsync(
            BootstrapCompanyInput input,
            CancellationToken cancellationToken = default)
        {
            Input = input;
            return Task.FromResult(Outcome);
        }
    }
}
