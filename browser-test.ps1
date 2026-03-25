/**
 * 浏览器自动化测试脚本 - PowerShell 版本
 * 用途：验证 SSR 页面修复是否成功
 * 测试目标：https://cf-tracking.suyee88.workers.dev
 */

# 配置
$CDP_PORT = 9222
$TARGET_URL = "https://cf-tracking.suyee88.workers.dev"

# 测试结果
$testResults = @{
    homepage = $null
    dashboard = $null
    otherPages = @()
    errors = @()
}

# 函数：发送 CDP 命令
function Send-CDPCommand {
    param(
        [string]$PageId,
        [string]$Method,
        [object]$Params = @{}
    )
    
    $wsUrl = "ws://localhost:$CDP_PORT/devtools/page/$PageId"
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = New-Object System.Threading.CancellationToken
    $uri = New-Object System.Uri($wsUrl)
    
    try {
        $connectTask = $ws.ConnectAsync($uri, $ct)
        $connectTask.Wait()
        
        $messageId = 1
        $message = @{
            id = $messageId
            method = $Method
            params = $Params
        } | ConvertTo-Json -Depth 10
        
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($message)
        $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
        
        $sendTask = $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct)
        $sendTask.Wait()
        
        # 接收响应
        $buffer = New-Object byte[] 8192
        $receiveSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
        $receiveTask = $ws.ReceiveAsync($receiveSegment, $ct)
        $receiveTask.Wait()
        
        $response = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $receiveTask.Result.Count)
        return $response | ConvertFrom-Json
    }
    finally {
        $ws.Dispose()
    }
}

# 函数：获取页面 ID
function Get-PageId {
    $pages = Invoke-RestMethod -Uri "http://localhost:$CDP_PORT/json"
    $cfPage = $pages | Where-Object { $_.type -eq "page" -and $_.url -like "*cf-tracking*" } | Select-Object -First 1
    
    if (-not $cfPage) {
        # 如果没有找到 cf-tracking 页面，创建一个新标签页
        $newPage = Invoke-RestMethod -Uri "http://localhost:$CDP_PORT/json/new?https://cf-tracking.suyee88.workers.dev"
        return $newPage.id
    }
    
    return $cfPage.id
}

# 函数：导航到 URL
function Navigate-ToUrl {
    param(
        [string]$PageId,
        [string]$Url
    )
    
    Write-Host "📍 导航到: $Url" -ForegroundColor Cyan
    
    $result = Send-CDPCommand -PageId $PageId -Method "Page.navigate" -Params @{ url = $Url }
    
    # 等待页面加载
    Start-Sleep -Seconds 3
    
    return $result
}

# 函数：执行 JavaScript
function Invoke-PageScript {
    param(
        [string]$PageId,
        [string]$Script
    )
    
    $result = Send-CDPCommand -PageId $PageId -Method "Runtime.evaluate" -Params @{
        expression = $Script
        returnByValue = $true
    }
    
    return $result.result.result.value
}

# 函数：截屏
function Take-Screenshot {
    param(
        [string]$PageId,
        [string]$Name
    )
    
    $result = Send-CDPCommand -PageId $PageId -Method "Page.captureScreenshot" -Params @{
        format = "png"
    }
    
    if ($result.result.data) {
        $filename = "d:\suyee\github\CFtracking\screenshots\$Name.png"
        $bytes = [Convert]::FromBase64String($result.result.data)
        [IO.File]::WriteAllBytes($filename, $bytes)
        Write-Host "📸 截图已保存: $filename" -ForegroundColor Green
        return $filename
    }
    
    return $null
}

# 主测试函数
function Start-BrowserTest {
    Write-Host "`n🧪 开始浏览器自动化测试" -ForegroundColor Yellow
    Write-Host "========================`n" -ForegroundColor Yellow
    
    # 创建截图目录
    $screenshotDir = "d:\suyee\github\CFtracking\screenshots"
    if (-not (Test-Path $screenshotDir)) {
        New-Item -ItemType Directory -Path $screenshotDir -Force | Out-Null
    }
    
    # 获取页面 ID
    $pageId = Get-PageId
    Write-Host "✅ 已连接到浏览器 (Page ID: $pageId)`n" -ForegroundColor Green
    
    # 测试 1: 首页重定向
    Write-Host "🧪 测试 1: 首页重定向" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    
    Navigate-ToUrl -PageId $pageId -Url "$TARGET_URL/"
    
    # 检查 URL
    $url = Invoke-PageScript -PageId $pageId -Script "window.location.href"
    Write-Host "当前 URL: $url" -ForegroundColor White
    
    $isRedirected = $url -like "*/dashboard*"
    Write-Host "重定向到 Dashboard: $(if ($isRedirected) { '✅' } else { '❌' })" -ForegroundColor $(if ($isRedirected) { 'Green' } else { 'Red' })
    
    # 检查页面内容
    $pageInfo = Invoke-PageScript -PageId $pageId -Script @"
(function() {
    const bodyText = document.body.innerText.trim();
    const bodyHtml = document.body.innerHTML;
    const antComponents = document.querySelectorAll('[class*=\"ant-\"]').length;
    const hasSSRPlaceholder = document.body.innerText.includes('0') && 
                               document.querySelectorAll('.grid').length > 0;
    
    return {
        textLength: bodyText.length,
        htmlLength: bodyHtml.length,
        hasAntDesign: antComponents > 0,
        antComponentsCount: antComponents,
        hasSSRPlaceholder: hasSSRPlaceholder,
        title: document.title
    };
})()
"@
    
    Write-Host "页面标题: $($pageInfo.title)" -ForegroundColor White
    Write-Host "文本长度: $($pageInfo.textLength)" -ForegroundColor White
    Write-Host "HTML 长度: $($pageInfo.htmlLength)" -ForegroundColor White
    Write-Host "Ant Design 组件: $($pageInfo.antComponentsCount)" -ForegroundColor White
    Write-Host "有 SSR 简单界面: $(if ($pageInfo.hasSSRPlaceholder) { '❌' } else { '✅' })" -ForegroundColor $(if ($pageInfo.hasSSRPlaceholder) { 'Red' } else { 'Green' })
    
    Take-Screenshot -PageId $pageId -Name "01-homepage-redirect"
    
    $testResults.homepage = @{
        url = $url
        isRedirected = $isRedirected
        pageInfo = $pageInfo
        passed = $isRedirected -and -not $pageInfo.hasSSRPlaceholder -and $pageInfo.hasAntDesign
    }
    
    # 测试 2: Dashboard 页面
    Write-Host "`n🧪 测试 2: Dashboard 页面" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    
    Navigate-ToUrl -PageId $pageId -Url "$TARGET_URL/dashboard"
    
    $dashboardInfo = Invoke-PageScript -PageId $pageId -Script @"
(function() {
    const bodyText = document.body.innerText.trim();
    const antComponents = document.querySelectorAll('[class*=\"ant-\"]').length;
    const antCards = document.querySelectorAll('.ant-card').length;
    const antTables = document.querySelectorAll('.ant-table').length;
    const hasSSRPlaceholder = document.body.innerText.includes('0') && 
                               document.querySelectorAll('.grid').length > 0;
    
    // 检查数据卡片
    const cards = document.querySelectorAll('.ant-statistic');
    const cardData = [];
    cards.forEach(card => {
        const value = card.querySelector('.ant-statistic-content-value')?.textContent?.trim();
        const title = card.querySelector('.ant-statistic-title')?.textContent?.trim();
        cardData.push({ title: title, value: value });
    });
    
    // 检查是否有真实数据
    const hasRealData = cardData.some(card => {
        const numValue = parseFloat(card.value?.replace(/,/g, ''));
        return !isNaN(numValue) && numValue !== 0;
    });
    
    // 检查错误信息
    const hasErrors = document.body.innerText.includes('Failed to fetch') ||
                      document.body.innerText.includes('Error');
    
    return {
        textLength: bodyText.length,
        hasAntDesign: antComponents > 0,
        antComponentsCount: antComponents,
        antCardsCount: antCards,
        antTablesCount: antTables,
        hasSSRPlaceholder: hasSSRPlaceholder,
        hasRealData: hasRealData,
        hasErrors: hasErrors,
        cardData: cardData,
        title: document.title
    };
})()
"@
    
    Write-Host "页面标题: $($dashboardInfo.title)" -ForegroundColor White
    Write-Host "文本长度: $($dashboardInfo.textLength)" -ForegroundColor White
    Write-Host "Ant Design 组件: $($dashboardInfo.antComponentsCount)" -ForegroundColor White
    Write-Host "Ant Design 卡片: $($dashboardInfo.antCardsCount)" -ForegroundColor White
    Write-Host "Ant Design 表格: $($dashboardInfo.antTablesCount)" -ForegroundColor White
    Write-Host "有 SSR 简单界面: $(if ($dashboardInfo.hasSSRPlaceholder) { '❌' } else { '✅' })" -ForegroundColor $(if ($dashboardInfo.hasSSRPlaceholder) { 'Red' } else { 'Green' })
    Write-Host "有真实数据: $(if ($dashboardInfo.hasRealData) { '✅' } else { '❌' })" -ForegroundColor $(if ($dashboardInfo.hasRealData) { 'Green' } else { 'Red' })
    Write-Host "有错误信息: $(if ($dashboardInfo.hasErrors) { '❌' } else { '✅' })" -ForegroundColor $(if ($dashboardInfo.hasErrors) { 'Red' } else { 'Green' })
    
    if ($dashboardInfo.cardData -and $dashboardInfo.cardData.Count -gt 0) {
        Write-Host "`n数据卡片:" -ForegroundColor Yellow
        $dashboardInfo.cardData | ForEach-Object {
            Write-Host "  - $($_.title): $($_.value)" -ForegroundColor White
        }
    }
    
    Take-Screenshot -PageId $pageId -Name "02-dashboard"
    
    $testResults.dashboard = @{
        dashboardInfo = $dashboardInfo
        passed = -not $dashboardInfo.hasSSRPlaceholder -and $dashboardInfo.hasAntDesign -and -not $dashboardInfo.hasErrors
    }
    
    # 测试 3: 其他页面
    Write-Host "`n🧪 测试 3: 其他页面" -ForegroundColor Cyan
    Write-Host "==================" -ForegroundColor Cyan
    
    $pages = @(
        @{ path = "/campaigns"; name = "Campaigns" },
        @{ path = "/offers"; name = "Offers" },
        @{ path = "/landings"; name = "Landings" },
        @{ path = "/traffic-sources"; name = "Traffic Sources" }
    )
    
    foreach ($page in $pages) {
        Write-Host "`n测试页面: $($page.name)" -ForegroundColor Yellow
        Write-Host "---" -ForegroundColor Gray
        
        Navigate-ToUrl -PageId $pageId -Url "$TARGET_URL$($page.path)"
        
        $pageInfo = Invoke-PageScript -PageId $pageId -Script @"
(function() {
    const bodyText = document.body.innerText.trim();
    const antComponents = document.querySelectorAll('[class*=\"ant-\"]').length;
    const hasSSRPlaceholder = document.body.innerText.includes('0') && 
                               document.querySelectorAll('.grid').length > 0;
    const hasContent = bodyText.length > 100;
    
    return {
        textLength: bodyText.length,
        hasAntDesign: antComponents > 0,
        antComponentsCount: antComponents,
        hasSSRPlaceholder: hasSSRPlaceholder,
        hasContent: hasContent,
        title: document.title
    };
})()
"@
        
        Write-Host "页面标题: $($pageInfo.title)" -ForegroundColor White
        Write-Host "文本长度: $($pageInfo.textLength)" -ForegroundColor White
        Write-Host "Ant Design 组件: $($pageInfo.antComponentsCount)" -ForegroundColor White
        Write-Host "有 SSR 简单界面: $(if ($pageInfo.hasSSRPlaceholder) { '❌' } else { '✅' })" -ForegroundColor $(if ($pageInfo.hasSSRPlaceholder) { 'Red' } else { 'Green' })
        Write-Host "有内容: $(if ($pageInfo.hasContent) { '✅' } else { '❌' })" -ForegroundColor $(if ($pageInfo.hasContent) { 'Green' } else { 'Red' })
        
        Take-Screenshot -PageId $pageId -Name "03-$($page.name.ToLower().Replace(' ', '-'))"
        
        $testResults.otherPages += @{
            name = $page.name
            path = $page.path
            pageInfo = $pageInfo
            passed = -not $pageInfo.hasSSRPlaceholder -and $pageInfo.hasAntDesign -and $pageInfo.hasContent
        }
    }
    
    # 生成报告
    Write-Host "`n📊 测试报告" -ForegroundColor Yellow
    Write-Host "============" -ForegroundColor Yellow
    
    $allTests = @(
        @{ name = "首页重定向"; result = $testResults.homepage },
        @{ name = "Dashboard 页面"; result = $testResults.dashboard }
    ) + $testResults.otherPages | ForEach-Object {
        @{ name = $_.name; result = $_.pageInfo }
    }
    
    $passed = ($allTests | Where-Object { $_.result.passed }).Count
    $total = $allTests.Count
    
    Write-Host "`n总测试数: $total" -ForegroundColor White
    Write-Host "通过: $passed" -ForegroundColor Green
    Write-Host "失败: $($total - $passed)" -ForegroundColor Red
    Write-Host "通过率: $([math]::Round(($passed / $total) * 100, 1))%" -ForegroundColor $(if ($passed -eq $total) { 'Green' } else { 'Yellow' })
    
    Write-Host "`n详细结果:" -ForegroundColor Yellow
    $allTests | ForEach-Object {
        $status = if ($_.result.passed) { "✅ 通过" } else { "❌ 失败" }
        $color = if ($_.result.passed) { 'Green' } else { 'Red' }
        Write-Host "  $status - $($_.name)" -ForegroundColor $color
    }
    
    Write-Host "`n✅ 测试完成！" -ForegroundColor Green
    
    return $testResults
}

# 执行测试
try {
    $results = Start-BrowserTest
    
    # 保存结果到文件
    $results | ConvertTo-Json -Depth 10 | Out-File "d:\suyee\github\CFtracking\browser-test-results.json"
    Write-Host "`n📄 测试结果已保存到: browser-test-results.json" -ForegroundColor Cyan
}
catch {
    Write-Host "`n❌ 测试失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
}
