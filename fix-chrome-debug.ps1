# Chrome 调试端口修复脚本

Write-Host "=== Chrome 调试端口修复工具 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查当前 Chrome 进程
Write-Host "1. 检查当前 Chrome 进程..." -ForegroundColor Yellow
$chromeProcesses = Get-Process chrome -ErrorAction SilentlyContinue
if ($chromeProcesses) {
    Write-Host "   发现 $($chromeProcesses.Count) 个 Chrome 进程" -ForegroundColor Gray
    
    # 检查是否有调试端口
    $debugChrome = Get-WmiObject Win32_Process -Filter "name = 'chrome.exe'" | Where-Object { $_.CommandLine -match "remote-debugging-port=(\d+)" }
    
    if ($debugChrome) {
        Write-Host "   发现调试端口: $($Matches[1])" -ForegroundColor Green
    } else {
        Write-Host "   未发现调试端口" -ForegroundColor Red
    }
} else {
    Write-Host "   没有运行中的 Chrome 进程" -ForegroundColor Green
}

Write-Host ""

# 2. 检查 DevToolsActivePort 文件
Write-Host "2. 检查 DevToolsActivePort 文件..." -ForegroundColor Yellow
$devToolsPortPath = "C:\Users\isuye\AppData\Local\Google\Chrome\User Data\DevToolsActivePort"

if (Test-Path $devToolsPortPath) {
    Write-Host "   文件存在" -ForegroundColor Green
    $portContent = Get-Content $devToolsPortPath
    Write-Host "   内容: $portContent" -ForegroundColor Gray
} else {
    Write-Host "   文件不存在" -ForegroundColor Red
}

Write-Host ""

# 3. 解决方案
Write-Host "3. 解决方案" -ForegroundColor Yellow
Write-Host "   问题原因: Chrome 单实例模式冲突" -ForegroundColor Gray
Write-Host "   解决方法: 完全关闭 Chrome，然后重新启动" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "是否关闭所有 Chrome 进程并重新启动? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host ""
    Write-Host "正在关闭所有 Chrome 进程..." -ForegroundColor Yellow
    
    # 关闭所有 Chrome 进程
    Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
    
    # 等待进程完全关闭
    Start-Sleep -Seconds 2
    
    # 确认进程已关闭
    $remainingChrome = Get-Process chrome -ErrorAction SilentlyContinue
    if ($remainingChrome) {
        Write-Host "   警告: 仍有 Chrome 进程在运行" -ForegroundColor Red
        Write-Host "   请手动关闭所有 Chrome 窗口" -ForegroundColor Yellow
    } else {
        Write-Host "   所有 Chrome 进程已关闭" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "正在启动带调试端口的 Chrome..." -ForegroundColor Yellow
    
    # 启动 Chrome（使用默认用户数据目录）
    Start-Process "chrome.exe" -ArgumentList "--remote-debugging-port=9222"
    
    # 等待 Chrome 启动
    Start-Sleep -Seconds 3
    
    # 检查是否成功
    if (Test-Path $devToolsPortPath) {
        Write-Host "   成功! DevToolsActivePort 文件已创建" -ForegroundColor Green
        $portContent = Get-Content $devToolsPortPath
        Write-Host "   调试端口: $($portContent[0])" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "现在可以使用 MCP 工具连接 Chrome 了!" -ForegroundColor Green
    } else {
        Write-Host "   失败: DevToolsActivePort 文件仍未创建" -ForegroundColor Red
        Write-Host "   可能需要检查 Chrome 安装或用户权限" -ForegroundColor Yellow
    }
} else {
    Write-Host "操作已取消" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Cyan
