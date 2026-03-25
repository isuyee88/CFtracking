# 云同步功能 API 测试脚本

$baseUrl = "https://cf-tracking.suyee88.workers.dev"
$userId = "test-user-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "=== 云同步功能 API 测试 ===" -ForegroundColor Cyan
Write-Host "测试用户 ID: $userId" -ForegroundColor Yellow
Write-Host ""

# 测试 1: 获取 DO Stub
Write-Host "测试 1: 获取 DO Stub" -ForegroundColor Green
try {
    $stubResponse = Invoke-RestMethod -Uri "$baseUrl/api/user-preferences/stub" -Method POST -ContentType "application/json" -Body "{`"userId`": `"$userId`"}"
    Write-Host "✅ Stub 获取成功" -ForegroundColor Green
    Write-Host "DO URL: $($stubResponse.url)" -ForegroundColor Gray
    Write-Host "DO ID: $($stubResponse.id)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Stub 获取失败: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 测试 2: 获取默认偏好
Write-Host "测试 2: 获取默认偏好" -ForegroundColor Green
try {
    $prefs = Invoke-RestMethod -Uri "$baseUrl/api/user-preferences/stub" -Method POST -ContentType "application/json" -Body "{`"userId`": `"$userId`"}"
    Write-Host "✅ 偏好获取成功" -ForegroundColor Green
    Write-Host "版本: $($prefs.version)" -ForegroundColor Gray
    Write-Host "最后更新: $($prefs.lastUpdated)" -ForegroundColor Gray
} catch {
    Write-Host "❌ 偏好获取失败: $_" -ForegroundColor Red
}

Write-Host ""

# 测试 3: 更新偏好
Write-Host "测试 3: 更新偏好" -ForegroundColor Green
$updateBody = @{
    preferences = @{
        ui = @{
            theme = "dark"
            density = "compact"
        }
    }
} | ConvertTo-Json -Depth 3

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/user-preferences/stub" -Method POST -ContentType "application/json" -Body "{`"userId`": `"$userId`"}"
    Write-Host "✅ 偏好更新成功" -ForegroundColor Green
    Write-Host "新版本: $($updateResponse.version)" -ForegroundColor Gray
} catch {
    Write-Host "❌ 偏好更新失败: $_" -ForegroundColor Red
}

Write-Host ""

# 测试 4: 验证更新
Write-Host "测试 4: 验证更新" -ForegroundColor Green
try {
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/user-preferences/stub" -Method POST -ContentType "application/json" -Body "{`"userId`": `"$userId`"}"
    Write-Host "✅ 验证成功" -ForegroundColor Green
    Write-Host "当前主题: $($verifyResponse.preferences.ui.theme)" -ForegroundColor Gray
} catch {
    Write-Host "❌ 验证失败: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Cyan
