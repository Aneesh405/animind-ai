$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentPath = Join-Path $projectRoot 'backend\.env'
$examplePath = Join-Path $projectRoot 'backend\.env.example'

function Set-DotEnvValue {
    param([string]$Content, [string]$Name, [string]$Value)

    $escapedValue = $Value.Replace('\', '\\').Replace("'", "\'")
    $entry = "$Name='$escapedValue'"
    $pattern = '(?m)^[ \t]*' + [regex]::Escape($Name) + '[ \t]*=.*$'
    if ([regex]::IsMatch($Content, $pattern)) {
        return [regex]::Replace($Content, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($match) $entry })
    }
    return $Content.TrimEnd() + "`r`n" + $entry + "`r`n"
}

$modelId = (Read-Host 'Gemini model ID available to your account, for example gemini-3.8-flash').Trim()
if ([string]::IsNullOrWhiteSpace($modelId)) {
    throw 'Enter an available text model ID.'
}
$secureKey = Read-Host 'Gemini API key (input is masked)' -AsSecureString
$keyPointer = [IntPtr]::Zero
$plainKey = $null

try {
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer).Trim()
    if ([string]::IsNullOrWhiteSpace($plainKey)) {
        throw 'The API key was empty. Configuration was not saved.'
    }

    $sourcePath = if (Test-Path -LiteralPath $environmentPath) { $environmentPath } else { $examplePath }
    $configuration = [IO.File]::ReadAllText($sourcePath, [Text.Encoding]::UTF8)
    $configuration = Set-DotEnvValue $configuration 'GEMINI_API_KEY' $plainKey
    $configuration = Set-DotEnvValue $configuration 'GEMINI_MODEL' $modelId
    [IO.File]::WriteAllText($environmentPath, $configuration, [Text.UTF8Encoding]::new($false))
}
finally {
    $plainKey = $null
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }
    $secureKey.Dispose()
}

Write-Output 'Gemini settings saved to backend/.env. Restart the backend to load them.'
