param(
    [ValidateRange(1, 720)]
    [int]$Hours = 72,
    [ValidateRange(1, 5000)]
    [int]$Limit = 500
)

$ErrorActionPreference = 'Stop'
$gcloud = Get-Command gcloud.cmd -ErrorAction SilentlyContinue
if (-not $gcloud) {
    $gcloud = Get-Command gcloud -ErrorAction Stop
}

$filter = @'
resource.type="cloud_run_revision"
resource.labels.service_name="mythoria-webapp"
(httpRequest.userAgent:"Googlebot" OR httpRequest.userAgent:"bingbot" OR httpRequest.userAgent:"OAI-SearchBot" OR httpRequest.userAgent:"GPTBot" OR httpRequest.userAgent:"Claude-SearchBot" OR httpRequest.userAgent:"ClaudeBot" OR httpRequest.userAgent:"PerplexityBot")
'@ -replace "`r?`n", ' AND '

$raw = & $gcloud.Source logging read $filter "--freshness=${Hours}h" "--limit=$Limit" '--format=json'
if ($LASTEXITCODE -ne 0) {
    throw "Cloud Logging query failed with exit code $LASTEXITCODE"
}

$entries = @($raw | ConvertFrom-Json)
if ($entries.Count -eq 0) {
    Write-Output "No matching crawler requests found in the last $Hours hours."
    exit 0
}

$bots = @('Googlebot', 'bingbot', 'OAI-SearchBot', 'GPTBot', 'Claude-SearchBot', 'ClaudeBot', 'PerplexityBot')
$report = foreach ($bot in $bots) {
    $matches = @($entries | Where-Object { $_.httpRequest.userAgent -like "*$bot*" })
    if ($matches.Count -gt 0) {
        [PSCustomObject]@{
            Bot = $bot
            Requests = $matches.Count
            LastSeenUtc = ($matches.timestamp | Sort-Object -Descending | Select-Object -First 1)
            UniqueRemoteIPs = @($matches.httpRequest.remoteIp | Where-Object { $_ } | Sort-Object -Unique).Count
        }
    }
}

$report | Sort-Object Requests -Descending | Format-Table -AutoSize
Write-Output 'Note: user-agent names can be spoofed. Verify remote IPs against each provider official published ranges before treating a request as authentic.'
