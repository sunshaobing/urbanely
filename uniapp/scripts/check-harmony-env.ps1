$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestPath = Join-Path $projectRoot "src\manifest.json"
$modulePath = Join-Path $projectRoot "harmony-configs\entry\src\main\module.json5"

Write-Host "HarmonyOS environment check"
Write-Host "Project: $projectRoot"

if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "manifest.json not found"
}

if (-not (Test-Path -LiteralPath $modulePath)) {
  throw "harmony-configs module.json5 not found"
}

$devEcoCandidates = @(
  "$env:ProgramFiles\Huawei\DevEco Studio\bin\deveco-studio64.exe",
  "${env:ProgramFiles(x86)}\Huawei\DevEco Studio\bin\deveco-studio64.exe",
  "$env:LOCALAPPDATA\Huawei\DevEco Studio\bin\deveco-studio64.exe"
)
$devEco = $devEcoCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if ($devEco) {
  Write-Host "DevEco Studio: $devEco"
} else {
  Write-Warning "DevEco Studio 5.1+ was not found. Install it before local Harmony packaging."
}

$signingCandidates = @(
  (Join-Path $projectRoot "harmony-configs\build-profile.json5"),
  (Join-Path $projectRoot "unpackage\dist\build\app-harmony\build-profile.json5")
)
$signingFile = $signingCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if ($signingFile) {
  Write-Host "Signing profile: $signingFile"
} else {
  Write-Warning "Harmony signing profile was not found. Configure an AGC internal-test or enterprise certificate."
}

$hbuilder = "C:\HBuilderX\HBuilderX\cli.exe"
if (Test-Path -LiteralPath $hbuilder) {
  Write-Host "HBuilderX CLI: $hbuilder"
} else {
  Write-Warning "HBuilderX CLI was not found at $hbuilder"
}

Write-Host "Required permissions are present in harmony-configs/entry/src/main/module.json5."
Write-Host "Do not commit .p12, .cer, .p7b, passwords, or AGC private credentials."
