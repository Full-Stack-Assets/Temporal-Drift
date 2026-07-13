[CmdletBinding()]
param([string]$BlenderExe = $env:BLENDER_EXE)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if(-not $BlenderExe){$BlenderExe=Get-ChildItem 'C:\Program Files\Blender Foundation' -Filter blender.exe -Recurse -ErrorAction SilentlyContinue|Select-Object -First 1 -ExpandProperty FullName}
if(-not $BlenderExe -or -not(Test-Path $BlenderExe)){throw 'Blender executable was not found. Set BLENDER_EXE.'}
$script=Join-Path $root 'SourceArt\Vehicles\DeLorean\generate_hero_vehicle.py'
& $BlenderExe --background --python $script
if($LASTEXITCODE -ne 0){throw "Blender generation failed with exit code $LASTEXITCODE"}
& (Join-Path $root 'Scripts\Tests\test_hero_vehicle_source.ps1') -BlenderExe $BlenderExe
