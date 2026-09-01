using ERP.Infrastructure.Database;
using ERP.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MySqlConnector;

namespace ERP.AdminCli;

// Classe nomeada evita expor o tipo global Program e colidir com o entry point da API em testes de integração.
internal static class AdminCliProgram
{
    // Main delega ao dispatcher testável mantendo código de saída assíncrono para automação administrativa.
    public static async Task<int> Main(string[] args) => await RunAsync(args);

    // O ponto de entrada aceita apenas comandos administrativos conhecidos e nunca recebe senhas pela linha de comando.
    private static async Task<int> RunAsync(string[] args)
    {
        if (args.Length != 1 || !IsSupportedCommand(args[0]))
        {
            PrintUsage();
            return 2;
        }

        // A conexão continua vindo exclusivamente de ambiente e jamais é incluída em mensagens ou logs do CLI.
        var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
        var connectionString = configuration.GetConnectionString("MariaDb");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.Error.WriteLine("A variável ConnectionStrings__MariaDb é obrigatória.");
            return 2;
        }

        try
        {
            await using var dataSource = new MySqlDataSourceBuilder(connectionString).Build();
            var connections = new MariaDbConnectionFactory(dataSource);
            return string.Equals(args[0], "create-user", StringComparison.OrdinalIgnoreCase)
                ? await RunCreateUserAsync(configuration, connections)
                : await RunBootstrapCompanyAsync(connections);
        }
        catch (CreateUserValidationException exception)
        {
            Console.Error.WriteLine(exception.Message);
            return 2;
        }
        catch (BootstrapCompanyValidationException exception)
        {
            Console.Error.WriteLine(exception.Message);
            return 2;
        }
        catch (Exception exception) when (exception is CreateUserConflictException or BootstrapCompanyConflictException)
        {
            Console.Error.WriteLine(exception.Message);
            return 3;
        }
        catch (Exception exception) when (exception is MySqlException or InvalidOperationException)
        {
            // Falhas técnicas são sanitizadas para não revelar host, credenciais, SQL ou estrutura interna.
            Console.Error.WriteLine("Não foi possível acessar o banco de dados. Verifique a configuração e tente novamente.");
            return 4;
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("Operação cancelada.");
            return 130;
        }
        catch (Exception)
        {
            Console.Error.WriteLine("Não foi possível concluir a operação administrativa.");
            return 1;
        }
    }

    // Mantém o create-user existente usando exatamente o Argon2id e a política de senha compartilhados pela API.
    private static async Task<int> RunCreateUserAsync(IConfiguration configuration, IMariaDbConnectionFactory connections)
    {
        var passwordOptions = configuration.GetSection(PasswordSecurityOptions.SectionName).Get<PasswordSecurityOptions>() ?? new();
        var hasher = new Argon2idPasswordHasher(Options.Create(passwordOptions));
        var service = new CreateUserService(new MariaDbUserBootstrapRepository(connections), hasher);

        Console.Write("Nome de usuário: ");
        var userName = Console.ReadLine();
        Console.Write("E-mail: ");
        var email = Console.ReadLine();
        var password = ReadPassword("Senha: ");
        var confirmation = ReadPassword("Confirme a senha: ");
        var result = await service.CreateAsync(new(userName, email, password, confirmation));
        Console.WriteLine("Usuário criado com sucesso.");
        Console.WriteLine($"ID: {result.Id}");
        Console.WriteLine($"E-mail: {result.Email}");
        return 0;
    }

    // O novo comando solicita uma identidade existente e cria somente empresa e funcionário em uma operação atômica.
    private static async Task<int> RunBootstrapCompanyAsync(IMariaDbConnectionFactory connections)
    {
        var service = new BootstrapCompanyService(new MariaDbCompanyBootstrapRepository(connections));
        Console.Write("E-mail do usuário: ");
        var email = Console.ReadLine();
        Console.Write("Nome da empresa: ");
        var companyName = Console.ReadLine();
        Console.Write("Nome do funcionário: ");
        var employeeName = Console.ReadLine();

        var result = await service.BootstrapAsync(new(email, companyName, employeeName));
        Console.WriteLine("Bootstrap empresarial concluído.");
        Console.WriteLine("Empresa:");
        Console.WriteLine(result.CompanyName);
        Console.WriteLine("Funcionário:");
        Console.WriteLine(result.EmployeeName);
        Console.WriteLine("Usuário:");
        Console.WriteLine(result.Email);
        return 0;
    }

    // A lista fechada evita executar acidentalmente operações não reconhecidas.
    private static bool IsSupportedCommand(string command) =>
        string.Equals(command, "create-user", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(command, "bootstrap-company", StringComparison.OrdinalIgnoreCase);

    // A ajuda documenta os dois comandos sem sugerir parâmetros sensíveis.
    private static void PrintUsage()
    {
        Console.Error.WriteLine("Uso:");
        Console.Error.WriteLine("  dotnet run --project backend/tools/ERP.AdminCli -- create-user");
        Console.Error.WriteLine("  dotnet run --project backend/tools/ERP.AdminCli -- bootstrap-company");
    }

    // A leitura interativa oculta a senha em terminais; redirecionamento continua disponível para automação controlada.
    private static string ReadPassword(string prompt)
    {
        Console.Write(prompt);
        if (Console.IsInputRedirected)
            return Console.ReadLine() ?? "";

        var password = new System.Text.StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter)
            {
                Console.WriteLine();
                return password.ToString();
            }
            if (key.Key == ConsoleKey.Backspace)
            {
                if (password.Length > 0) password.Length--;
                continue;
            }
            if (!char.IsControl(key.KeyChar)) password.Append(key.KeyChar);
        }
    }
}
