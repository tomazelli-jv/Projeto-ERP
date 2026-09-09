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
$credentialFile = Join-Path $credentialDirectory 'mariadb-password.clixml'

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
        [int]$TimeoutSeconds = 45
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-LocalPort -Port $Port) {
            Write-Host "$ServiceName disponível na porta $Port." -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 500
    }
    throw "$ServiceName não respondeu na porta $Port dentro de $TimeoutSeconds segundos. Consulte a janela do serviço."
}

# A senha é persistida pelo DPAPI: somente este usuário do Windows nesta máquina consegue descriptografá-la.
function Get-MariaDbPassword {
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

    Write-Host 'Primeira execução: informe a senha do MariaDB DEV da Hostinger.' -ForegroundColor Cyan
    $securePassword = Read-Host 'Senha do MariaDB' -AsSecureString
    if ($securePassword.Length -eq 0) {
        throw 'A senha do MariaDB não pode ser vazia.'
    }
    New-Item -ItemType Directory -Path $credentialDirectory -Force | Out-Null
    $securePassword | Export-Clixml -LiteralPath $credentialFile
    return $securePassword
}

try {
    Set-Location -LiteralPath $projectRoot
    $securePassword = Get-MariaDbPassword
    $credential = [System.Management.Automation.PSCredential]::new('database', $securePassword)
    $plainPassword = $credential.GetNetworkCredential().Password

    # O builder escapa caracteres especiais da senha sem gravar a connection string em arquivo ou linha de comando.
    $connection = [System.Data.Common.DbConnectionStringBuilder]::new()
    $connection['Server'] = 'srv1438.hstgr.io'
    $connection['Port'] = 3306
    $connection['Database'] = 'u812470838_ERP'
    $connection['User ID'] = 'u812470838_DEV_ERP'
    $connection['Password'] = $plainPassword
    $connection['SslMode'] = 'Required'
    $env:ConnectionStrings__MariaDb = $connection.ConnectionString
    $plainPassword = $null

    # Uma chave efêmera diferente é criada a cada execução e nunca é persistida ou enviada ao Git.
    $keyBytes = New-Object byte[] 48
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $random.GetBytes($keyBytes)
    }
    finally {
        $random.Dispose()
    }
    $env:Authentication__Issuer = 'tomazelli-erp'
    $env:Authentication__Audience = 'tomazelli-erp-web'
    $env:Authentication__SigningKey = [Convert]::ToBase64String($keyBytes)

    # Processos filhos herdam as variáveis apenas em memória; argumentos e títulos não contêm credenciais.
    if (-not (Test-LocalPort -Port 5001)) {
        Start-Process PowerShell.exe -WorkingDirectory $projectRoot -ArgumentList '-NoExit', '-NoProfile', '-Command', 'npm.cmd run dev:api' | Out-Null
    }
    else {
        Write-Host 'API já está ativa na porta 5001.' -ForegroundColor Yellow
    }

    if (-not (Test-LocalPort -Port 5173)) {
        Start-Process PowerShell.exe -WorkingDirectory $projectRoot -ArgumentList '-NoExit', '-NoProfile', '-Command', 'npm.cmd run dev:web' | Out-Null
    }
    else {
        Write-Host 'Frontend já está ativo na porta 5173.' -ForegroundColor Yellow
    }

    Wait-LocalPort -Port 5001 -ServiceName 'API'
    Wait-LocalPort -Port 5173 -ServiceName 'Frontend'

    # O navegador só é aberto depois que ambos os serviços confirmam disponibilidade local.
    Start-Process 'http://localhost:5173'
    Write-Host 'ERP iniciado com sucesso.' -ForegroundColor Green
}
catch {
    # A mensagem evita imprimir objetos de configuração; detalhes de compilação permanecem nas janelas dos serviços.
    Write-Error "Não foi possível iniciar o ERP: $($_.Exception.Message)"
    exit 1
}
finally {
    $plainPassword = $null
    $securePassword = $null
    $credential = $null
}
