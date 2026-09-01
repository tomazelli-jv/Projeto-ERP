using ERP.AdminCli;
using ERP.Infrastructure.Database;
using ERP.Infrastructure.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using MySqlConnector;

return await RunAsync(args);

static async Task<int> RunAsync(string[] args)
{
    if (args.Length != 1 || !string.Equals(args[0], "create-user", StringComparison.OrdinalIgnoreCase))
    {
        Console.Error.WriteLine("Uso: dotnet run --project backend/tools/ERP.AdminCli -- create-user");
        return 2;
    }

    var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
    var connectionString = configuration.GetConnectionString("MariaDb");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        Console.Error.WriteLine("A variável ConnectionStrings__MariaDb é obrigatória.");
        return 2;
    }

    try
    {
        var passwordOptions = configuration.GetSection(PasswordSecurityOptions.SectionName).Get<PasswordSecurityOptions>() ?? new();
        var hasher = new Argon2idPasswordHasher(Options.Create(passwordOptions));
        await using var dataSource = new MySqlDataSourceBuilder(connectionString).Build();
        var repository = new MariaDbUserBootstrapRepository(new MariaDbConnectionFactory(dataSource));
        var service = new CreateUserService(repository, hasher);

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
    catch (CreateUserValidationException exception)
    {
        Console.Error.WriteLine(exception.Message);
        return 2;
    }
    catch (CreateUserConflictException exception)
    {
        Console.Error.WriteLine(exception.Message);
        return 3;
    }
    catch (Exception exception) when (exception is MySqlException or InvalidOperationException)
    {
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
        Console.Error.WriteLine("Não foi possível criar o usuário.");
        return 1;
    }
}

static string ReadPassword(string prompt)
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
