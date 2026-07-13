[CmdletBinding()]
param(
    [ValidateSet('Development', 'Shipping')]
    [string]$Configuration = 'Development',
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [switch]$SkipPackage
)

$ErrorActionPreference = 'Stop'

$ArchiveDirectory = Join-Path $ProjectRoot "Builds\Windows-$Configuration"
$Executable = Join-Path $ArchiveDirectory 'BTTF_TemporalDrift\Binaries\Win64\BTTF_TemporalDrift.exe'

if (-not $SkipPackage) {
    if (-not (Test-Path -LiteralPath $Executable)) {
        Write-Host "Package artifact missing; running package_windows.ps1 ($Configuration)"
        & (Join-Path $PSScriptRoot 'package_windows.ps1') -Configuration $Configuration -OutputDirectory $ArchiveDirectory
        if ($LASTEXITCODE -ne 0) {
            throw "Packaging failed with exit code $LASTEXITCODE"
        }
    }
}

if (-not (Test-Path -LiteralPath $Executable)) {
    throw "Packaged executable not found: $Executable"
}

$LogPath = Join-Path $ProjectRoot "Saved/Logs/PackageSmoke-$Configuration.log"
New-Item -ItemType Directory -Force -Path (Split-Path $LogPath) | Out-Null

Write-Host "==> Launching packaged smoke test ($Configuration)"
Write-Host "Executable: $Executable"

Push-Location (Split-Path $Executable)
try {
    & $Executable -nullrhi -nosound -unattended -log -ExecCmds=quit 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) {
        throw "Packaged executable exited with code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

Write-Host "PACKAGE_SMOKE_TEST_SUCCESS configuration=$Configuration"
