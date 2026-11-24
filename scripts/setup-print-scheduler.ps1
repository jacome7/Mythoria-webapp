[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$Project,
  [Parameter(Mandatory)][string]$Region,
  [Parameter(Mandatory)][uri]$WebApp,
  [Parameter(Mandatory)][string]$Audience,
  [Parameter(Mandatory)][string]$SchedulerServiceAccount,
  [string]$JobName = 'paid-print-proof-reconcile'
)
$ErrorActionPreference = 'Stop'
if ($WebApp.Scheme -ne 'https') { throw 'WebApp requires HTTPS.' }
$endpoint = [uri]::new($WebApp, '/api/internal/print/jobs/reconcile').AbsoluteUri
if (-not $PSCmdlet.ShouldProcess("$Project/$Region/$JobName", "Configure proof processing for $endpoint")) { return }
$names = & gcloud scheduler jobs list --project=$Project --location=$Region --format='value(name)'
if ($LASTEXITCODE -ne 0) { throw 'Could not list scheduler jobs.' }
$verb = if ($names -contains "projects/$Project/locations/$Region/jobs/$JobName") { 'update' } else { 'create' }
& gcloud scheduler jobs $verb http $JobName --project=$Project --location=$Region --uri=$endpoint --http-method=POST --schedule='*/5 * * * *' --time-zone=UTC --attempt-deadline=1200s --oidc-service-account-email=$SchedulerServiceAccount --oidc-token-audience=$Audience
if ($LASTEXITCODE -ne 0) { throw 'Could not configure paid print proof processing.' }
