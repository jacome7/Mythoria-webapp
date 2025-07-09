# Setup Revolut Webhooks for Sandbox and Production
# Run this script to register webhooks with Revolut Merchant API

param(
    [string]$Environment = "sandbox",
    [switch]$ListOnly = $false,
    [switch]$DeleteAll = $false
)

# Configuration
$SandboxApiUrl = "https://sandbox-merchant.revolut.com"
$ProductionApiUrl = "https://merchant.revolut.com"
$ApiVersion = "2024-09-01"

# Webhook URLs
$SandboxWebhookUrl = "https://2c2dc2dd73b7.ngrok-free.app/api/payments/webhook"
$ProductionWebhookUrl = "https://mythoria.pt/api/payments/webhook"  # Update with your production domain

# Events to subscribe to
$WebhookEvents = @(
    "ORDER_COMPLETED",
    "ORDER_PAYMENT_FAILED",
    "ORDER_CANCELLED"
)

function Get-RevolutApiHeaders {
    param(
        [string]$SecretKey
    )
    
    return @{
        "Authorization" = "Bearer $SecretKey"
        "Content-Type" = "application/json"
        "Revolut-Api-Version" = $ApiVersion
    }
}

function Get-Webhooks {
    param(
        [string]$ApiUrl,
        [string]$SecretKey
    )
    
    Write-Host "Listing existing webhooks for $Environment environment..." -ForegroundColor Yellow
    
    try {
        $headers = Get-RevolutApiHeaders -SecretKey $SecretKey
        $response = Invoke-RestMethod -Uri "$ApiUrl/api/1.0/webhooks" -Method GET -Headers $headers
        
        if ($response.Count -eq 0) {
            Write-Host "No webhooks found." -ForegroundColor Green
        } else {
            Write-Host "Found $($response.Count) webhook(s):" -ForegroundColor Green
            foreach ($webhook in $response) {
                Write-Host "  ID: $($webhook.id)" -ForegroundColor Cyan
                Write-Host "  URL: $($webhook.url)" -ForegroundColor Cyan
                Write-Host "  Events: $($webhook.events -join ', ')" -ForegroundColor Cyan
                Write-Host "  Created: $($webhook.created_at)" -ForegroundColor Cyan
                Write-Host "  ---" -ForegroundColor Gray
            }
        }
        
        return $response
    } catch {
        Write-Host "Error listing webhooks: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
        return $null
    }
}

function Remove-AllWebhooks {
    param(
        [string]$ApiUrl,
        [string]$SecretKey
    )
    
    Write-Host "Deleting all webhooks for $Environment environment..." -ForegroundColor Yellow
    
    $webhooks = Get-Webhooks -ApiUrl $ApiUrl -SecretKey $SecretKey
    
    if ($webhooks -and $webhooks.Count -gt 0) {
        foreach ($webhook in $webhooks) {
            try {
                $headers = Get-RevolutApiHeaders -SecretKey $SecretKey
                Invoke-RestMethod -Uri "$ApiUrl/api/1.0/webhooks/$($webhook.id)" -Method DELETE -Headers $headers
                Write-Host "Deleted webhook: $($webhook.id)" -ForegroundColor Green
            } catch {
                Write-Host "Error deleting webhook $($webhook.id): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
}

function New-Webhook {
    param(
        [string]$ApiUrl,
        [string]$SecretKey,
        [string]$WebhookUrl
    )
    
    Write-Host "Creating webhook for $Environment environment..." -ForegroundColor Yellow
    Write-Host "Webhook URL: $WebhookUrl" -ForegroundColor Cyan
    Write-Host "Events: $($WebhookEvents -join ', ')" -ForegroundColor Cyan
    
    $body = @{
        url = $WebhookUrl
        events = $WebhookEvents
    } | ConvertTo-Json
    
    try {
        $headers = Get-RevolutApiHeaders -SecretKey $SecretKey
        $response = Invoke-RestMethod -Uri "$ApiUrl/api/1.0/webhooks" -Method POST -Headers $headers -Body $body
        
        Write-Host "Webhook created successfully!" -ForegroundColor Green
        Write-Host "Webhook ID: $($response.id)" -ForegroundColor Cyan
        Write-Host "Webhook URL: $($response.url)" -ForegroundColor Cyan
        Write-Host "Events: $($response.events -join ', ')" -ForegroundColor Cyan
        Write-Host "Created at: $($response.created_at)" -ForegroundColor Cyan
        
        # Display webhook secret if available
        if ($response.signing_secret) {
            Write-Host ""
            Write-Host "WEBHOOK SECRET CAPTURED!" -ForegroundColor Magenta
            Write-Host "=========================" -ForegroundColor Magenta
            Write-Host "Secret: $($response.signing_secret)" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "IMPORTANT: Add this secret to your .env.local file:" -ForegroundColor Yellow
            Write-Host "REVOLUT_WEBHOOK_SECRET=$($response.signing_secret)" -ForegroundColor Green
            Write-Host ""
            Write-Host "Copy the line above and paste it into your .env.local file" -ForegroundColor Yellow
            Write-Host "Then restart your development server to apply the changes." -ForegroundColor Yellow
        } else {
            Write-Host "Warning: No signing_secret found in response" -ForegroundColor Red
            Write-Host "Response keys: $($response.PSObject.Properties.Name -join ', ')" -ForegroundColor Yellow
        }
        
        return $response
    } catch {
        Write-Host "Error creating webhook: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
            
            # Check if it's a 422 error (max webhooks exceeded)
            if ($_.Exception.Response.StatusCode -eq 422) {
                Write-Host "This might be because you've reached the maximum of 10 webhooks per merchant account." -ForegroundColor Yellow
                Write-Host "Consider deleting unused webhooks first using the -DeleteAll flag." -ForegroundColor Yellow
            }
        }
        return $null
    }
}

# Main script execution
Write-Host "Revolut Webhook Setup Script" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

# Load environment variables based on environment
if ($Environment -eq "production") {
    if (Test-Path ".env.production") {
        Write-Host "Loading environment variables from .env.production..." -ForegroundColor Yellow
        Get-Content ".env.production" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    } else {
        Write-Host "Warning: .env.production not found. Make sure environment variables are set." -ForegroundColor Yellow
    }
} else {
    if (Test-Path ".env.local") {
        Write-Host "Loading environment variables from .env.local..." -ForegroundColor Yellow
        Get-Content ".env.local" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    } else {
        Write-Host "Warning: .env.local not found. Make sure environment variables are set." -ForegroundColor Yellow
    }
}

# Get API credentials based on environment
if ($Environment -eq "sandbox") {
    $ApiUrl = $SandboxApiUrl
    $WebhookUrl = $SandboxWebhookUrl
    $SecretKey = [Environment]::GetEnvironmentVariable("REVOLUT_API_SECRET_KEY")
} else {
    $ApiUrl = $ProductionApiUrl
    $WebhookUrl = $ProductionWebhookUrl
    # For production, use the same variable name as in .env.production
    $SecretKey = [Environment]::GetEnvironmentVariable("REVOLUT_API_SECRET_KEY")
}

if (-not $SecretKey) {
    Write-Host "Error: Secret key not found for $Environment environment." -ForegroundColor Red
    if ($Environment -eq "sandbox") {
        Write-Host "Make sure REVOLUT_API_SECRET_KEY is set in .env.local" -ForegroundColor Red
    } else {
        Write-Host "Make sure REVOLUT_API_SECRET_KEY is set in .env.production" -ForegroundColor Red
    }
    exit 1
}

Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Cyan
Write-Host "Secret Key: $($SecretKey.Substring(0, 8))..." -ForegroundColor Cyan

# Execute requested action
if ($ListOnly) {
    Get-Webhooks -ApiUrl $ApiUrl -SecretKey $SecretKey
} elseif ($DeleteAll) {
    Remove-AllWebhooks -ApiUrl $ApiUrl -SecretKey $SecretKey
} else {
    # First list existing webhooks
    $existingWebhooks = Get-Webhooks -ApiUrl $ApiUrl -SecretKey $SecretKey
    
    # Check if webhook already exists for this URL
    $existingWebhook = $existingWebhooks | Where-Object { $_.url -eq $WebhookUrl }
    
    if ($existingWebhook) {
        Write-Host "Webhook already exists for this URL:" -ForegroundColor Yellow
        Write-Host "  ID: $($existingWebhook.id)" -ForegroundColor Cyan
        Write-Host "  URL: $($existingWebhook.url)" -ForegroundColor Cyan
        Write-Host "  Events: $($existingWebhook.events -join ', ')" -ForegroundColor Cyan
        Write-Host "Skipping creation. Use -DeleteAll to remove existing webhooks first." -ForegroundColor Yellow
    } else {
        # Create new webhook
        New-Webhook -ApiUrl $ApiUrl -SecretKey $SecretKey -WebhookUrl $WebhookUrl
    }
}

Write-Host ""
Write-Host "Script completed." -ForegroundColor Green
Write-Host ""
Write-Host "Usage examples:" -ForegroundColor Yellow
Write-Host "  .\setup-revolut-webhooks.ps1 -Environment sandbox" -ForegroundColor Gray
Write-Host "  .\setup-revolut-webhooks.ps1 -Environment production" -ForegroundColor Gray
Write-Host "  .\setup-revolut-webhooks.ps1 -ListOnly" -ForegroundColor Gray
Write-Host "  .\setup-revolut-webhooks.ps1 -DeleteAll" -ForegroundColor Gray
