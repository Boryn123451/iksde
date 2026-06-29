param(
  [ValidateSet('dev', 'preview')]
  [string] $Mode = 'dev',
  [int] $StartPort = 5173,
  [string] $HostName = '127.0.0.1',
  [int] $MaxPortShift = 80
)

$ErrorActionPreference = 'Stop'
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $Global:PSNativeCommandUseErrorActionPreference = $false
}
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:NO_COLOR = '1'
$env:FORCE_COLOR = '0'
$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root 'logs'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogFile = Join-Path $LogDir "vite-$Mode-$Timestamp.log"

function Write-LogLine {
  param([string] $Message)
  Write-Host $Message
  Add-Content -Path $LogFile -Value $Message -Encoding UTF8
}

function Write-RunLog {
  param([string] $Message)
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Write-LogLine $line
}

function Invoke-NpmLogged {
  param([string[]] $Arguments)
  $oldPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & npm.cmd @Arguments 2>&1 | ForEach-Object {
      if ($_ -is [System.Management.Automation.ErrorRecord]) {
        $text = [string] $_.Exception.Message
      } else {
        $text = [string] $_
      }
      if ($text -and $text -ne 'System.Management.Automation.RemoteException') {
        Write-LogLine $text
      }
    }
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
  }
}

function Test-PortFree {
  param([int] $Port)
  $listener = $null
  try {
    $address = [System.Net.IPAddress]::Parse($HostName)
    $listener = [System.Net.Sockets.TcpListener]::new($address, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) {
      $listener.Stop()
    }
  }
}

function Find-FreePort {
  for ($port = $StartPort; $port -le ($StartPort + $MaxPortShift); $port++) {
    if (Test-PortFree -Port $port) {
      return $port
    }
    Write-RunLog "Port $port jest zajety, sprawdzam nastepny."
  }
  throw "Nie znaleziono wolnego portu w zakresie $StartPort-$($StartPort + $MaxPortShift)."
}

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Push-Location $Root
try {
  $port = Find-FreePort
  $url = "http://$HostName`:$port/"

  Write-RunLog "Root: $Root"
  Write-RunLog "Tryb: $Mode"
  Write-RunLog "Wybrany port: $port"
  Write-RunLog "URL: $url"
  Write-RunLog "Log: $LogFile"

  if ($Mode -eq 'preview') {
    Write-RunLog "Buduje aplikacje przed preview."
    $buildExit = Invoke-NpmLogged @('run', 'build')
    if ($buildExit -ne 0) {
      Write-RunLog "Build zakonczony bledem: $buildExit"
      exit $buildExit
    }
  }

  $viteArgs = if ($Mode -eq 'dev') {
    @('run', 'dev', '--', '--host', $HostName, '--port', "$port", '--strictPort')
  } else {
    @('run', 'preview', '--', '--host', $HostName, '--port', "$port", '--strictPort')
  }

  Write-RunLog "Start: npm $($viteArgs -join ' ')"
  Write-RunLog "Otworz w przegladarce: $url"
  $exit = Invoke-NpmLogged $viteArgs
  Write-RunLog "Proces zakonczony kodem: $exit"
  exit $exit
} catch {
  Write-RunLog "Blad uruchomienia: $($_.Exception.GetType().FullName): $($_.Exception.Message)"
  Write-RunLog "Szczegoly: $($_ | Out-String)"
  exit 1
} finally {
  Pop-Location
}
