param(
  [string]$TaskName = 'Tracking Weekly Backup',
  [ValidateSet('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')]
  [string]$DayOfWeek = 'Sunday',
  [string]$At = '02:00',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$backupScript = Join-Path $backendDir 'scripts\backupDatabase.js'
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

if (-not (Test-Path $backupScript)) {
  throw "Backup script not found: $backupScript"
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
  if (-not $Force) {
    Write-Host "Scheduled task '$TaskName' already exists. Use -Force to replace it."
    return
  }

  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute $nodeExe -Argument ('"{0}"' -f $backupScript) -WorkingDirectory $backendDir
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $DayOfWeek -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType S4U -RunLevel Limited

$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Creates a weekly SQLite backup for the tracking system.'
Register-ScheduledTask -TaskName $TaskName -InputObject $task | Out-Null

Write-Host "Scheduled task '$TaskName' registered. It will run weekly on $DayOfWeek at $At."
Write-Host "Backup location: $(Join-Path $backendDir 'data\backups')"