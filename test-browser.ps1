# 浏览器自动化测试脚本 - PowerShell 版本
# 用途：验证 SSR 页面修复是否成功
# 测试目标：https://cf-tracking.suyee88.workers.dev

$CDP_PORT = 9222
$TARGET_URL = "https://cf-tracking.suyee88.workers.dev"
$PAGE_ID = "0A8812CFF29DD2CF5A3CF53BDDE42E8A"

Write-Host "`n🧪 开始浏览器自动化测试" -ForegroundColor Yellow
Write-Host "========================`n" -ForegroundColor Yellow

# 函数：发送 CDP 命令
function Send-CDPCommand {
    param(
        [string]$Method,
        [object]$Params = @{}
    )
    
    $wsUrl = "ws://localhost:$CDP_PORT/devtools/page/$PAGE_ID"
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
        } | ConvertTo-Json -Depth 10 -Compress
        
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

# 函数：导航到 URL
function Navigate-ToUrl {
    param([string]$Url)
    
    Write-Host "📍 导航到: $Url" -ForegroundColor Cyan
    $result = Send-CDPCommand -Method "Page.navigate" -Params @{ url = $Url }
    Start-Sleep -Seconds 3
    return $result
}

# 函数：执行 JavaScript
function Invoke-PageScript {
    param([string]$Script)
    
    $result = Send-CDPCommand -Method "Runtime.evaluate" -Params @{
        expression = $Script
        returnByValue = $true
    }
    
    return $result.result.result.value
}

# 测试 1: 首页
Write-Host "🧪 测试 1: 首页" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan

Navigate-ToUrl -Url "$TARGET_URL/"

# 检查 URL
$url = Invoke-PageScript -Script "window.location.href"
Write-Host "当前 URL: $url" -ForegroundColor White

# 检查页面内容
$pageInfo = Invoke-PageScript -Script @"
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

$homepagePassed = -not $pageInfo.hasSSRPlaceholder -and $pageInfo.hasAntDesign

# 测试 2: Dashboard 页面
Write-Host "`n🧪 测试 2: Dashboard 页面" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

Navigate-ToUrl -Url "$TARGET_URL/dashboard"

$dashboardInfo = Invoke-PageScript -Script @"
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

$dashboardPassed = -not $dashboardInfo.hasSSRPlaceholder -and $dashboardInfo.hasAntDesign -and -not $dashboardInfo.hasErrors

# 测试 3: 其他页面
Write-Host "`n🧪 测试 3: 其他页面" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

$pages = @(
    @{ path = "/campaigns"; name = "Campaigns" },
    @{ path = "/offers"; name = "Offers" },
    @{ path = "/landings"; name = "Landings" },
    @{ path = "/traffic-sources"; name = "Traffic Sources" },
    @{ path = "/audit"; name = "Clicks Log" },
    @{ path = "/conversions"; name = "Conversions Log" }
)

$otherPagesPassed = 0
$otherPagesTotal = $pages.Count

foreach ($page in $pages) {
    Write-Host "`n测试页面: $($page.name)" -ForegroundColor Yellow
    Write-Host "---" -ForegroundColor Gray
    
    Navigate-ToUrl -Url "$TARGET_URL$($page.path)"
    
    $pageInfo = Invoke-PageScript -Script @"
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
    
    if (-not $pageInfo.hasSSRPlaceholder -and $pageInfo.hasAntDesign -and $pageInfo.hasContent) {
        $otherPagesPassed++
    }
}

# 生成报告
Write-Host "`n📊 测试报告" -ForegroundColor Yellow
Write-Host "============" -ForegroundColor Yellow

$totalTests = 2 + $otherPagesTotal
$passedTests = $(if ($homepagePassed) { 1 } else { 0 }) + $(if ($dashboardPassed) { 1 } else { 0 }) + $otherPagesPassed

Write-Host "`n总测试数: $totalTests" -ForegroundColor White
Write-Host "通过: $passedTests" -ForegroundColor Green
Write-Host "失败: $($totalTests - $passedTests)" -ForegroundColor Red
Write-Host "通过率: $([math]::Round(($passedTests / $totalTests) * 100, 1))%" -ForegroundColor $(if ($passedTests -eq $totalTests) { 'Green' } else { 'Yellow' })

Write-Host "`n详细结果:" -ForegroundColor Yellow
Write-Host "  $(if ($homepagePassed) { '✅ 通过' } else { '❌ 失败' }) - 首页" -ForegroundColor $(if ($homepagePassed) { 'Green' } else { 'Red' })
Write-Host "  $(if ($dashboardPassed) { '✅ 通过' } else { '❌ 失败' }) - Dashboard 页面" -ForegroundColor $(if ($dashboardPassed) { 'Green' } else { 'Red' })

Write-Host "`n✅ 测试完成！" -ForegroundColor Green
