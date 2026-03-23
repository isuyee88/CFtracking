# Start Chrome/Edge with remote debugging
$ErrorActionPreference = "Continue"

Write-Host "Starting Chrome with remote debugging on port 9223..."

# Try Chrome first
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$browserPath = $null
$port = 9223

if (Test-Path $chromePath) {
    $browserPath = $chromePath
    Write-Host "Using Chrome at: $chromePath"
} elseif (Test-Path $edgePath) {
    $browserPath = $edgePath
    $port = 9222
    Write-Host "Using Edge at: $edgePath"
}

if ($browserPath) {
    $userDir = "$env:TEMP\cf-debug-$port"
    if (-not (Test-Path $userDir)) {
        New-Item -ItemType Directory -Path $userDir -Force | Out-Null
    }

    $args = @(
        "--remote-debugging-port=$port",
        "--user-data-dir=$userDir",
        "--no-first-run",
        "--no-default-browser-check"
    )

    Write-Host "Arguments: $($args -join ' ')"
    Write-Host "Starting browser..."

    try {
        $process = Start-Process -FilePath $browserPath -ArgumentList $args -PassThru -WindowStyle Normal
        Write-Host "Browser started with PID: $($process.Id)"
        Start-Sleep -Seconds 3

        # Verify connection
        $response = Invoke-RestMethod -Uri "http://localhost:$port/json/version" -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response) {
            Write-Host "SUCCESS: Connected to browser at http://localhost:$port"
            Write-Host "Browser: $($response.Browser)"
            Write-Host "Protocol: $($response.'Protocol-Version')"
        } else {
            Write-Host "Browser started but connection test timed out (this is normal for first run)"
        }
    } catch {
        Write-Host "Error starting browser: $_"
    }
} else {
    Write-Host "ERROR: No Chrome or Edge found on this system"
}
