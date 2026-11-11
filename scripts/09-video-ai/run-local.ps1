[CmdletBinding()]
param(
 [Parameter(Mandatory=$true)][string]$InputVideo,
 [Parameter(Mandatory=$true)][string]$OutputVideo,
 [ValidateSet('9:16','16:9','1:1')][string]$Aspect = '9:16',
 [ValidateSet(720,1080,1440,2160)][int]$Height = 1080,
 [string]$Captions,[string]$Titles,[string]$EditPlan,[switch]$AnalyzeOnly
)
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Worker = Join-Path $RepoRoot 'workers/video-ingest'
$FfmpegPathFile = Join-Path $RepoRoot '.local-tools/ffmpeg-path.txt'
$FfprobePathFile = Join-Path $RepoRoot '.local-tools/ffprobe-path.txt'
if (-not (Test-Path $FfmpegPathFile) -or -not (Test-Path $FfprobePathFile)) { throw 'Ferramentas locais ausentes. Execute scripts/09-video-ai/setup-local.ps1 primeiro.' }
$env:PATH = "$(Split-Path -Parent (Get-Content $FfmpegPathFile -Raw).Trim());$(Split-Path -Parent (Get-Content $FfprobePathFile -Raw).Trim());$env:PATH"
Push-Location $Worker
try {
 npm run build
 if ($LASTEXITCODE -ne 0) { throw 'Build do motor falhou.' }
 $Args = @('--input',(Resolve-Path $InputVideo).Path,'--aspect',$Aspect,'--height',"$Height")
 if ($AnalyzeOnly) { $Args += '--analyze-only' } else {
  $Parent = Split-Path -Parent $OutputVideo
  if ($Parent) { New-Item -ItemType Directory -Force -Path $Parent | Out-Null }
  $Args += @('--output',[IO.Path]::GetFullPath($OutputVideo))
 }
 if ($Captions) { $Args += @('--captions',[IO.Path]::GetFullPath($Captions)) }
 if ($Titles) { $Args += @('--titles',[IO.Path]::GetFullPath($Titles)) }
 if ($EditPlan) { $Args += @('--edit-plan',[IO.Path]::GetFullPath($EditPlan)) }
 node (Join-Path $Worker 'dist/index.js') @Args
 if ($LASTEXITCODE -ne 0) { throw 'Processamento do vídeo falhou.' }
} finally { Pop-Location }
