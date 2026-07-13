[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ProjectFile = Join-Path $ProjectRoot 'BTTF_TemporalDrift.uproject'
$UEEditorCmd = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'

if (-not (Test-Path -LiteralPath $UEEditorCmd)) { throw "UE 5.8 commandlet not found: $UEEditorCmd" }
if (-not (Test-Path -LiteralPath $ProjectFile)) { throw "Project not found: $ProjectFile" }

function Invoke-PythonBuilder([string]$Script) {
    $scriptPath = Join-Path $ProjectRoot $Script
    if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Builder not found: $scriptPath" }
    & $UEEditorCmd $ProjectFile -unattended -nop4 -nosplash -NullRHI -run=pythonscript "-script=$scriptPath" -log
    if ($LASTEXITCODE -ne 0) { throw "Builder failed: $Script (exit $LASTEXITCODE)" }
}

& (Join-Path $PSScriptRoot 'build_editor.ps1')
Invoke-PythonBuilder 'Scripts\create_campaign_missions.py'
Invoke-PythonBuilder 'Scripts\create_presentation_assets.py'
Invoke-PythonBuilder 'Scripts\hill_valley\place_mission_volumes.py'
Invoke-PythonBuilder 'Scripts\hill_valley\validate_hill_valley_square.py'
Invoke-PythonBuilder 'Scripts\hill_valley\validate_1955_dressing.py'
& (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter 'BTTF'
Write-Output 'VERTICAL_SLICE_SETUP_SUCCESS'
