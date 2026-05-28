param(
  [Parameter(Mandatory = $true)]
  [string]$AvdName,
  [switch]$WipeData
)

$ErrorActionPreference = "Stop"

function Resolve-SdkToolPath {
  param([string]$RelativePath)

  $candidates = @()
  if ($env:ANDROID_SDK_ROOT) { $candidates += $env:ANDROID_SDK_ROOT }
  if ($env:ANDROID_HOME) { $candidates += $env:ANDROID_HOME }
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk") }

  foreach ($root in $candidates) {
    $tool = Join-Path $root $RelativePath
    if (Test-Path $tool) {
      return $tool
    }
  }

  return $null
}

function Get-OnlineEmulatorSerial {
  param([string]$AdbPath)

  $output = & $AdbPath devices
  if (-not $output) { return $null }

  foreach ($line in $output) {
    if ($line -match '^emulator-[0-9]+\s+device$') {
      return ($line -split '\s+')[0]
    }
  }

  return $null
}

$emulatorPath = Resolve-SdkToolPath "emulator\emulator.exe"
$adbPath = Resolve-SdkToolPath "platform-tools\adb.exe"

if (-not $emulatorPath) {
  throw "Could not find emulator.exe. Set ANDROID_SDK_ROOT or install Android SDK."
}

if (-not $adbPath) {
  throw "Could not find adb.exe. Set ANDROID_SDK_ROOT or install Android platform-tools."
}

Write-Host "[mobile] Restarting ADB server..."
& $adbPath kill-server | Out-Null
& $adbPath start-server | Out-Null

$emulatorArgs = @("-avd", $AvdName, "-no-snapshot-load", "-no-snapshot-save", "-gpu", "angle_indirect")
if ($WipeData) {
  $emulatorArgs = @("-avd", $AvdName, "-wipe-data", "-no-snapshot-load", "-no-snapshot-save", "-gpu", "angle_indirect")
}

Write-Host "[mobile] Launching emulator $AvdName..."
Start-Process -FilePath $emulatorPath -ArgumentList $emulatorArgs -WindowStyle Normal | Out-Null

Write-Host "[mobile] Waiting for emulator to become online in adb..."
$onlineTimeout = (Get-Date).AddMinutes(5)
$serial = $null
while ((Get-Date) -lt $onlineTimeout) {
  $serial = Get-OnlineEmulatorSerial -AdbPath $adbPath
  if ($serial) {
    Write-Host "[mobile] Emulator online: $serial"
    break
  }

  Start-Sleep -Seconds 2
}

if (-not $serial) {
  throw "Timed out waiting for emulator to appear online in adb."
}

Write-Host "[mobile] Waiting for Android boot completion..."
$bootTimeout = (Get-Date).AddMinutes(10)
while ((Get-Date) -lt $bootTimeout) {
  $serial = Get-OnlineEmulatorSerial -AdbPath $adbPath
  if (-not $serial) {
    Write-Host "[mobile] Emulator temporarily unavailable in adb, waiting..."
    Start-Sleep -Seconds 2
    continue
  }

  $sysBoot = (& $adbPath -s $serial shell getprop sys.boot_completed).Trim()
  if ($sysBoot -eq "1") {
    Write-Host "[mobile] Emulator boot completed."
    break
  }

  Start-Sleep -Seconds 2
}

$sysBootFinal = (& $adbPath -s $serial shell getprop sys.boot_completed).Trim()
if ($sysBootFinal -ne "1") {
  throw "Timed out waiting for Android to finish booting."
}

Write-Host "[mobile] Starting Expo on Android..."
npx expo start --android
