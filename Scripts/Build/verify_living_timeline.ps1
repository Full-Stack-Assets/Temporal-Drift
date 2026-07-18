[CmdletBinding()]
param(
    [switch]$RunFullSuite,
    [switch]$PackageDevelopment
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$BlockingProcesses = @(
    'UnrealEditor',
    'UnrealEditor-Cmd',
    'LiveCodingConsole',
    'UnrealBuildTool'
)

$Running = foreach ($ProcessName in $BlockingProcesses) {
    Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
}

if ($Running) {
    $Names = ($Running | Select-Object -ExpandProperty ProcessName -Unique) -join ', '
    throw "Unreal has not released the module. Close the editor, commandlets, Live Coding, and build processes first. Running: $Names"
}

Push-Location $ProjectRoot
try {
    Write-Host '=== Living Timeline verification context ==='
    git branch --show-current
    git status --short

    Write-Host '=== UE 5.8 editor build ==='
    & (Join-Path $PSScriptRoot 'build_editor.ps1') -Configuration Development

    Write-Host '=== Living Timeline automation ==='
    & (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter 'BTTF.TemporalKernel'

    Write-Host '=== Existing timeline regression ==='
    & (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter 'BTTF.Timeline'

    Write-Host '=== Save regression ==='
    & (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter 'BTTF.Save'

    if ($RunFullSuite) {
        Write-Host '=== Full BTTF automation suite ==='
        & (Join-Path $PSScriptRoot 'run_automation.ps1') -Filter 'BTTF'
    }

    if ($PackageDevelopment) {
        Write-Host '=== Development package ==='
        & (Join-Path $PSScriptRoot 'package_windows.ps1') -Configuration Development
        & (Join-Path $PSScriptRoot 'package_smoke_test.ps1') -Configuration Development
    }

    Write-Host 'Living Timeline verification commands completed without a reported failure.'
}
finally {
    Pop-Location
}
