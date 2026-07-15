param(
    [string]$Manifest = "SourceArt\Audio\GeneratedVoice\FirstTierVoiceLines.json",
    [string]$OutputDir = "SourceArt\Audio\GeneratedVoice\WAV"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$data = Get-Content -Raw -LiteralPath $Manifest | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$installedVoices = @($synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name })

function Select-VoiceForCast($index) {
    if ($installedVoices.Count -eq 0) { return $null }
    return $installedVoices[$index % $installedVoices.Count]
}

$castIndex = 0
$written = @()
foreach ($character in $data.cast) {
    $voice = Select-VoiceForCast $castIndex
    if ($voice) {
        $synth.SelectVoice($voice)
    }
    foreach ($line in $character.lines) {
        $file = Join-Path $OutputDir ($line.id + ".wav")
        $synth.Rate = if ($character.id -eq "Vale") { 2 } elseif ($character.id -eq "Silas") { -2 } else { 0 }
        $synth.Volume = 95
        $synth.SetOutputToWaveFile((Resolve-Path -LiteralPath $OutputDir).Path + "\" + ($line.id + ".wav"))
        $synth.Speak($line.text)
        $synth.SetOutputToNull()
        $written += [pscustomobject]@{
            id = $line.id
            character = $character.id
            display_name = $character.display_name
            voice = $voice
            path = $file
        }
    }
    $castIndex += 1
}

$synth.Dispose()
$written | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $OutputDir "GeneratedVoiceManifest.json")
$written | Format-Table -AutoSize
