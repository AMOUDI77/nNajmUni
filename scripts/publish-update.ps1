$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Invoke-CheckedGit {
    & git @args
    if ($LASTEXITCODE -ne 0) { throw "Git failed; publishing stopped." }
}

$publishBranch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $publishBranch -ne 'main') {
    throw 'Expected main. Review the current branch before publishing.'
}
$publishRemote = (& git remote get-url origin).Trim()
if ($publishRemote -ne 'https://github.com/AMOUDI77/nNajmUni.git') {
    throw 'Unexpected origin. Review the remote before publishing.'
}
Invoke-CheckedGit fetch origin
& git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw 'Remote main has changes to integrate before publishing.' }
Invoke-CheckedGit diff --check
Invoke-CheckedGit add -- .env.example README.md NAJMUNI_IMPLEMENTATION_REPORT.md NAJMUNI_REBUILD_AUDIT.md client/index.html client/src client/e2e/partner-catalog.cjs client/e2e/product-smoke.cjs client/e2e/search-smoke.cjs client/public/favicon.svg client/public/najmuni-mascot.png client/public/partner-logos client/vite.config.ts client/vitest.config.mts docs/PARTNER_CATALOG_2026-10-15.md docs/catalog-reference-facts-2026-10-15.json scripts/build_partner_catalog.py scripts/publish-update.ps1 server/app.py server/partner_catalog.json server/partner_catalog.py server/tests/test_routes.py server/tests/public_preview.py server/tests/test_partner_catalog.py
Invoke-CheckedGit diff --cached --check
& git diff --cached --quiet
if ($LASTEXITCODE -eq 1) {
    Invoke-CheckedGit commit -m 'Improve partner catalog, bilingual discovery, application flow and favicon'
} elseif ($LASTEXITCODE -ne 0) {
    throw 'Could not inspect staged changes.'
}
Invoke-CheckedGit push origin main
Invoke-CheckedGit log -1 --oneline
