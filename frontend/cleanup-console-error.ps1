#!/usr/bin/env pwsh
# Script: cleanup-console-error.ps1
# Purpose: Batch replace console.error with toast.error in frontend pages
# Input: None (automatically processes all .tsx files in src/pages and src/components)
# Output: Modified files with console.error replaced by toast.error

$filesToProcess = @(
    "src/pages/TrafficSources.tsx",
    "src/pages/AffiliateNetworks.tsx",
    "src/pages/Whitelist.tsx",
    "src/pages/Blacklist.tsx",
    "src/pages/CampaignManagement.tsx",
    "src/pages/PlatformManagement.tsx",
    "src/pages/RuleManagement.tsx",
    "src/pages/Dashboard.tsx",
    "src/pages/Trends.tsx",
    "src/pages/CampaignDetail.tsx",
    "src/pages/Reports.tsx",
    "src/pages/ClicksLog.tsx",
    "src/components/CampaignForm.tsx",
    "src/components/FlowDesigner.tsx"
)

$frontendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($file in $filesToProcess) {
    $filePath = Join-Path $frontendRoot $file
    if (Test-Path $filePath) {
        Write-Host "Processing: $file"
        
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Check if file already has useToast import
        if ($content -notmatch 'useToast') {
            # Add useToast import after EntityForm or similar import
            $content = $content -replace "(import \{[^}]*EntityForm[^}]*\} from ['\"]\.\.\/components\/EntityForm['\"])", "`$1`nimport { useToast } from '../components/Toast';"
            
            # Add toast initialization after component declaration
            $content = $content -replace "(export const \w+ = \(\) => \{)`n(\s+const \[)", "`$1`n  const toast = useToast();`n`$2"
        }
        
        # Replace console.error patterns with toast.error
        # Pattern 1: console.error('message:', err);
        $content = $content -replace "console\.error\('([^']+):',\s*err\);", "toast.error('`${1}`', err instanceof Error ? err.message : 'Unknown error');"
        
        # Pattern 2: console.error('message:', error);
        $content = $content -replace "console\.error\('([^']+):',\s*error\);", "toast.error('`${1}`', error instanceof Error ? error.message : 'Unknown error');"
        
        # Pattern 3: .catch(err => console.error('message:', err))
        $content = $content -replace "\.catch\(err => console\.error\('([^']+):',\s*err\)\)", ".catch(err => toast.error('`${1}`', err instanceof Error ? err.message : 'Unknown error'))"
        
        # Pattern 4: console.error with template literals or other formats
        $content = $content -replace "console\.error\(\s*'(\[?[^\]]+\]?)\s*:',\s*err\s*\);", "toast.error('`${1}`', err instanceof Error ? err.message : 'Unknown error');"
        
        # Write back
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  ✓ Updated: $file" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nCleanup complete!" -ForegroundColor Cyan
