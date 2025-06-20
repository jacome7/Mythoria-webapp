# Test script to publish a message to Google Cloud Pub/Sub
# This script publishes a test message to trigger the story generation workflow

param(
    [string]$ProjectId = "oceanic-beach-460916-n5",
    [string]$TopicName = "mythoria-story-requests",
    [string]$RunId = "d531170e-0772-4221-9df3-d75f030af9d5",
    [string]$StoryId = "c8591039-2745-4082-b48f-317c483c2c20"
)

# Check if gcloud CLI is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Google Cloud CLI (gcloud) is not installed or not in PATH"
    Write-Host "Please install gcloud CLI from: https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Check if authenticated
$authCheck = gcloud auth list --format="value(account)" --filter="status:ACTIVE" 2>$null
if (-not $authCheck) {
    Write-Error "Not authenticated with Google Cloud"
    Write-Host "Please run: gcloud auth login"
    exit 1
}

# Set the project
Write-Host "Setting Google Cloud project to: $ProjectId"
gcloud config set project $ProjectId

# Get current timestamp in ISO format
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Create the message payload - manual JSON formatting to ensure validity
$messagePayload = "{`"runId`":`"$RunId`",`"storyId`":`"$StoryId`",`"timestamp`":`"$timestamp`"}"

Write-Host "Publishing message to topic: $TopicName"
Write-Host "Message payload: $messagePayload"

# Publish the message
try {
    $result = gcloud pubsub topics publish $TopicName --message="$messagePayload" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Message published successfully!" -ForegroundColor Green
        Write-Host "Message ID: $result"
        Write-Host ""
        Write-Host "You can check the Pub/Sub subscription or workflow logs to see if the message was processed."
    } else {
        Write-Error "Failed to publish message: $result"
        exit 1
    }
} catch {
    Write-Error "Error publishing message: $_"
    exit 1
}

# Optional: List recent messages (if you have a subscription)
Write-Host ""
Write-Host "To check if messages are being processed, you can:"
Write-Host "1. Check Google Cloud Console -> Pub/Sub -> Topics -> $TopicName"
Write-Host "2. Check Google Cloud Console -> Workflows (if using Cloud Workflows)"
Write-Host "3. Check Cloud Run logs (if using Cloud Run)"
Write-Host "4. Run: gcloud pubsub subscriptions pull <subscription-name> --limit=5"
