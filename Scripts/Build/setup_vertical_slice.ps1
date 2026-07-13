[CmdletBinding()]
param(
    [string]$ProjectRoot = '',
    [string]$UeRoot = 'C:\Program Files\Epic Games\UE_5.8',
    [string]$StartAt = '',
    [switch]$SkipBuild,
    [switch]$SkipAutomation
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

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
    @{ Path = 'Scripts\create_hero_input.py'; Token = 'BTTF_HERO_INPUT_SUCCESS' },
    @{ Path = 'Scripts\create_complete_vehicle_input.py'; Token = 'BTTF_COMPLETE_VEHICLE_INPUT_SUCCESS' },
    @{ Path = 'Scripts\create_controller_input_assets.py'; Token = 'Controller input assets' },
    @{ Path = 'Scripts\hill_valley\create_photoreal_material_library.py'; Token = 'PHOTOREAL_MATERIAL_LIBRARY_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_photoreal_materials.py'; Token = 'PHOTOREAL_MATERIAL_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\apply_photoreal_materials.py'; Token = 'PHOTOREAL_MATERIALS_APPLY_SUCCESS' },
    @{ Path = 'Scripts\create_dialogue_assets.py'; Token = 'DIALOGUE_ASSETS_SUCCESS' },
    @{ Path = 'Scripts\create_era_music_assets.py'; Token = 'ERA_MUSIC_ASSETS_SUCCESS' },
    @{ Path = 'Scripts\create_world_consequence_signage.py'; Token = 'WORLD_CONSEQUENCE_SIGNAGE_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\build_hill_valley_square.py'; Token = 'courthouse square generation complete' },
    @{ Path = 'Scripts\hill_valley\build_1955_dressing.py'; Token = 'HILL_VALLEY_1955_BUILD_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\build_1885_dressing.py'; Token = 'HILL_VALLEY_1885_BUILD_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\build_1985_alternate_dressing.py'; Token = 'HILL_VALLEY_1985A_BUILD_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\build_2015_dressing.py'; Token = 'HILL_VALLEY_2015_BUILD_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\build_2045_dressing.py'; Token = 'HILL_VALLEY_2045_BUILD_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\build_timeline_variants.py'; Token = 'TIMELINE_VARIANTS_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\place_mission_volumes.py'; Token = 'MISSION_VOLUME_PLACEMENT_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\place_traffic_routes.py'; Token = 'HILL_VALLEY_TRAFFIC_ROUTES_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_mission_placement.py'; Token = 'MISSION_PLACEMENT_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_hill_valley_square.py'; Token = 'HILL_VALLEY_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_1955_dressing.py'; Token = 'HILL_VALLEY_1955_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\hill_valley\validate_era_dressing.py'; Token = 'ERA_DRESSING_VALIDATION_SUCCESS' },
    @{ Path = 'Scripts\apply_photoreal_lighting.py'; Token = 'PHOTOREAL_LIGHTING_SUCCESS' }
)

$runStep = [string]::IsNullOrWhiteSpace($StartAt)
foreach ($step in $pythonSteps) {
    if (-not $runStep -and $step.Path -eq $StartAt) {
        $runStep = $true
    }
    if (-not $runStep) {
        continue
    }
    Invoke-EditorPython -ScriptRelativePath $step.Path -SuccessToken $step.Token
}

if (-not [string]::IsNullOrWhiteSpace($StartAt) -and -not $runStep) {
    throw "StartAt script is not part of the setup pipeline: $StartAt"
}

if (-not $SkipAutomation) {
    Write-Host '==> Running BTTF automation suite'
    & (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter BTTF
}

Write-Host ''
Write-Host 'SETUP COMPLETE'
Write-Host 'Next: open BTTF_TemporalDrift.uproject and play LVL_TimeTravelTest in PIE.'
Write-Host 'See Docs/PC_Setup_Guide.md for the full PC playtest checklist.'
