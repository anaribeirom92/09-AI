[CmdletBinding()]
param([switch]$SkipNpmInstall)
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Worker = Join-Path $RepoRoot 'workers/video-ingest'
$Tools = Join-Path $RepoRoot '.local-tools'
$FfmpegRoot = Join-Path $Tools 'ffmpeg'
$Download = Join-Path $Tools 'ffmpeg-essentials.zip'
$BaseUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
Write-Host '[09 VIDEO AI] Preparando ferramentas locais gratuitas...' -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js não foi encontrado. O setup não instalará nada globalmente. Disponibilize Node.js 22+ no ambiente.' }
$NodeMajor = [int]((node --version).TrimStart('v').Split('.')[0])
if ($NodeMajor -lt 22) { throw "Node.js 22 ou superior é necessário. Versão detectada: $(node --version)" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm não foi encontrado junto ao Node.js.' }
if (-not (Test-Path (Join-Path $Worker 'package.json'))) { throw "Pasta do motor não encontrada: $Worker" }
New-Item -ItemType Directory -Force -Path $Tools | Out-Null
$FfmpegExe = Get-ChildItem -Path $FfmpegRoot -Filter 'ffmpeg.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$FfprobeExe = Get-ChildItem -Path $FfmpegRoot -Filter 'ffprobe.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $FfmpegExe -or -not $FfprobeExe) {
  Write-Host 'Baixando build portátil gratuito do FFmpeg (sem instalação no Windows)...'
  if (Test-Path $FfmpegRoot) { Remove-Item $FfmpegRoot -Recurse -Force }
  if (Test-Path $Download) { Remove-Item $Download -Force }
  Invoke-WebRequest -Uri $BaseUrl -OutFile $Download
  Expand-Archive -LiteralPath $Download -DestinationPath $FfmpegRoot -Force
  Remove-Item $Download -Force
  $FfmpegExe = Get-ChildItem -Path $FfmpegRoot -Filter 'ffmpeg.exe' -Recurse | Select-Object -First 1
  $FfprobeExe = Get-ChildItem -Path $FfmpegRoot -Filter 'ffprobe.exe' -Recurse | Select-Object -First 1
  if (-not $FfmpegExe -or -not $FfprobeExe) { throw 'O pacote baixado não contém ffmpeg.exe e ffprobe.exe.' }
}
$FfmpegExe.FullName | Set-Content -Encoding UTF8 (Join-Path $Tools 'ffmpeg-path.txt')
$FfprobeExe.FullName | Set-Content -Encoding UTF8 (Join-Path $Tools 'ffprobe-path.txt')
if (-not $SkipNpmInstall) {
  Push-Location $Worker
  try {
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install falhou (código $LASTEXITCODE)." }
    npm test
    if ($LASTEXITCODE -ne 0) { throw "Os testes do motor falharam (código $LASTEXITCODE)." }
  } finally { Pop-Location }
}
& $FfmpegExe.FullName -version | Select-Object -First 1
& $FfprobeExe.FullName -version | Select-Object -First 1
Write-Host "`nPreparação concluída. Ferramentas ficam dentro de .local-tools e dependências dentro de workers/video-ingest/node_modules." -ForegroundColor Green
Write-Host 'Nenhum serviço pago, chave de API ou instalação global foi usado.'
