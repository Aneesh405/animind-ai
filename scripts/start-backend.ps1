$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $projectRoot 'backend'
$environmentPython = Join-Path $backendDirectory '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $environmentPython)) {
    throw 'Run scripts\setup.ps1 first to create the Python environment.'
}

& $environmentPython -m uvicorn main:app --app-dir $backendDirectory --reload-dir $backendDirectory --host 127.0.0.1 --port 8000 --reload
