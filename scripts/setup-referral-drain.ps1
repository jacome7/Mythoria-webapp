# Enables automatic referral follow-up delivery, including already queued invitations.
# Review pending work and obtain delivery approval before running for the first time.
param(
  [string]$ProjectId = 'oceanic-beach-460916-n5',
  [string]$Region = 'europe-west9',
  [string]$Audience = 'https://mythoria-webapp-x2qrlilyyq-od.a.run.app',
  [string]$ServiceAccount = 'analytics-scheduler@oceanic-beach-460916-n5.iam.gserviceaccount.com'
)
$ErrorActionPreference = 'Stop'
$jobName = 'mythoria-referral-outbox-drain'
$existing = & gcloud.cmd scheduler jobs list "--project=$ProjectId" "--location=$Region" --format=json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect Scheduler jobs' }
$found = $existing | Where-Object { $_.name -like "*/$jobName" }
$operation = if ($found) { 'update' } else { 'create' }
& gcloud.cmd scheduler jobs $operation http $jobName "--project=$ProjectId" "--location=$Region" '--schedule=*/5 * * * *' '--time-zone=Europe/Lisbon' "--uri=$Audience/api/internal/referrals/jobs/drain" '--http-method=POST' "--oidc-service-account-email=$ServiceAccount" "--oidc-token-audience=$Audience" '--attempt-deadline=300s' --quiet
if ($LASTEXITCODE -ne 0) { throw 'Cannot configure referral drain schedule' }
if ($found.state -eq 'PAUSED') {
  & gcloud.cmd scheduler jobs resume $jobName "--project=$ProjectId" "--location=$Region" --quiet
  if ($LASTEXITCODE -ne 0) { throw 'Cannot resume referral drain schedule' }
}
& gcloud.cmd scheduler jobs describe $jobName "--project=$ProjectId" "--location=$Region" '--format=json(name,state,schedule,timeZone,httpTarget.uri,httpTarget.oidcToken)'
if ($LASTEXITCODE -ne 0) { throw 'Cannot verify referral drain schedule' }
