param(
    [string]$Manifest = "SourceArt\Audio\Music\MusicIntakeManifest.json",
    [string]$OutputDir = "SourceArt\Audio\Music\Intake",
    [int]$Seconds = 24
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Text;

public static class TemporalDriftWav
{
    public static void WriteToneBed(string path, int sampleRate, int seconds, double baseHz, double secondHz, double pulseHz, double noiseAmount)
    {
        int channels = 2;
        int bitsPerSample = 16;
        int samples = sampleRate * seconds;
        int byteRate = sampleRate * channels * bitsPerSample / 8;
        int blockAlign = channels * bitsPerSample / 8;
        int dataSize = samples * blockAlign;
        Random rng = new Random(path.GetHashCode());
        using (var fs = new FileStream(path, FileMode.Create, FileAccess.Write))
        using (var bw = new BinaryWriter(fs))
        {
            bw.Write(Encoding.ASCII.GetBytes("RIFF"));
            bw.Write(36 + dataSize);
            bw.Write(Encoding.ASCII.GetBytes("WAVE"));
            bw.Write(Encoding.ASCII.GetBytes("fmt "));
            bw.Write(16);
            bw.Write((short)1);
            bw.Write((short)channels);
            bw.Write(sampleRate);
            bw.Write(byteRate);
            bw.Write((short)blockAlign);
            bw.Write((short)bitsPerSample);
            bw.Write(Encoding.ASCII.GetBytes("data"));
            bw.Write(dataSize);
            for (int i = 0; i < samples; i++)
            {
                double t = (double)i / sampleRate;
                double pulse = 0.55 + 0.45 * Math.Sin(2.0 * Math.PI * pulseHz * t);
                double tone =
                    0.42 * Math.Sin(2.0 * Math.PI * baseHz * t) +
                    0.25 * Math.Sin(2.0 * Math.PI * secondHz * t) +
                    0.10 * Math.Sin(2.0 * Math.PI * (baseHz * 2.01) * t);
                double noise = ((rng.NextDouble() * 2.0) - 1.0) * noiseAmount;
                double fadeIn = Math.Min(1.0, t / 2.0);
                double fadeOut = Math.Min(1.0, (seconds - t) / 2.0);
                double env = Math.Min(fadeIn, fadeOut);
                short value = (short)Math.Max(short.MinValue, Math.Min(short.MaxValue, (tone * pulse + noise) * env * 9000.0));
                bw.Write(value);
                bw.Write((short)(value * 0.92));
            }
        }
    }
}
"@

$data = Get-Content -Raw -LiteralPath $Manifest | ConvertFrom-Json

foreach ($track in $data.tracks) {
    $path = Join-Path $OutputDir $track.file
    switch ($track.era) {
        "WildWest1885" { $base = 146.83; $second = 196.00; $pulse = 0.45; $noise = if ($track.type -eq "ambience") { 0.18 } else { 0.03 } }
        "Past1955" { $base = 220.00; $second = 277.18; $pulse = 1.25; $noise = if ($track.type -eq "ambience") { 0.10 } else { 0.02 } }
        "Present1985" { $base = 164.81; $second = 329.63; $pulse = 2.00; $noise = if ($track.type -eq "ambience") { 0.12 } else { 0.02 } }
        "Alternate1985" { $base = 82.41; $second = 123.47; $pulse = 0.70; $noise = if ($track.type -eq "ambience") { 0.25 } else { 0.06 } }
        "Future2015" { $base = 246.94; $second = 493.88; $pulse = 1.60; $noise = if ($track.type -eq "ambience") { 0.08 } else { 0.015 } }
        "DeepFuture2045" { $base = 110.00; $second = 440.00; $pulse = 0.90; $noise = if ($track.type -eq "ambience") { 0.16 } else { 0.03 } }
        default { $base = 180.00; $second = 270.00; $pulse = 1.00; $noise = 0.03 }
    }
    if ($track.type -eq "ambience") {
        $base = $base / 2.0
        $second = $second / 2.0
    }
    [TemporalDriftWav]::WriteToneBed((Resolve-Path -LiteralPath $OutputDir).Path + "\" + $track.file, 44100, $Seconds, $base, $second, $pulse, $noise)
    Write-Host "generated $($track.file)"
}
