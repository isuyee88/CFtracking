$files = @(
    "frontend\src\pages\Trends.tsx",
    "frontend\src\pages\CampaignDetail.tsx"
)

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        
        # Replace height="100%" with specific heights based on context
        $content = $content -replace '(<ChartWrapper height="{(\d+)}">[\s\S]*?<LazyResponsiveContainer width="100%" height="100%")', '$1 height={$2}'
        $content = $content -replace '(<ChartWrapper height={250}>[\s\S]*?<LazyResponsiveContainer width="100%" height="100%")', '$1 height={250}'
        $content = $content -replace '(<ChartWrapper height={300}>[\s\S]*?<LazyResponsiveContainer width="100%" height="100%")', '$1 height={300}'
        
        # Generic replacement for remaining height="100%"
        $content = $content -replace 'LazyResponsiveContainer width="100%" height="100%"', 'LazyResponsiveContainer width="100%" height={300}'
        
        Set-Content $filePath $content -NoNewline
        Write-Host "Fixed: $file"
    }
}

Write-Host "All files fixed!"
