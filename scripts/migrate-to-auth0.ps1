# PowerShell script to update deployment configurations for Auth0
param(
    [string]$ProjectPath = "c:\Mythoria\mythoria-webapp"
)

Write-Host "Updating deployment configurations from Clerk to Auth0..." -ForegroundColor Green

# Define the search and replace patterns
$patterns = @(
    @{
        Find = "CLERK_"
        Replace = "AUTH0_"
        Description = "Environment variable prefixes"
    },
    @{
        Find = "NEXT_PUBLIC_CLERK_"
        Replace = "AUTH0_"
        Description = "Public Clerk variables"
    }
)

# Files to update
$filesToUpdate = @(
    "cloudbuild.yaml",
    "cloudbuild-production.yaml", 
    "Dockerfile",
    "scripts\deploy.ps1",
    "scripts\deploy-fixed.ps1"
)

foreach ($file in $filesToUpdate) {
    $fullPath = Join-Path $ProjectPath $file
    if (Test-Path $fullPath) {
        Write-Host "Updating $file..." -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw
        $originalContent = $content
        
        foreach ($pattern in $patterns) {
            $content = $content -replace $pattern.Find, $pattern.Replace
        }
        
        if ($content -ne $originalContent) {
            Set-Content $fullPath $content -NoNewline
            Write-Host '  ✓ Updated $file' -ForegroundColor Green
        } else {
            Write-Host '  - No changes needed in $file' -ForegroundColor Gray
        }
    } else {
        Write-Host '  ⚠ File not found: $file' -ForegroundColor Red
    }
}

Write-Host 'Deployment configuration update complete!' -ForegroundColor Green
Write-Host 'Please review the changes and update your environment variables accordingly.' -ForegroundColor Yellow