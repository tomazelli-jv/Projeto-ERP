[CmdletBinding()]
param([string]$ProjectRoot)

$ErrorActionPreference = 'Stop'
$projectRoot = if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { Split-Path -Parent $PSScriptRoot } else { $ProjectRoot.TrimEnd('\', '/') }
$credentialFile = Join-Path $env:LOCALAPPDATA 'TomazelliERP\mariadb-password.clixml'

try {
    if (-not (Test-Path -LiteralPath $credentialFile)) {
        throw 'A credencial local do MariaDB ainda não foi configurada. Execute start-erp-local.cmd primeiro.'
    }

    $securePassword = Import-Clixml -LiteralPath $credentialFile
    $credential = [System.Management.Automation.PSCredential]::new('database', $securePassword)
    $connection = [System.Data.Common.DbConnectionStringBuilder]::new()
    $connection['Server'] = 'srv1438.hstgr.io'
    $connection['Port'] = 3306
    $connection['Database'] = 'u812470838_ERP'
    $connection['User ID'] = 'u812470838_DEV_ERP'
    $connection['Password'] = $credential.GetNetworkCredential().Password
    $connection['SslMode'] = 'Required'
    $env:ConnectionStrings__MariaDb = $connection.ConnectionString

    Set-Location -LiteralPath $projectRoot
    & dotnet run --project backend/tools/ERP.AdminCli -- reset-password
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
catch {
    Write-Error "Não foi possível redefinir a senha: $($_.Exception.Message)"
    exit 1
}
finally {
    $connection = $null
    $credential = $null
    $securePassword = $null
}
