$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $projectRoot 'backend'
$frontendDirectory = Join-Path $projectRoot 'frontend'
$environmentPython = Join-Path $backendDirectory '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $environmentPython)) {
    python -m venv (Join-Path $backendDirectory '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python virtual environment.' }
}

& $environmentPython -m pip install -r (Join-Path $backendDirectory 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }

Push-Location $frontendDirectory
try {
    Write-Output 'Installing frontend dependencies. This can take a few minutes on Windows.'
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
}
finally {
    Pop-Location
}

$backendEnvironment = Join-Path $backendDirectory '.env'
if (-not (Test-Path -LiteralPath $backendEnvironment)) {
    Copy-Item -LiteralPath (Join-Path $backendDirectory '.env.example') -Destination $backendEnvironment
}
$frontendEnvironment = Join-Path $frontendDirectory '.env.local'
if (-not (Test-Path -LiteralPath $frontendEnvironment)) {
    Copy-Item -LiteralPath (Join-Path $frontendDirectory '.env.local.example') -Destination $frontendEnvironment
}

Write-Output 'Setup complete. Demo mode is ready without credentials.'
Write-Output 'Start the backend and frontend in two terminals using scripts\start-backend.ps1 and scripts\start-frontend.ps1.'
