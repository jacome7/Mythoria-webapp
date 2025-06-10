# Fix existing secrets by updating them with properly trimmed values
# Run this script to fix the newline issue in existing secrets

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId
)

# Console helper functions
function Write-Info     { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Blue  }
function Write-Success  { param([string]$Msg) Write-Host "[SUCCESS] $Msg" -ForegroundColor Green }
function Write-Warn     { param([string]$Msg) Write-Host "[WARN] $Msg" -ForegroundColor Yellow }
function Write-Err      { param([string]$Msg) Write-Host "[ERROR] $Msg" -ForegroundColor Red   }

function Import-EnvironmentVariables {
    Write-Info "Loading environment variables from .env.production..."
    
    # Change to project root directory
    Push-Location $PSScriptRoot\..
    
    try {
        $envFile = '.env.production'
        
        if (Test-Path $envFile) {
            Write-Info "Loading environment variables from: $envFile"
            
            # Read and parse the environment file
            Get-Content $envFile | Where-Object { 
                $_.Trim() -and -not $_.StartsWith('#') 
            } | ForEach-Object {
                if ($_ -match '^([^=]+)=(.*)$') {
                    $name = $matches[1].Trim()
                    $value = $matches[2].Trim()
                    
                    # Remove quotes if present
                    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or 
                        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                        $value = $value.Substring(1, $value.Length - 2)
                    }
                    
                    # Set environment variable for current session
                    Set-Item -Path "env:$name" -Value $value
                    Write-Host "  OK Loaded: $name" -ForegroundColor Green
                }
            }
            
            Write-Success "Environment variables loaded from $envFile"
        } else {
            Write-Warn "No .env.production file found. Using command-line parameters only."
        }
    }
    finally {
        Pop-Location
    }
}

# Load environment variables first
Import-EnvironmentVariables

# Use loaded environment variables or command-line parameters
$ProjectId = if ($ProjectId) { $ProjectId } else { $env:GOOGLE_CLOUD_PROJECT_ID }
$DbHost = $env:DB_HOST
$DbUser = $env:DB_USER
$DbPassword = $env:DB_PASSWORD
$ClerkPublishableKey = $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
$ClerkSecretKey = $env:CLERK_SECRET_KEY
$ClerkWebhookSecret = $env:CLERK_WEBHOOK_SECRET
$GaTrackingId = $env:NEXT_PUBLIC_GA_MEASUREMENT_ID

Write-Host "Fixing secrets in Google Cloud Secret Manager for project: $ProjectId" -ForegroundColor Green

# Validate required environment variables
if (-not $ProjectId) {
    Write-Err "ProjectId not found in command-line parameters or GOOGLE_CLOUD_PROJECT_ID in .env.production file."
    exit 1
}

# Display what we're going to update
Write-Info "Values to update (trimmed, no newlines):"
Write-Host "  DB_HOST: '$($DbHost.Trim())'" -ForegroundColor Green
Write-Host "  DB_USER: '$($DbUser.Trim())'" -ForegroundColor Green
Write-Host "  DB_PASSWORD: '$($('*' * $DbPassword.Trim().Length))'" -ForegroundColor Green
Write-Host "  CLERK_PUBLISHABLE_KEY: '$($ClerkPublishableKey.Trim().Substring(0, 20))...'" -ForegroundColor Green
Write-Host "  CLERK_SECRET_KEY: '$($('*' * $ClerkSecretKey.Trim().Length))'" -ForegroundColor Green
Write-Host "  CLERK_WEBHOOK_SECRET: '$($('*' * $ClerkWebhookSecret.Trim().Length))'" -ForegroundColor Green
Write-Host "  GA_MEASUREMENT_ID: '$($GaTrackingId.Trim())'" -ForegroundColor Green

# Set the Google Cloud project
Write-Host "Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $ProjectId

# Update secrets with properly trimmed values
Write-Host "Updating database host secret..." -ForegroundColor Blue
$DbHost.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-db-host --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "Updating database user secret..." -ForegroundColor Blue
$DbUser.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-db-user --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "Updating database password secret..." -ForegroundColor Blue
$DbPassword.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-db-password --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "Updating Clerk publishable key secret..." -ForegroundColor Blue
$ClerkPublishableKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-clerk-publishable-key --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "Updating Clerk secret key secret..." -ForegroundColor Blue
$ClerkSecretKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-clerk-secret-key --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "Updating Clerk webhook secret..." -ForegroundColor Blue
$ClerkWebhookSecret.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-clerk-webhook-secret --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "Updating Google Analytics measurement ID secret..." -ForegroundColor Blue
$GaTrackingId.Trim() | Set-Content -Path temp_secret.txt -NoNewline
gcloud secrets versions add mythoria-ga-measurement-id --data-file=temp_secret.txt
Remove-Item temp_secret.txt

Write-Host "✅ Secrets updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Updated secrets:" -ForegroundColor Cyan
Write-Host "  - mythoria-db-host (new version)" -ForegroundColor White
Write-Host "  - mythoria-db-user (new version)" -ForegroundColor White
Write-Host "  - mythoria-db-password (new version)" -ForegroundColor White
Write-Host "  - mythoria-clerk-publishable-key (new version)" -ForegroundColor White
Write-Host "  - mythoria-clerk-secret-key (new version)" -ForegroundColor White
Write-Host "  - mythoria-clerk-webhook-secret (new version)" -ForegroundColor White
Write-Host "  - mythoria-ga-measurement-id (new version)" -ForegroundColor White

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy the application: gcloud builds submit --config cloudbuild.yaml" -ForegroundColor White
Write-Host "  2. Test the health endpoint: https://mythoria.pt/api/health" -ForegroundColor White
