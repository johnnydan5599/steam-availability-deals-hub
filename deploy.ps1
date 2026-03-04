# deploy.ps1 — Build and deploy to Steam plugins folder
# Run this after making changes to webkit/index.tsx or frontend/index.tsx

$src = $PSScriptRoot
$dst = "C:\Program Files (x86)\Steam\plugins\steam-availability-deals-hub"

Write-Host "Building..." -ForegroundColor Cyan
cmd /c "pnpm run build"
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) {
    Write-Host "Build failed. Aborting." -ForegroundColor Red; exit 1
}

Write-Host "Deploying to Steam plugins..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force "$dst\backend" | Out-Null
New-Item -ItemType Directory -Force "$dst\.millennium\Dist" | Out-Null

Copy-Item "$src\plugin.json"                    "$dst\plugin.json"          -Force
Copy-Item "$src\thumbnail.jpg"                  "$dst\thumbnail.jpg"        -Force
Copy-Item "$src\backend\main.lua"               "$dst\backend\main.lua"     -Force
Copy-Item "$src\.millennium\Dist\webkit.js"     "$dst\.millennium\Dist\webkit.js" -Force
Copy-Item "$src\.millennium\Dist\index.js"      "$dst\.millennium\Dist\index.js"  -Force

Write-Host "Done! Restart Steam to apply changes." -ForegroundColor Green
