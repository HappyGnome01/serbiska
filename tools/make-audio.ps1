# =====================================================================
# make-audio.ps1 – skapar AI-ljudfiler till alla ord och meningar.
# Körs på datorn, inte i appen. Filerna hamnar i audio/ och listas i data/audio.json.
#
# Kräver en nyckel till Azure Speech (gratisnivån räcker). Nyckeln skrivs aldrig in i en fil:
#   $env:AZURE_SPEECH_KEY = "..."      (din nyckel)
#   $env:AZURE_SPEECH_REGION = "..."   (t.ex. westeurope eller swedencentral)
#   .\tools\make-audio.ps1
#
# Redan skapade filer hoppas över, så skriptet kan köras igen när nya ord läggs till.
# Byt röst med -Voice, t.ex. -Voice sr-Latn-RS-SophieNeural.
# =====================================================================
param(
  [string]$Voice = "bs-BA-VesnaNeural",  # Bosnisk röst, läser ijekaviska i latin
  [string]$Rate = "-10%"                  # Lite långsammare än vanligt tal
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (-not $env:AZURE_SPEECH_KEY -or -not $env:AZURE_SPEECH_REGION) {
  throw "Sätt AZURE_SPEECH_KEY och AZURE_SPEECH_REGION först, se början av filen."
}

$root = Split-Path -Parent $PSScriptRoot
$utf8 = New-Object Text.UTF8Encoding $false
$audioDir = Join-Path $root "audio"
New-Item -ItemType Directory -Force $audioDir | Out-Null

$items = @()
$items += [IO.File]::ReadAllText((Join-Path $root "data\words.json"), $utf8) | ConvertFrom-Json
$items += [IO.File]::ReadAllText((Join-Path $root "data\sentences.json"), $utf8) | ConvertFrom-Json

$url = "https://$($env:AZURE_SPEECH_REGION).tts.speech.microsoft.com/cognitiveservices/v1"
$headers = @{
  "Ocp-Apim-Subscription-Key" = $env:AZURE_SPEECH_KEY
  "X-Microsoft-OutputFormat"  = "audio-24khz-48kbitrate-mono-mp3"
  "User-Agent"                = "serbiska-app"
}
$lang = ($Voice -split "-")[0..1] -join "-"

$made = 0
foreach ($item in $items) {
  $file = Join-Path $audioDir "$($item.id).mp3"
  if (Test-Path $file) { continue }
  $text = [Security.SecurityElement]::Escape($item.sr)
  $ssml = "<speak version='1.0' xml:lang='$lang'><voice name='$Voice'><prosody rate='$Rate'>$text</prosody></voice></speak>"
  for ($try = 1; $try -le 3; $try++) {
    try {
      Invoke-WebRequest $url -Method Post -Headers $headers -ContentType "application/ssml+xml" `
        -Body $utf8.GetBytes($ssml) -OutFile $file -UseBasicParsing
      break
    } catch {
      if ($try -eq 3) { throw "Kunde inte skapa $($item.id): $($_.Exception.Message)" }
      [Threading.Thread]::Sleep(3000 * $try)  # Tjänsten begränsar hur ofta man får fråga
    }
  }
  $made++
  if ($made % 50 -eq 0) { "$made filer skapade..." }
}

# Listan som appen läser för att veta vilka ord som har en ljudfil
$ids = Get-ChildItem $audioDir -Filter *.mp3 | ForEach-Object { '"' + $_.BaseName + '"' } | Sort-Object
[IO.File]::WriteAllText((Join-Path $root "data\audio.json"), "[" + ($ids -join ", ") + "]`n", $utf8)
"Klart: $made nya filer, $($ids.Count) totalt."
