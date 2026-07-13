[CmdletBinding()]
param([string]$BlenderExe=$env:BLENDER_EXE)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if(-not $BlenderExe){$BlenderExe=Get-ChildItem 'C:\Program Files\Blender Foundation' -Filter blender.exe -Recurse -ErrorAction SilentlyContinue|Select-Object -First 1 -ExpandProperty FullName}
if(-not $BlenderExe){throw 'Blender executable was not found.'}
& $BlenderExe --background --python (Join-Path $root 'SourceArt\Characters\Hero\generate_hero_character.py')
if($LASTEXITCODE -ne 0){throw "Hero character generation failed with exit code $LASTEXITCODE"}
