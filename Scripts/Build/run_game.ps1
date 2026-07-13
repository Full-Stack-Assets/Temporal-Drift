[CmdletBinding()]
param([int]$Width = 1280, [int]$Height = 720, [string]$Map = '/Game/Levels/LVL_TimeTravelTest')

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$project = Join-Path $root 'BTTF_TemporalDrift.uproject'
$editor = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe'
if (-not (Test-Path $editor)) { throw "Unreal Editor was not found at $editor" }
if ($Width -lt 800 -or $Height -lt 600) { throw 'Test window must be at least 800x600.' }

$process = Start-Process $editor -ArgumentList @($project, $Map, '-game', '-windowed', "-ResX=$Width", "-ResY=$Height", '-ForceRes', '-nosplash') -PassThru
$deadline = (Get-Date).AddSeconds(60)
do {
    $process.Refresh()
    if ($process.MainWindowHandle -ne 0) { break }
    Start-Sleep -Milliseconds 500
} while ((Get-Date) -lt $deadline -and -not $process.HasExited)
if ($process.HasExited) { throw "The game exited during startup with code $($process.ExitCode)." }
if ($process.MainWindowHandle -eq 0) { throw 'The game window did not appear within 60 seconds.' }

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class TemporalDriftWindow {
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr handle, int x, int y, int width, int height, bool repaint);
}
'@
if (-not [TemporalDriftWindow]::MoveWindow($process.MainWindowHandle, 40, 40, $Width, $Height, $true)) { throw 'Windows could not resize the game window.' }
Write-Host "Temporal Drift test window opened at ${Width}x${Height}. Process $($process.Id)."
