# push-to-github.ps1 — one-click force-push for darksonwebsite
# Run from this folder in PowerShell: `powershell -ExecutionPolicy Bypass -File .\push-to-github.ps1`

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==> Cleaning stale files from the previous version"
foreach ($f in @("netlify.toml", "bun.lock", "package-lock.json", ".next", "node_modules", ".vercel")) {
    if (Test-Path $f) {
        Remove-Item $f -Recurse -Force
        Write-Host "    removed $f"
    }
}

Write-Host "==> Initializing git"
if (Test-Path ".git") {
    Remove-Item ".git" -Recurse -Force
}
git init -b main
git config user.email "darkson@users.noreply.github.com"
git config user.name "darkson"

Write-Host "==> Staging files"
git add -A

Write-Host "==> Committing"
git commit -m "Merge key system into darksonwebsite with hardened dashboard" | Out-Null

Write-Host "==> Pushing (force) to github.com/dzodi1021-lgtm/darksonwebsite"
$env:GIT_TERMINAL_PROMPT = "0"
# Token is in a sibling file; adjust path if needed
$tokenFile = Join-Path $PSScriptRoot ".github-token"
if (-not (Test-Path $tokenFile)) {
    Write-Error "Missing .github-token file next to this script. Paste your PAT in it (one line, no quotes)."
    exit 1
}
$token = (Get-Content $tokenFile -Raw).Trim()
$remote = "https://x-access-token:$token@github.com/dzodi1021-lgtm/darksonwebsite.git"

git remote add origin $remote
git push --force -u origin main

Write-Host ""
Write-Host "==> Done. Vercel will auto-redeploy on push if the project is connected to this repo."
