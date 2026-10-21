$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
& (Join-Path $PSScriptRoot "check-harmony-env.ps1")

$hbuilder = "C:\HBuilderX\HBuilderX\cli.exe"
if (-not (Test-Path -LiteralPath $hbuilder)) {
  throw "HBuilderX CLI not found: $hbuilder"
}

& $hbuilder pack app-harmony --project $projectRoot
