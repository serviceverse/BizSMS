# bizSMS Android APK Builder
$ErrorActionPreference = "Continue"

$projectRoot = "D:\serviceverse\bizSMS"
$androidDir = Join-Path $projectRoot "android"

# Setup environment variables
$nodeDir = "C:\Users\Lenovo\AppData\Local\nvm\v22.15.0"
$jdkDir = "C:\Program Files\Microsoft\jdk-17.0.15.6-hotspot"
$platformTools = "C:\Users\Lenovo\AppData\Local\Android\Sdk\platform-tools"

$env:JAVA_HOME = $jdkDir
$env:Path = "$nodeDir;$platformTools;$jdkDir\bin;" + $env:Path

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  bizSMS Android APK Builder" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Ensure rn-config.json exists
Set-Location $projectRoot
& cmd.exe /c "npx react-native config > rn-config.json"
Write-Host "rn-config.json refreshed." -ForegroundColor Green

# Build Release APK
Set-Location $androidDir
Write-Host "Starting Gradle assembleRelease..." -ForegroundColor Cyan
& .\gradlew.bat assembleRelease --no-daemon

$builtApk = Join-Path $androidDir "app\build\outputs\apk\release\app-release.apk"
$outputApk = Join-Path $projectRoot "bizSMS-release.apk"

if (Test-Path $builtApk) {
    Copy-Item -Path $builtApk -Destination $outputApk -Force
    $sizeMb = [math]::Round(((Get-Item $outputApk).Length / 1MB), 2)
    Write-Host "=============================================" -ForegroundColor Green
    Write-Host " BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host " Standalone APK ready for installation: $outputApk ($sizeMb MB)" -ForegroundColor Green
    Write-Host "=============================================" -ForegroundColor Green
} else {
    Write-Error "Build finished but app-release.apk was not found."
}
