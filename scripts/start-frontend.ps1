$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDirectory = Join-Path $projectRoot 'frontend'

if (-not (Test-Path -LiteralPath (Join-Path $frontendDirectory 'node_modules\next'))) {
    throw 'Run scripts\setup.ps1 first to install frontend dependencies.'
}

Push-Location $frontendDirectory
try {
    npm run dev -- --hostname 127.0.0.1 --port 3000
}
finally {
    Pop-Location
}
