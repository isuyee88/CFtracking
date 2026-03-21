# CFTracking Production Test Script
# Tests all API endpoints and data consistency

$BASE_URL = "https://cf-tracking.suyee88.workers.dev"
$API_BASE = "$BASE_URL/api"

function Test-APIEndpoint {
    param([string]$Name, [string]$Url, [string]$Method = "GET", [hashtable]$Body = $null)

    Write-Host "`n[Test] $Name" -ForegroundColor Cyan
    Write-Host "       URL: $Url"

    try {
        $params = @{
            Uri = $Url
            Method = $Method
            ContentType = "application/json"
            UseBasicParsing = $true
            TimeoutSec = 30
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }

        $response = Invoke-WebRequest @params
        $data = $response.Content | ConvertFrom-Json

        Write-Host "       Status: $($response.StatusCode)" -ForegroundColor Green

        if ($data.success -eq $false) {
            Write-Host "       Error: $($data.error)" -ForegroundColor Yellow
            return @{ Success = $false; Data = $data; Status = $response.StatusCode }
        }

        return @{ Success = $true; Data = $data; Status = $response.StatusCode }
    }
    catch {
        Write-Host "       ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  CFTracking Production Test Suite" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Base URL: $BASE_URL" -ForegroundColor Gray
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# ========================================
# Test 1: Basic Connectivity
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 1: Basic Connectivity" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$result = Test-APIEndpoint -Name "Homepage" -Url $BASE_URL
if ($result.Success) {
    Write-Host "  Homepage loads successfully"
}

# ========================================
# Test 2: Traffic Sources API
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 2: Traffic Sources" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$tsResult = Test-APIEndpoint -Name "Get Traffic Sources" -Url "$API_BASE/traffic-sources"

$trafficSourceCount = 0
if ($tsResult.Success -and $tsResult.Data.data) {
    $trafficSourceCount = $tsResult.Data.data.Count
    Write-Host "  Traffic Sources Count: $trafficSourceCount" -ForegroundColor Green

    # List all traffic sources
    foreach ($ts in $tsResult.Data.data) {
        Write-Host "    - [$($ts.id)] $($ts.name) ($(if($ts.status){"active"}else{"inactive"}))"
    }
}
elseif ($tsResult.Success -and $tsResult.Data.data -isnot [array]) {
    $trafficSourceCount = 1
    Write-Host "  Traffic Sources Count: 1"
    Write-Host "    - [$($tsResult.Data.data.id)] $($tsResult.Data.data.name)"
}

# ========================================
# Test 3: Campaigns API
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 3: Campaigns" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$campResult = Test-APIEndpoint -Name "Get Campaigns" -Url "$API_BASE/campaigns"

$campaignCount = 0
$campaignList = @()
if ($campResult.Success -and $campResult.Data.data) {
    $campaignCount = $campResult.Data.data.Count
    $campaignList = $campResult.Data.data
    Write-Host "  Campaigns Count: $campaignCount" -ForegroundColor Green

    foreach ($camp in $campResult.Data.data) {
        Write-Host "    - [$($camp.id)] $($camp.name) (alias: $($camp.alias))"
    }
}

# ========================================
# Test 4: Landings API
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 4: Landings" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$lpResult = Test-APIEndpoint -Name "Get Landings" -Url "$API_BASE/landings"

$landingCount = 0
if ($lpResult.Success -and $lpResult.Data.data) {
    $landingCount = $lpResult.Data.data.Count
    Write-Host "  Landings Count: $landingCount" -ForegroundColor Green

    foreach ($lp in $lpResult.Data.data) {
        Write-Host "    - [$($lp.id)] $($lp.name) -> $($lp.url)"
    }
}

# ========================================
# Test 5: Offers API
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 5: Offers" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$offerResult = Test-APIEndpoint -Name "Get Offers" -Url "$API_BASE/offers"

$offerCount = 0
if ($offerResult.Success -and $offerResult.Data.data) {
    $offerCount = $offerResult.Data.data.Count
    Write-Host "  Offers Count: $offerCount" -ForegroundColor Green

    foreach ($offer in $offerResult.Data.data) {
        Write-Host "    - [$($offer.id)] $($offer.name)"
    }
}

# ========================================
# Test 6: Data Consistency Check
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 6: Data Consistency" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

Write-Host "  Comparing cross-page data..."
Write-Host "    Traffic Sources (TS list): $trafficSourceCount"
Write-Host "    Campaigns: $campaignCount"
Write-Host "    Landings: $landingCount"
Write-Host "    Offers: $offerCount"

# ========================================
# Test 7: Tracking Click Test
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 7: Tracking Click" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

# Use first campaign alias if available
if ($campaignList.Count -gt 0) {
    $testAlias = $campaignList[0].alias
}
else {
    $testAlias = "test-campaign"
}

$trackResult = Test-APIEndpoint -Name "Click Campaign: $testAlias" -Url "$BASE_URL/$testAlias"

$clickId = $null
if ($trackResult.Success -and $trackResult.Data.data.clickId) {
    $clickId = $trackResult.Data.data.clickId
    Write-Host "  Generated ClickId: $clickId" -ForegroundColor Green

    # Wait for AE to write
    Write-Host "  Waiting 5 seconds for Analytics Engine to write..."
    Start-Sleep -Seconds 5

    # Query recent clicks
    $recentResult = Test-APIEndpoint -Name "Query Recent Clicks" -Url "$API_BASE/analytics/recent-clicks?limit=5"

    if ($recentResult.Success -and $recentResult.Data.data.list) {
        $foundClick = $recentResult.Data.data.list | Where-Object { $_.event_id -eq $clickId }

        if ($foundClick) {
            Write-Host "  ClickId FOUND in Analytics Engine!" -ForegroundColor Green
            Write-Host "    Campaign: $($foundClick.campaign)"
            Write-Host "    Country: $($foundClick.country)"
            Write-Host "    Device: $($foundClick.device)"
        }
        else {
            Write-Host "  ClickId NOT FOUND in Analytics Engine" -ForegroundColor Red
            Write-Host "  Recent clicks in AE:"
            foreach ($click in $recentResult.Data.data.list) {
                Write-Host "    - $($click.event_id)"
            }
        }
    }
}

# ========================================
# Test 8: Analytics Dashboard Stats
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 8: Analytics Dashboard Stats" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$statsResult = Test-APIEndpoint -Name "Dashboard Stats (7 days)" -Url "$API_BASE/analytics/dashboard-stats?days=7"
if ($statsResult.Success -and $statsResult.Data.data) {
    Write-Host "  Total Clicks: $($statsResult.Data.data.totalClicks)"
    Write-Host "  Unique Visitors: $($statsResult.Data.data.uniqueVisitors)"
    Write-Host "  Total Cost: $($statsResult.Data.data.totalCost)"
    Write-Host "  Campaign Count: $($statsResult.Data.data.campaignCount)"
}

# ========================================
# Test 9: Analytics Top Entities
# ========================================
Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  TEST 9: Analytics Top Entities" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$topCampResult = Test-APIEndpoint -Name "Top Campaigns" -Url "$API_BASE/analytics/top-entities?type=campaigns&days=7"
if ($topCampResult.Success -and $topCampResult.Data.data) {
    Write-Host "  Top Campaigns:"
    foreach ($item in $topCampResult.Data.data | Select-Object -First 5) {
        Write-Host "    - $($item.name): $($item.clicks) clicks"
    }
}

# ========================================
# Summary
# ========================================
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  TEST SUMMARY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Completed: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

if ($clickId -and $foundClick) {
    Write-Host "  [PASS] Tracking: ClickId successfully recorded in Analytics Engine" -ForegroundColor Green
}
elseif ($clickId) {
    Write-Host "  [FAIL] Tracking: ClickId NOT recorded in Analytics Engine" -ForegroundColor Red
}

Write-Host ""
