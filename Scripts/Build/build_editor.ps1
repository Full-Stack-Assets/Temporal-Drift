[CmdletBinding()]
param(
    [ValidateSet('Development', 'DebugGame')]
    [string]$Configuration = 'Development'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ProjectFile = Join-Path $ProjectRoot 'BTTF_TemporalDrift.uproject'
$BuildTool = 'C:\Program Files\Epic Games\UE_5.8\Engine\Build\BatchFiles\Build.bat'

if (-not (Test-Path -LiteralPath $BuildTool)) {
    throw "Unreal Engine 5.8 build tool was not found: $BuildTool"
}

& $BuildTool BTTF_TemporalDriftEditor Win64 $Configuration "-Project=$ProjectFile" -WaitMutex -NoHotReloadFromIDE
if ($LASTEXITCODE -ne 0) {
    throw "Unreal Editor build failed with exit code $LASTEXITCODE"
}
