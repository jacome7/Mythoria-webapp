Param(
    [string]$ProjectId = "oceanic-beach-460916-n5",
    [string]$Region = "europe-west9",
    [string]$ServiceName = "mythoria-webapp",
    [int]$Limit = 10,
    [string]$OutFile
)

$ErrorActionPreference = "Stop"

# Resolve repository root and logs directory
$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$logsDir = Join-Path $repoRoot "logs"
if (-not (Test-Path -Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Default output file if not provided
if (-not $OutFile -or $OutFile.Trim() -eq "") {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutFile = Join-Path $logsDir ("cloudrun-" + $ServiceName + "-" + $timestamp + ".json")
}

Write-Host "Reading latest $Limit logs for Cloud Run service '$ServiceName' in region '$Region' (project '$ProjectId')."

try {
    $args = @(
        "run", "services", "logs", "read", $ServiceName,
        "--region", $Region,
        "--project", $ProjectId,
        "--limit", $Limit,
        "--format", "json"
    )

    # Execute gcloud and tee output to file
    gcloud @args 2>&1 | Tee-Object -FilePath $OutFile

    Write-Host "Saved logs to: $OutFile"
}
catch {
    Write-Error "Failed to read logs. Ensure the Google Cloud SDK (gcloud) is installed, you're authenticated, and you have access to the project. Error: $($_.Exception.Message)"
    exit 1
}
