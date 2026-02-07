Param(
  [string]$ProjectId = "oceanic-beach-460916-n5",
  [string]$Region = "europe-west9",
  [string]$ServiceName = "mythoria-webapp",
  [string]$ExclusionName = "mythoria-webapp-static-noise",
  [string]$Description = "Exclude low-value static asset request logs for Mythoria WebApp"
)

$ErrorActionPreference = "Stop"

$filter = "resource.type=`"cloud_run_revision`" AND resource.labels.service_name=`"$ServiceName`" AND resource.labels.location=`"$Region`" AND severity<=INFO AND (httpRequest.requestUrl:`"/_next/static/`" OR httpRequest.requestUrl:`"/_next/image`" OR httpRequest.requestUrl:`"/favicon.ico`" OR httpRequest.requestUrl:`"/icon-192.png`" OR httpRequest.requestUrl:`"/icon-512.png`" OR httpRequest.requestUrl:`"/manifest`" OR httpRequest.requestUrl:`"/sw.js`" OR httpRequest.requestUrl:`"/SampleBooks/`")"

Write-Host "Applying log exclusion '$ExclusionName' to project '$ProjectId'."

$exclusionsAvailable = $false
try {
  gcloud help logging exclusions | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $exclusionsAvailable = $true
  }
}
catch {
  $exclusionsAvailable = $false
}

if (-not $exclusionsAvailable) {
  Write-Error "The gcloud CLI in this environment does not support 'logging exclusions'. Update the Google Cloud SDK or use the Cloud Console Log Router to create an exclusion using the filter printed below.`n$filter"
  exit 1
}

$exists = $false
try {
  gcloud logging exclusions describe $ExclusionName --project $ProjectId | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $exists = $true
  }
}
catch {
  $exists = $false
}

if ($exists) {
  gcloud logging exclusions update $ExclusionName --project $ProjectId --description $Description --filter $filter | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to update log exclusion '$ExclusionName'."
  }
  Write-Host "Updated log exclusion: $ExclusionName"
}
else {
  gcloud logging exclusions create $ExclusionName --project $ProjectId --description $Description --filter $filter | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create log exclusion '$ExclusionName'."
  }
  Write-Host "Created log exclusion: $ExclusionName"
}
