Param(
    [string]$ProjectId = "oceanic-beach-460916-n5",
    [string]$Region = "europe-west9",
    [string]$ServiceName = "mythoria-webapp",
    [int]$Limit = 200,
    [switch]$Follow,
    [string]$OutFile
)

$ErrorActionPreference = "Stop"

# Resolve repository root and logs directory
$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$logsDir = Join-Path $repoRoot "logs"
$logFilter = "resource.type=`"cloud_run_revision`" AND resource.labels.service_name=`"$ServiceName`" AND resource.labels.location=`"$Region`""
if (-not (Test-Path -Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Default output file if not following
if (-not $Follow) {
    if ([string]::IsNullOrWhiteSpace($OutFile)) {
        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $OutFile = Join-Path $logsDir ("cloudrun-" + $ServiceName + "-" + $timestamp + ".json")
    }
}

Write-Host "Reading logs for Cloud Run service '$ServiceName' in region '$Region' (project '$ProjectId')."

$logCommand = "read"
if ($Follow) {
    $logCommand = "tail"
}

$baseArgs = @(
    "run", "services", "logs",
    $logCommand,
    $ServiceName,
    "--region", $Region,
    "--project", $ProjectId
)

$commandSucceeded = $true
$primaryErrorMessage = $null
$errorsFile = $null

function Get-ErrorLogPath {
    param([string]$BaseLogPath)

    if ([string]::IsNullOrWhiteSpace($BaseLogPath)) {
        return $null
    }

    $directory = Split-Path -Path $BaseLogPath -Parent
    $fileBase = [System.IO.Path]::GetFileNameWithoutExtension($BaseLogPath)
    $extension = [System.IO.Path]::GetExtension($BaseLogPath)

    return (Join-Path $directory ($fileBase + "_errors" + $extension))
}

function Write-ErrorLogs {
    param(
        [string]$BaseLogPath,
        [string]$ErrorLogPath
    )

    if (-not (Test-Path -Path $BaseLogPath)) {
        return
    }

    $errorSeverities = @("ERROR", "CRITICAL", "ALERT", "EMERGENCY")
    $errorPattern = "\\b(" + ($errorSeverities -join "|") + ")\\b"
    $rawContent = Get-Content -Path $BaseLogPath -Raw
    $errors = @()

    if (-not [string]::IsNullOrWhiteSpace($rawContent)) {
        try {
            $parsed = $rawContent | ConvertFrom-Json -ErrorAction Stop
            $entries = @($parsed)

            $errors = $entries | Where-Object {
                $severity = $_.severity
                $severity -and ($errorSeverities -contains $severity.ToString().ToUpperInvariant())
            }
        }
        catch {
            $errors = (Get-Content -Path $BaseLogPath) | Where-Object { $_ -match $errorPattern }
        }
    }

    $errors | ConvertTo-Json -Depth 100 | Set-Content -Path $ErrorLogPath
    Write-Host "Saved error logs to: $ErrorLogPath"
}

try {
    if ($Follow) {
        Write-Host "Streaming logs (press Ctrl+C to stop)..."
        gcloud @baseArgs
        if ($LASTEXITCODE -ne 0) {
            $commandSucceeded = $false
        }
    }
    else {
        $readArgs = $baseArgs + @("--limit", $Limit, "--format", "json")
        gcloud @readArgs 2>&1 | Tee-Object -FilePath $OutFile | Out-Null
        if ($LASTEXITCODE -ne 0) {
            $commandSucceeded = $false
        }
        else {
            Write-Host "Saved logs to: $OutFile"
            $errorsFile = Get-ErrorLogPath -BaseLogPath $OutFile
            if ($errorsFile) {
                Write-ErrorLogs -BaseLogPath $OutFile -ErrorLogPath $errorsFile
            }
        }
    }
}
catch {
    $commandSucceeded = $false
    $primaryErrorMessage = $_.Exception.Message
}

if (-not $commandSucceeded) {
    if ($primaryErrorMessage) {
        Write-Warning "Cloud Run logs command failed: $primaryErrorMessage"
    }
    else {
        Write-Warning "Cloud Run logs command failed with exit code $LASTEXITCODE"
    }

    try {
        if ($Follow) {
            $fallbackArgs = @(
                "logging", "tail", $logFilter,
                "--project", $ProjectId,
                "--format", "json"
            )
            gcloud @fallbackArgs
        }
        else {
            $fallbackArgs = @(
                "logging", "read", $logFilter,
                "--project", $ProjectId,
                "--limit", $Limit,
                "--format", "json"
            )
            gcloud @fallbackArgs 2>&1 | Tee-Object -FilePath $OutFile | Out-Null
            Write-Host "Saved logs to: $OutFile (Cloud Logging fallback)"
            $errorsFile = Get-ErrorLogPath -BaseLogPath $OutFile
            if ($errorsFile) {
                Write-ErrorLogs -BaseLogPath $OutFile -ErrorLogPath $errorsFile
            }
        }
        if ($LASTEXITCODE -ne 0) {
            throw "Cloud Logging fallback command failed."
        }
    }
    catch {
        Write-Error "Failed to read logs. Ensure the Google Cloud SDK (gcloud) is installed, you're authenticated, and you have access to the project. Error: $($_.Exception.Message)"
        exit 1
    }
}
