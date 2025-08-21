# Setup Google Cloud Secret Manager secrets for Mythoria deployment
# Run this script to create the required secrets in Google Cloud Secret Manager

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId,
    
    [Parameter(Mandatory=$false)]
    [string]$DbHost,
    
    [Parameter(Mandatory=$false)]
    [string]$DbUser,
    
    [Parameter(Mandatory=$false)]
    [string]$DbPassword
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

# Use loaded environment variables or command-line parameters (parameters take precedence)
$ProjectId = if ($ProjectId) { $ProjectId } else { $env:GOOGLE_CLOUD_PROJECT_ID }
$DbHost = if ($DbHost) { $DbHost } else { $env:DB_HOST }
$DbUser = if ($DbUser) { $DbUser } else { $env:DB_USER }
$DbPassword = if ($DbPassword) { $DbPassword } else { $env:DB_PASSWORD }

# Additional secrets from environment
$ClerkPublishableKey = $env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
$ClerkSecretKey = $env:CLERK_SECRET_KEY
$ClerkWebhookSecret = $env:CLERK_WEBHOOK_SECRET
$GaTrackingId = $env:NEXT_PUBLIC_GA_MEASUREMENT_ID
$StoryGenApiKey = $env:STORY_GENERATION_WORKFLOW_API_KEY
$AdminApiKey = $env:ADMIN_API_KEY
$NotificationApiKey = $env:NOTIFICATION_ENGINE_API_KEY

Write-Host "Setting up Google Cloud Secret Manager secrets for project: $ProjectId" -ForegroundColor Green

# Validate required environment variables
if (-not $ProjectId) {
    Write-Err "ProjectId not found in command-line parameters or GOOGLE_CLOUD_PROJECT_ID in .env.production file."
    exit 1
}
if (-not $DbHost) {
    Write-Err "DB_HOST not found in .env.production file or command-line parameters."
    exit 1
}
if (-not $DbUser) {
    Write-Err "DB_USER not found in .env.production file or command-line parameters."
    exit 1
}
if (-not $DbPassword) {
    Write-Err "DB_PASSWORD not found in .env.production file or command-line parameters."
    exit 1
}
if (-not $ClerkPublishableKey) {
    Write-Err "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found in .env.production file."
    exit 1
}
if (-not $ClerkSecretKey) {
    Write-Err "CLERK_SECRET_KEY not found in .env.production file."
    exit 1
}
if (-not $ClerkWebhookSecret) {
    Write-Err "CLERK_WEBHOOK_SECRET not found in .env.production file."
    exit 1
}
if (-not $GaTrackingId) {
    Write-Err "NEXT_PUBLIC_GA_MEASUREMENT_ID not found in .env.production file."
    exit 1
}
if (-not $StoryGenApiKey) {
    Write-Err "STORY_GENERATION_WORKFLOW_API_KEY not found in .env.production file."
    exit 1
}
if (-not $AdminApiKey) {
    Write-Err "ADMIN_API_KEY not found in .env.production file."
    exit 1
}
if (-not $NotificationApiKey) {
    Write-Err "NOTIFICATION_ENGINE_API_KEY not found in .env.production file."
    exit 1
}

# Display loaded configuration
Write-Info "Configuration loaded:"
Write-Host "  OK DB_HOST: $DbHost" -ForegroundColor Green
Write-Host "  OK DB_USER: $DbUser" -ForegroundColor Green
Write-Host "  OK DB_PASSWORD: $($('*' * $DbPassword.Length))" -ForegroundColor Green
Write-Host "  OK CLERK_PUBLISHABLE_KEY: $($ClerkPublishableKey.Substring(0, 20))..." -ForegroundColor Green
Write-Host "  OK CLERK_SECRET_KEY: $($('*' * $ClerkSecretKey.Length))" -ForegroundColor Green
Write-Host "  OK CLERK_WEBHOOK_SECRET: $($('*' * $ClerkWebhookSecret.Length))" -ForegroundColor Green
Write-Host "  OK GA_MEASUREMENT_ID: $GaTrackingId" -ForegroundColor Green
Write-Host "  OK STORY_GENERATION_API_KEY: $($('*' * $StoryGenApiKey.Length))" -ForegroundColor Green
Write-Host "  OK ADMIN_API_KEY: $($('*' * $AdminApiKey.Length))" -ForegroundColor Green
Write-Host "  OK NOTIFICATION_API_KEY: $($('*' * $NotificationApiKey.Length))" -ForegroundColor Green

# Set the Google Cloud project
Write-Host "Setting Google Cloud project..." -ForegroundColor Blue
gcloud config set project $ProjectId

# Enable Secret Manager API if not already enabled
Write-Host "Enabling Secret Manager API..." -ForegroundColor Blue
gcloud services enable secretmanager.googleapis.com

# Create secrets (ensure no trailing newlines)
Write-Host "Creating database host secret..." -ForegroundColor Blue
$DbHost.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-db-host --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating database user secret..." -ForegroundColor Blue
$DbUser.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-db-user --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating database password secret..." -ForegroundColor Blue
$DbPassword.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-db-password --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Clerk publishable key secret..." -ForegroundColor Blue
$ClerkPublishableKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-clerk-publishable-key --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Clerk secret key secret..." -ForegroundColor Blue
$ClerkSecretKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-clerk-secret-key --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Clerk webhook secret..." -ForegroundColor Blue
$ClerkWebhookSecret.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-clerk-webhook-secret --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Google Analytics measurement ID secret..." -ForegroundColor Blue
$GaTrackingId.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create mythoria-ga-measurement-id --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Story Generation API key secret..." -ForegroundColor Blue
$StoryGenApiKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create STORY_GENERATION_WORKFLOW_API_KEY --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Admin API key secret..." -ForegroundColor Blue
$AdminApiKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create ADMIN_API_KEY --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

Write-Host "Creating Notification Engine API key secret..." -ForegroundColor Blue
$NotificationApiKey.Trim() | Set-Content -Path temp_secret.txt -NoNewline; gcloud secrets create NOTIFICATION_ENGINE_API_KEY --data-file=temp_secret.txt --replication-policy='automatic'; Remove-Item temp_secret.txt

# Grant permissions to Cloud Build service account
Write-Host "Granting permissions to Cloud Build service account..." -ForegroundColor Blue
$projectNumber = (gcloud projects describe $ProjectId --format='value(projectNumber)')
$cloudBuildServiceAccount = "$projectNumber@cloudbuild.gserviceaccount.com"

gcloud secrets add-iam-policy-binding mythoria-db-host --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-db-user --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-db-password --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-clerk-publishable-key --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-clerk-secret-key --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-clerk-webhook-secret --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-ga-measurement-id --member="serviceAccount:$cloudBuildServiceAccount" --role="roles/secretmanager.secretAccessor"

# Grant permissions to Cloud Run service account (Compute Engine default)
Write-Host "Granting permissions to Cloud Run service account..." -ForegroundColor Blue
$computeServiceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding mythoria-db-host --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-db-user --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-db-password --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-clerk-publishable-key --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-clerk-secret-key --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-clerk-webhook-secret --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding mythoria-ga-measurement-id --member="serviceAccount:$computeServiceAccount" --role="roles/secretmanager.secretAccessor"


Write-Host "✅ Secrets setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Created secrets:" -ForegroundColor Cyan
Write-Host "  - mythoria-db-host" -ForegroundColor White
Write-Host "  - mythoria-db-user" -ForegroundColor White
Write-Host "  - mythoria-db-password" -ForegroundColor White
Write-Host "  - mythoria-clerk-publishable-key" -ForegroundColor White
Write-Host "  - mythoria-clerk-secret-key" -ForegroundColor White
Write-Host "  - mythoria-clerk-webhook-secret" -ForegroundColor White
Write-Host "  - mythoria-ga-measurement-id" -ForegroundColor White

Write-Host ""
Write-Host "To verify secrets were created, run:" -ForegroundColor Cyan
Write-Host "  gcloud secrets list" -ForegroundColor White
Write-Host ""
Write-Host "To update a secret value later, run:" -ForegroundColor Cyan
Write-Host "  'NEW_VALUE' | Set-Content -Path temp.txt -NoNewline; gcloud secrets versions add SECRET_NAME --data-file=temp.txt; Remove-Item temp.txt" -ForegroundColor White
