[CmdletBinding()]
param(
    [ValidateSet('Development', 'Shipping')]
    [string]$Configuration = 'Development',
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ProjectFile = Join-Path $ProjectRoot 'BTTF_TemporalDrift.uproject'
$RunUAT = 'C:\Program Files\Epic Games\UE_5.8\Engine\Build\BatchFiles\RunUAT.bat'

if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $ProjectRoot "Builds\Windows-$Configuration"
}

if (-not (Test-Path -LiteralPath $RunUAT)) {
    throw "Unreal Engine 5.8 automation tool was not found: $RunUAT"
}

& $RunUAT BuildCookRun "-project=$ProjectFile" -noP4 -platform=Win64 "-clientconfig=$Configuration" -build -cook -stage -pak -archive "-archivedirectory=$OutputDirectory"
if ($LASTEXITCODE -ne 0) {
    throw "Windows package failed with exit code $LASTEXITCODE"
}
