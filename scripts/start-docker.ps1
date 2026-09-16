param(
  [string]$HostIp,
  [switch]$Fresh
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($HostIp)) {
  $network = Get-NetIPConfiguration |
    Where-Object {
      $_.NetAdapter.Status -eq "Up" -and
      $null -ne $_.IPv4DefaultGateway -and
      $null -ne $_.IPv4Address
    } |
    Select-Object -First 1

  $HostIp = $network.IPv4Address |
    Where-Object { $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress
}

if ([string]::IsNullOrWhiteSpace($HostIp)) {
  Write-Error "Nao foi possivel detectar o IPv4 da rede. Execute novamente informando -HostIp, por exemplo: .\scripts\start-docker.ps1 -HostIp 192.168.1.100"
  exit 1
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $HostIp
Write-Host "Iniciando o Expo com o host $HostIp"

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  if ($Fresh) {
    Write-Host "Limpando caches do Metro e recriando containers para forçar bundle novo..."
    docker compose run --rm --build expo sh -c "rm -rf /app/node_modules/.cache/metro-cache /tmp/metro-* /tmp/haste-map-*"
    docker compose down --remove-orphans
  }
  docker compose up --build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}
finally {
  Pop-Location
}
