[CmdletBinding()]
param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$UeRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [switch]$SkipBuild,
    [switch]$SkipAutomation
)

$ErrorActionPreference = 'Stop'

function Invoke-EditorPython {
    param(
        [Parameter(Mandatory = $true)][string]$ScriptRelativePath,
        [string]$SuccessToken = ''
    )

    $ProjectFile = Join-Path $ProjectRoot 'BTTF_TemporalDrift.uproject'
    $ScriptPath = Join-Path $ProjectRoot $ScriptRelativePath
    if (-not (Test-Path -LiteralPath $ScriptPath)) {
        throw "Python script not found: $ScriptPath"
    }

    Write-Host "==> Running $ScriptRelativePath"
    $logPath = Join-Path $ProjectRoot "Saved/Logs/$(Split-Path $ScriptRelativePath -Leaf).log"
    New-Item -ItemType Directory -Force -Path (Split-Path $logPath) | Out-Null

    & $EditorCmd $ProjectFile -unattended -nop4 -nosplash -NullRHI `
        -run=pythonscript "-script=$ScriptPath" `
        -abslog="$logPath"
    if ($LASTEXITCODE -ne 0) {
        throw "Commandlet failed ($ScriptRelativePath) exit $LASTEXITCODE. See $logPath"
    }
    if ($SuccessToken -and (Test-Path -LiteralPath $logPath)) {
        $log = Get-Content -LiteralPath $logPath -Raw
        if ($log -notmatch [regex]::Escape($SuccessToken)) {
            Write-Warning "Expected token '$SuccessToken' not found in $logPath"
        }
    }
}

$EditorCmd = Join-Path $UeRoot 'Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
if (-not (Test-Path -LiteralPath $EditorCmd)) {
    throw @"
Unreal Engine 5.8 was not found at:
  $UeRoot

Install UE 5.8 or pass -UeRoot 'C:\Path\To\UE_5.8'.
Cloud agents cannot run Unreal Editor; run this script on your Windows machine.
"@
}

$ProjectFile = Join-Path $ProjectRoot 'BTTF_TemporalDrift.uproject'
if (-not (Test-Path -LiteralPath $ProjectFile)) {
    throw "Project file not found: $ProjectFile"
}

Write-Host "Temporal Drift vertical-slice setup"
Write-Host "Project: $ProjectRoot"
Write-Host "Engine:  $UeRoot"

if (-not $SkipBuild) {
    Write-Host '==> Building editor target'
    & (Join-Path $PSScriptRoot 'build_editor.ps1')
    if ($LASTEXITCODE -ne 0) {
        throw "Editor build failed with exit code $LASTEXITCODE"
    }
    Write-Host 'If the build reported 0 compile actions, pull the latest branch and touch Source before rebuilding.'
}

$pythonSteps = @(
    @{ Path = 'Scripts\create_campaign_missions.py'; Token = 'CAMPAIGN_MISSION_SAVED' },
    @{ Path = 'Scripts\create_timeline_data.py'; Token = 'TIMELINE_DATA_SUCCESS' },
    @{ Path = 'Scripts\create_side_missions.py'; Token = 'SIDE_MISSIONS_SUCCESS' },
    @{ Path = 'Scripts\create_crafting_recipes.py'; Token = 'CRAFTING_RECIPES_SUCCESS' },
    @{ Path = 'Scripts\create_presentation_assets.py'; Token = 'TEMPORAL_PRESENTATION_ASSETS_SUCCESS' },
    @{ Path = 'Scripts\create_presentation_vfx_audio.py'; Token = 'PRESENTATION_VFX_AUDIO_ASSETS_SUCCESS' },
    @{ Path = 'Scripts\create_ui_widgets.py'; Token = 'UI_WIDGETS_SUCCESS' },
    @{ Path = 'Scripts\create_dialogue_assets.py'; Token = 'DIALOGUE_ASSETS_SUCCESS' },
    @{ Path = 'Scripts\create_era_music_assets.py'; Token = 'ERA_MUSIC_ASSETS_SUCCESS' },
    @{ Path = 'Scripts\create_world_consequence_signage.py'; Token = 'WORLD_CONSEQUENCE_SIGNAGE_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\place_mission_volumes.py'; Token = 'MISSION_VOLUME_PLACEMENT_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_mission_placement.py'; Token = 'MISSION_PLACEMENT_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_hill_valley_square.py'; Token = 'HILL_VALLEY_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_1955_dressing.py'; Token = 'HILL_VALLEY_1955_VALIDATION_SUCCESS' }
)

foreach ($step in $pythonSteps) {
    Invoke-EditorPython -ScriptRelativePath $step.Path -SuccessToken $step.Token
}

if (-not $SkipAutomation) {
    Write-Host '==> Running BTTF automation suite'
    & (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter BTTF
}

Write-Host ''
Write-Host 'SETUP COMPLETE'
Write-Host 'Next: open BTTF_TemporalDrift.uproject and play LVL_TimeTravelTest in PIE.'
Write-Host 'See Docs/QA/UnrealEditorConnection.md for the live playtest checklist.'
