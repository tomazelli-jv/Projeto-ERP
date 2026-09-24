[CmdletBinding()]
param(
    # ResetCredential descarta somente a credencial local criptografada e solicita uma nova senha.
    [switch]$ResetCredential,
    # ProjectRoot permite que o atalho carregue este arquivo explicitamente como UTF-8 no Windows PowerShell 5.
    [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'
$projectRoot = if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    Split-Path -Parent $PSScriptRoot
}
else {
    $ProjectRoot.TrimEnd('\', '/')
}
$credentialDirectory = Join-Path $env:LOCALAPPDATA 'TomazelliERP'
$credentialFile = Join-Path $credentialDirectory 'postgres-erp-dev-password.clixml'

# Testa IPv4 e IPv6 porque o Vite pode publicar localhost somente como ::1 no Windows.
function Test-LocalPort {
    param([Parameter(Mandatory)][int]$Port)

    $endpoints = @(
        @([System.Net.IPAddress]::Loopback, [System.Net.Sockets.AddressFamily]::InterNetwork),
        @([System.Net.IPAddress]::IPv6Loopback, [System.Net.Sockets.AddressFamily]::InterNetworkV6)
    )
    foreach ($endpoint in $endpoints) {
        $client = [System.Net.Sockets.TcpClient]::new($endpoint[1])
        try {
            $task = $client.ConnectAsync($endpoint[0], $Port)
            if ($task.Wait(500) -and $client.Connected) {
                return $true
            }
        }
        catch {
            # Falha em uma família de endereços ainda permite testar a outra antes de considerar indisponível.
        }
        finally {
            $client.Dispose()
        }
    }
    return $false
}

# Aguarda cada processo publicar sua porta para não abrir o navegador durante a compilação inicial.
function Wait-LocalPort {
    param(
        [Parameter(Mandatory)][int]$Port,
        [Parameter(Mandatory)][string]$ServiceName,
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-LocalPort -Port $Port) {
            Write-Host "$ServiceName disponível na porta $Port." -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 500
    }
    throw "$ServiceName não respondeu na porta $Port dentro de $TimeoutSeconds segundos. Consulte os arquivos em logs/local."
}

# A senha é persistida pelo DPAPI: somente este usuário do Windows nesta máquina consegue descriptografá-la.
function Get-PostgresPassword {
    if ($ResetCredential -and (Test-Path -LiteralPath $credentialFile)) {
        Remove-Item -LiteralPath $credentialFile -Force
    }

    if (Test-Path -LiteralPath $credentialFile) {
        try {
            return Import-Clixml -LiteralPath $credentialFile
        }
        catch {
            Write-Warning 'A credencial local não pôde ser lida e será solicitada novamente.'
            Remove-Item -LiteralPath $credentialFile -Force
        }
    }

    Write-Host 'Primeira execução: informe a senha do PostgreSQL local, usuário erp_dev_user.' -ForegroundColor Cyan
    $securePassword = Read-Host 'Senha do PostgreSQL' -AsSecureString
    if ($securePassword.Length -eq 0) {
        throw 'A senha do PostgreSQL não pode ser vazia.'
    }
    New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
    $securePassword | Export-Clixml -LiteralPath $credentialFile
    return $securePassword
}

try {
    Set-Location -LiteralPath $projectRoot
    # Resolve exclusivamente o repositorio irmao oficial; nunca usa ERP\backend legado.
    $backendRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '..\backend\ERP'))
    $apiProject = Join-Path $backendRoot 'ERP.Api\ERP.Api.csproj'
    if (-not (Test-Path -LiteralPath $apiProject)) {
        throw 'Projeto ERP.Api do backend oficial nao encontrado em ..\backend\ERP.'
    }
    [xml]$projectXml = Get-Content -Raw -LiteralPath $apiProject
    if (@($projectXml.Project.PropertyGroup.TargetFramework) -notcontains 'net8.0') {
        throw 'O backend oficial precisa usar net8.0.'
    }
    $logDirectory = Join-Path $projectRoot 'logs\local'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

    if (-not (Test-LocalPort -Port 5054)) {
        if (-not (Test-LocalPort -Port 5432)) {
            throw 'PostgreSQL local nao esta acessivel na porta 5432. Inicie o servico PostgreSQL.'
        }
        $securePassword = Get-PostgresPassword
        $credential = [System.Management.Automation.PSCredential]::new('erp_dev_user', $securePassword)
        # Destino fixo DEV. O builder preserva caracteres especiais sem imprimir credenciais.
        $connection = [System.Data.Common.DbConnectionStringBuilder]::new()
        $connection['Host'] = 'localhost'
        $connection['Port'] = 5432
        $connection['Database'] = 'erp_dev'
        $connection['Username'] = 'erp_dev_user'
        $connection['Password'] = $credential.GetNetworkCredential().Password
        $connection['Maximum Pool Size'] = 5
        $env:ConnectionStrings__DefaultConnection = $connection.ConnectionString
        $env:ASPNETCORE_ENVIRONMENT = 'Development'
        $env:DOTNET_ENVIRONMENT = 'Development'

        # Preserva chave informada pelo operador. Caso ausente, usa chave DEV aleatoria
        # protegida por DPAPI fora do Git e estavel entre reinicios do atalho.
        if ([string]::IsNullOrWhiteSpace($env:Jwt__SigningKey)) {
            $keyFile = Join-Path $credentialDirectory 'postgres-erp-dev-jwt.clixml'
            if (-not (Test-Path -LiteralPath $keyFile)) {
                $keyBytes = New-Object byte[] 48
                $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
                try { $random.GetBytes($keyBytes) } finally { $random.Dispose() }
                $secureKey = ConvertTo-SecureString ([Convert]::ToBase64String($keyBytes)) -AsPlainText -Force
                New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
                $secureKey | Export-Clixml -LiteralPath $keyFile
            }
            $secureKey = Import-Clixml -LiteralPath $keyFile
            $env:Jwt__SigningKey = ([System.Management.Automation.PSCredential]::new('jwt', $secureKey)).GetNetworkCredential().Password
        }
        # Sem seeds de senha configurados automaticamente; o startup do backend decide os seeds DEV.
        Write-Host 'Iniciando backend oficial .NET 8: localhost:5054, PostgreSQL localhost/erp_dev.'
        Start-Process dotnet.exe -WindowStyle Hidden -WorkingDirectory $backendRoot -ArgumentList 'run', '--project', 'ERP.Api', '--no-launch-profile', '--urls', 'http://localhost:5054' -RedirectStandardOutput (Join-Path $logDirectory 'api.out.log') -RedirectStandardError (Join-Path $logDirectory 'api.err.log') | Out-Null
    }
    else {
        Write-Host 'Porta 5054 ja esta em uso; mantendo o processo existente.' -ForegroundColor Yellow
    }
    Wait-LocalPort -Port 5054 -ServiceName 'API'

    # Inicia somente Vite; npm run dev tambem acionaria o comando legado de backend.
    if (-not (Test-LocalPort -Port 5173)) {
        $env:VITE_API_URL = 'http://localhost:5054/api'
        Start-Process PowerShell.exe -WindowStyle Hidden -WorkingDirectory $projectRoot -ArgumentList '-NoProfile', '-Command', 'npm.cmd run dev --workspace=@tomazelli/web -- --port 5173 --strictPort' -RedirectStandardOutput (Join-Path $logDirectory 'web.out.log') -RedirectStandardError (Join-Path $logDirectory 'web.err.log') | Out-Null
    }
    else {
        Write-Host 'Frontend ja esta ativo na porta 5173.' -ForegroundColor Yellow
    }
    Wait-LocalPort -Port 5173 -ServiceName 'Frontend'

    # O navegador só é aberto depois que ambos os serviços confirmam disponibilidade local.
    Start-Process 'http://localhost:5173'
    Write-Host 'ERP iniciado com sucesso.' -ForegroundColor Green
}
catch {
    # A mensagem evita imprimir objetos de configuração; detalhes de compilação permanecem nas janelas dos serviços.
    Write-Host 'Nao foi possivel iniciar o ERP. Verifique PostgreSQL, runtime .NET 8 e logs/local. Para informar novamente a senha, execute start-erp-local.cmd -ResetCredential.' -ForegroundColor Red
    Read-Host 'Pressione Enter para fechar' | Out-Null
    exit 1
}
finally {
    $plainPassword = $null
    $securePassword = $null
    $credential = $null
}
