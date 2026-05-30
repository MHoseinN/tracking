param(
  [string]$RepoPath = (Split-Path -Parent $PSScriptRoot),
  [string]$UserName,
  [string]$UserEmail
)

$ErrorActionPreference = 'Stop'

function Fail([string]$Message) {
  Write-Host "[setup] $Message" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail 'Git is not installed or not available in PATH.'
}

if (-not (Test-Path $RepoPath)) {
  Fail "Repo path not found: $RepoPath"
}

Push-Location $RepoPath
try {
  $isRepo = git rev-parse --is-inside-work-tree 2>$null
  if ($LASTEXITCODE -ne 0 -or $isRepo -ne 'true') {
    Fail 'This folder is not a git repository. Clone the project instead of using a zip copy.'
  }

  $originUrl = git remote get-url origin 2>$null
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($originUrl)) {
    Fail 'Remote origin is not configured.'
  }

  if (-not [string]::IsNullOrWhiteSpace($UserName)) {
    git config user.name $UserName | Out-Null
  }

  if (-not [string]::IsNullOrWhiteSpace($UserEmail)) {
    git config user.email $UserEmail | Out-Null
  }

  $finalName = git config --get user.name
  $finalEmail = git config --get user.email

  if ([string]::IsNullOrWhiteSpace($finalName) -or [string]::IsNullOrWhiteSpace($finalEmail)) {
    Write-Host '[setup] Git user identity is missing.' -ForegroundColor Yellow
    Write-Host 'Run these commands once:'
    Write-Host '  git config user.name "Your Name"'
    Write-Host '  git config user.email "you@example.com"'
    exit 1
  }

  Write-Host "[setup] Repo path: $RepoPath"
  Write-Host "[setup] origin: $originUrl"
  Write-Host "[setup] user.name: $finalName"
  Write-Host "[setup] user.email: $finalEmail"
  Write-Host ''
  Write-Host '[setup] Next step: configure authentication on this machine.' -ForegroundColor Yellow
  Write-Host 'Option A (recommended): SSH key + add key in GitHub settings.'
  Write-Host 'Option B: Git Credential Manager (HTTPS login).'
  Write-Host ''
  Write-Host '[setup] After auth, test push permissions with:'
  Write-Host '  git push --dry-run origin HEAD'
}
finally {
  Pop-Location
}
