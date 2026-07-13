[CmdletBinding()]
param(
    [string]$BlenderExe = $env:BLENDER_EXE
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$sourceDir = Join-Path $projectRoot 'SourceArt\Vehicles\DeLorean'
$blendPath = Join-Path $sourceDir 'HeroTimeMachine.blend'
$fbxPath = Join-Path $sourceDir 'Exports\HeroTimeMachine.fbx'
$inspectScript = Join-Path $sourceDir 'inspect_hero_vehicle.py'

if (-not (Test-Path $blendPath)) { throw "Missing HeroTimeMachine.blend" }
if (-not (Test-Path $fbxPath)) { throw "Missing HeroTimeMachine.fbx" }
if ((Get-Item $fbxPath).Length -le 100KB) { throw "HeroTimeMachine.fbx must be larger than 100 KB" }
if (-not (Test-Path $inspectScript)) { throw "Missing inspect_hero_vehicle.py" }

if (-not $BlenderExe) {
    $BlenderExe = Get-ChildItem 'C:\Program Files\Blender Foundation' -Filter blender.exe -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $BlenderExe -or -not (Test-Path $BlenderExe)) { throw "Blender executable was not found" }

& $BlenderExe --background $blendPath --python $inspectScript
if ($LASTEXITCODE -ne 0) { throw "Hero vehicle Blender inspection failed with exit code $LASTEXITCODE" }

Write-Host 'Hero vehicle source validation passed.'
