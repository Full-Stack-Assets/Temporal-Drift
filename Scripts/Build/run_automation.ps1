[CmdletBinding()]
param(
    [string]$Filter = 'BTTF'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ProjectFile = Join-Path $ProjectRoot 'BTTF_TemporalDrift.uproject'
$EditorCmd = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$LogFile = Join-Path $ProjectRoot 'Saved\Logs\BTTF_Automation.log'

if (-not (Test-Path -LiteralPath $EditorCmd)) {
    throw "Unreal Engine 5.8 command-line editor was not found: $EditorCmd"
}

& $EditorCmd $ProjectFile -unattended -nop4 -nosplash -NullRHI "-ExecCmds=Automation RunTests $Filter; Quit" '-TestExit=Automation Test Queue Empty' "-abslog=$LogFile"
if ($LASTEXITCODE -ne 0) {
    throw "Unreal automation failed with exit code $LASTEXITCODE. See $LogFile"
}

$Failures = Select-String -Path $LogFile -Pattern 'Test Completed\. Result=\{(Fail|NotRun)\}'
if ($Failures) {
    $Failures | ForEach-Object { Write-Error $_.Line }
    throw "One or more Unreal automation tests failed. See $LogFile"
}

Select-String -Path $LogFile -Pattern 'Found [0-9]+ automation tests|Test Completed\. Result=\{Success\}' |
    ForEach-Object { $_.Line }
