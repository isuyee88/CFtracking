param(
  [switch]$CheckOnly,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Command
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[network-bootstrap] $Message" -ForegroundColor Cyan
}

function Invoke-WithRetry {
  param(
    [scriptblock]$Action,
    [int]$MaxAttempts = 3,
    [int]$DelaySeconds = 2
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      & $Action
      return
    } catch {
      if ($attempt -ge $MaxAttempts) {
        throw
      }
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$dnsBootstrap = Join-Path $repoRoot ".wrangler-dns-bootstrap.cjs"

if (-not (Test-Path $dnsBootstrap)) {
  throw "Missing DNS bootstrap file: $dnsBootstrap"
}

if ([string]::IsNullOrWhiteSpace($env:NODE_OPTIONS)) {
  $env:NODE_OPTIONS = "--require=$dnsBootstrap"
} elseif ($env:NODE_OPTIONS -notlike "*$dnsBootstrap*") {
  $env:NODE_OPTIONS = "$($env:NODE_OPTIONS) --require=$dnsBootstrap"
}

Write-Step "NODE_OPTIONS prepared for Node-based CLI tools."

if (-not $CheckOnly) {
  Write-Step "Applying resilient Git transport config..."
  git config --global http.version HTTP/1.1
  git config --global http.maxRequests 5
}

Write-Step "Running GitHub connectivity checks..."

Invoke-WithRetry -Action { git ls-remote https://github.com/git/git HEAD | Out-Null }
Invoke-WithRetry -Action { git ls-remote https://github.com/isuyee88/CFtracking.git HEAD | Out-Null }
Invoke-WithRetry -Action { curl.exe -sS -I --max-time 20 https://api.github.com | Out-Null }

Write-Step "All checks passed."
Write-Host ""
Write-Host "Effective runtime values:" -ForegroundColor Green
Write-Host "NODE_OPTIONS=$env:NODE_OPTIONS"
Write-Host "Note: NODE_OPTIONS above is active only inside this script process."
Write-Host "git http.version=$(git config --global --get http.version)"
Write-Host "git http.maxRequests=$(git config --global --get http.maxRequests)"

if ($Command.Count -gt 0) {
  Write-Host ""
  Write-Step ("Executing command with prepared network env: " + ($Command -join " "))
  $cmd = $Command[0]
  $args = @()
  if ($Command.Count -gt 1) {
    $args = $Command[1..($Command.Count - 1)]
  }
  & $cmd @args
  exit $LASTEXITCODE
}
