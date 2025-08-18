<#
PowerShell deployment script for Mythoria webapp to Google Cloud Run
Usage: .\deploy.ps1 [-Staging] [-NoBuild] [-Help]
#>

[CmdletBinding()]
param(
    [switch]$Staging,
    [switch]$NoBuild,
    [switch]$Help
)

# Treat non-terminating errors as terminating so that try/catch works
$ErrorActionPreference = 'Stop'

# ---- Configuration ----------------------------------------------------------
$PROJECT_ID        = 'oceanic-beach-460916-n5'
$BASE_SERVICE_NAME = 'mythoria-webapp'
$SERVICE_NAME      = if ($Staging) { "$BASE_SERVICE_NAME-staging" } else { $BASE_SERVICE_NAME }
$REGION            = 'europe-west9'
$IMAGE_NAME        = "gcr.io/$PROJECT_ID/$SERVICE_NAME"
# -----------------------------------------------------------------------------

function Show-Help {
    Write-Host "Usage: .\deploy.ps1 [-Staging] [-NoBuild] [-Help]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Staging     Deploy to the staging service ($BASE_SERVICE_NAME-staging)" -ForegroundColor White
    Write-Host "  -NoBuild     Skip the front-end build step (assumes ./dist already exists)" -ForegroundColor White
    Write-Host "  -Help        Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: This script now uses Google Secret Manager for sensitive data." -ForegroundColor Cyan
    Write-Host "Run .\scripts\setup-secrets.ps1 first if you haven't set up secrets yet." -ForegroundColor Cyan
}

# --- Console helpers ---------------------------------------------------------
function Write-Info     { param([string]$Msg) Write-Host "ℹ️  $Msg" -ForegroundColor Blue  }
function Write-Success  { param([string]$Msg) Write-Host "✅ $Msg" -ForegroundColor Green }
function Write-Warn     { param([string]$Msg) Write-Host "⚠️  $Msg" -ForegroundColor Yellow }
function Write-Err      { param([string]$Msg) Write-Host "❌ $Msg" -ForegroundColor Red   }
# -----------------------------------------------------------------------------

# Helper function to get a value from .env.production file
function Get-EnvVariable {
    param (
        [string]$FilePath,
        [string]$VariableName
    )
    $content = Get-Content $FilePath -ErrorAction SilentlyContinue
    if ($null -eq $content) {
        Write-Warn "Warning: Environment file '$FilePath' not found."
        return $null
    }
    foreach ($line in $content) {
        if ($line -match "^\s*$VariableName\s*=\s*(.*)") {
            return $matches[1].Trim()
        }
    }
    return $null
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    try {
        & gcloud --version  | Out-Null
        Write-Success "Google Cloud CLI is available"
    } catch {
        Write-Err "Google Cloud CLI is not installed or not on PATH."
        throw
    }


    try {
        $account = (& gcloud auth list --filter=status:ACTIVE --format="value(account)") | Select-Object -First 1
        if (-not $account) {
            Write-Err "Not authenticated with Google Cloud — run 'gcloud auth login' first."
            throw "Unauthenticated"
        }
        Write-Success "Authenticated as $account"
    } catch {
        throw
    }

    & gcloud config set project $PROJECT_ID | Out-Null
    Write-Success "Using project $PROJECT_ID"
}

function Build-Application {
    if ($NoBuild) {
        Write-Warn "Skipping npm build step"
        return
    }

    Write-Info "Installing node dependencies (npm ci)"
    & npm ci

    Write-Info "Running linter (npm run lint)"
    & npm run lint

    Write-Info "Building production bundle (npm run build)"
    & npm run build

    Write-Success "Front-end build completed"
}

function Deploy-With-CloudBuild {
    Write-Info "Starting Cloud Build submission"
    # Pass service name and region as substitutions
    & gcloud builds submit --config cloudbuild.yaml --substitutions "_SERVICE_NAME=$SERVICE_NAME,_REGION=$REGION"
    Write-Success "Cloud Build finished"
}

function Test-Deployment {
    Write-Info "Fetching service URL"
    $serviceUrl = & gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"

    if ($serviceUrl) {
        Write-Success "Deployment successful!"
        Write-Host ""
        Write-Host "🌐  $serviceUrl" -ForegroundColor Cyan
        Write-Host "🔧  https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Err "Unable to determine service URL"
        throw "Describe failed"
    }
}

function Main {
    if ($Help) { Show-Help; return }

    Write-Host "🚀  Deploying Mythoria ($SERVICE_NAME)..." -ForegroundColor Magenta
    Write-Host ""

    Test-Prerequisites
    Build-Application

    Deploy-With-CloudBuild

    Test-Deployment
    Write-Success "All done ✨"
}

try {
    Main
} catch {
    Write-Err "Deployment failed:`n$($_.Exception.Message)"
    exit 1
}