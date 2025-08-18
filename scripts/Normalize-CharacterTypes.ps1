$ErrorActionPreference = 'Stop'

# Paths
$RepoRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $RepoRoot '.env.local'
$PsqlPath = 'c:\Mythoria\pgsql\bin\psql.exe'

if (-not (Test-Path -LiteralPath $PsqlPath)) {
  Write-Error "psql.exe not found at $PsqlPath. Please ensure PostgreSQL client is available."
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  Write-Error ".env.local not found at $EnvFile"
}

# Load DB_* vars from .env.local
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -match '^(#|$)') { return }
  if ($line -match '^([^=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Trim('"') }
    elseif ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Trim("'") }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
}

$HostName = $env:DB_HOST
$Port = $env:DB_PORT
$User = $env:DB_USER
$Db   = $env:DB_NAME
$Password = $env:DB_PASSWORD

if (-not $HostName -or -not $Port -or -not $User -or -not $Db) {
  Write-Error 'Missing one or more DB_* environment variables. Check .env.local.'
}

Write-Host ("Connecting to {0}:{1} database {2} as {3}" -f $HostName, $Port, $Db, $User)

$env:PGPASSWORD = $Password

$sql = @"
-- Normalize characters.type values to the allowed enum set used by migrations
UPDATE "characters"
SET "type" = CASE
  WHEN lower("type") IN ('woman','women') THEN 'Woman'
  WHEN lower("type") IN ('man','men') THEN 'Man'
  WHEN lower("type") IN ('girl','girls') THEN 'Girl'
  WHEN lower("type") IN ('boy','boys') THEN 'Boy'
  WHEN lower("type") IN ('dog','dogs','puppy','puppies') THEN 'Dog'
  WHEN lower("type") IN ('dragon','dragons') THEN 'Dragon'
  WHEN lower("type") IN ('animal','animals','cat','cats','bird','birds','fish','fishes','horse','horses','cow','cows','lion','lions','tiger','tigers') THEN 'Animal'
  WHEN lower("type") IN ('fantasy creature','fantasy_creature','creature','monsters','monster','goblin','goblins','elf','elves','dwarf','dwarves','fairy','fairies') THEN 'Fantasy Creature'
  WHEN lower("type") IN ('baby','babies','toddler','toddlers','infant','infants') THEN 'Baby'
  WHEN lower("type") IN ('human') THEN 'Other'
  ELSE "type"
END
WHERE "type" IS NOT NULL;

UPDATE "characters"
SET "type" = 'Other'
WHERE "type" IS NOT NULL
  AND "type" NOT IN ('Boy', 'Girl', 'Baby', 'Man', 'Woman', 'Dog', 'Dragon', 'Fantasy Creature', 'Animal', 'Other');
"@

& $PsqlPath -h $HostName -p $Port -U $User -d $Db -v ON_ERROR_STOP=1 -c "SELECT DISTINCT type FROM characters WHERE type IS NOT NULL ORDER BY 1;" | Out-Host
& $PsqlPath -h $HostName -p $Port -U $User -d $Db -v ON_ERROR_STOP=1 -c $sql | Out-Host
& $PsqlPath -h $HostName -p $Port -U $User -d $Db -v ON_ERROR_STOP=1 -c "SELECT DISTINCT type FROM characters WHERE type IS NOT NULL ORDER BY 1;" | Out-Host

Write-Host 'Normalization completed.'
