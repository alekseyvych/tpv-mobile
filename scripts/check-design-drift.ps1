param(
  [string]$RootPath = (Join-Path $PSScriptRoot "..\src"),
  [switch]$Verbose
)

$violations = [System.Collections.Generic.List[string]]::new()

$patterns = @(
  @{ Name = "Hardcoded hex color"; Pattern = '#[0-9A-Fa-f]{3,8}\b'; ExcludeFiles = @('theme','tokens'); Msg = "Use theme.colors.* instead of raw hex" },
  @{ Name = "Hardcoded rgb/rgba"; Pattern = 'rgba?\s*\('; ExcludeFiles = @('theme','tokens'); Msg = "Use theme.colors.* instead of rgb/rgba" },
  @{ Name = "Hardcoded fontFamily"; Pattern = 'fontFamily\s*:\s*[''"][A-Za-z ]'; ExcludeFiles = @('theme','tokens','typography'); Msg = "Use theme.typography.fontUi or fontMono" },
  @{ Name = "Hardcoded fontSize"; Pattern = 'fontSize\s*:\s*\d+'; ExcludeFiles = @('theme','tokens','typography'); Msg = "Use theme.typography.size*" },
  @{ Name = "Hardcoded lineHeight"; Pattern = 'lineHeight\s*:\s*\d+'; ExcludeFiles = @('theme','tokens','typography'); Msg = "Use theme.typography.lineHeight*" }
)

$files = Get-ChildItem -Path $RootPath -Recurse -Include "*.ts","*.tsx" |
  Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "__tests__" -and $_.FullName -notmatch "\.test\." }

foreach ($file in $files) {
  $relativePath = $file.FullName.Replace($RootPath, "").Replace("\", "/").TrimStart("/")
  $lineNum = 0
  foreach ($line in (Get-Content $file.FullName)) {
    $lineNum++
    if ($line -match "^\s*//" -or $line -match "^\s*\*") { continue }
    foreach ($rule in $patterns) {
      $skip = $false
      foreach ($ex in $rule.ExcludeFiles) { if ($relativePath -match $ex) { $skip = $true; break } }
      if ($skip) { continue }
      if ($line -match $rule.Pattern) {
        $loc = "${relativePath}:${lineNum}"
        $violations.Add("  [$loc] $($rule.Name) - $($rule.Msg)")
        if ($Verbose) { Write-Host "  VIOLATION [$loc]: $($line.Trim())" -ForegroundColor Yellow }
      }
    }
  }
}

if ($violations.Count -eq 0) {
  Write-Host "OK: No design drift in $($files.Count) files." -ForegroundColor Green
  exit 0
} else {
  Write-Host "DESIGN DRIFT DETECTED - $($violations.Count) violation(s):" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
  Write-Host ""
  Write-Host "Fix: use theme.colors.* / theme.spacing.* / theme.typography.* from src/components/theme/theme.ts" -ForegroundColor Cyan
  exit 1
}