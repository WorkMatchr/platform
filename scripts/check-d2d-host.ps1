# Read-only, sanitized inventory. No identities, remote endpoints, secrets or configuration writes.
$ErrorActionPreference = 'Stop'
function Observe([scriptblock]$Read) {
  try { & $Read } catch { @{ status='UNVERIFIED'; reason=$_.Exception.GetType().Name } }
}
$report = [ordered]@{ observedAt=[DateTime]::UtcNow.ToString('o'); readOnly=$true }
$report.os = Observe {
  $os=Get-CimInstance Win32_OperatingSystem
  @{ caption=$os.Caption; version=$os.Version; build=$os.BuildNumber; lastBoot=$os.LastBootUpTime.ToUniversalTime().ToString('o') }
}
$report.hotfix = Observe { Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 3 HotFixID,InstalledOn }
$report.bitlocker = Observe { Get-BitLockerVolume -MountPoint C: | Select-Object MountPoint,VolumeStatus,ProtectionStatus,EncryptionPercentage }
$report.firewall = Observe { Get-NetFirewallProfile | Select-Object Name,Enabled,DefaultInboundAction,DefaultOutboundAction }
$report.defender = Observe { Get-MpComputerStatus | Select-Object AMServiceEnabled,AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated,IsTamperProtected }
$report.users = Observe {
  $users=@(Get-LocalUser); $group=Get-LocalGroup -SID 'S-1-5-32-544'
  @{ enabledLocalUsers=@($users | Where-Object Enabled).Count; administratorCount=@(Get-LocalGroupMember -Group $group).Count; identitiesSuppressed=$true }
}
$report.remoteAccess = Observe {
  @{ rdpDenied=(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server').fDenyTSConnections;
     runningRemoteServiceCount=@(Get-Service | Where-Object { $_.Status -eq 'Running' -and $_.Name -match 'AnyDesk|TeamViewer|RustDesk|VNC|sshd|TermService' }).Count;
     runningRemoteProcessCount=@(Get-Process | Where-Object ProcessName -match 'AnyDesk|TeamViewer|RustDesk|VNC|QuickAssist').Count }
}
$report.shares = Observe {
  $shares=@(Get-SmbShare)
  @{ total=$shares.Count; nonAdministrative=@($shares | Where-Object { -not $_.Special }).Count;
     recoveryPathShared=@($shares | Where-Object { $_.Path -and (Join-Path $env:LOCALAPPDATA 'WorkMatchr/production-recovery').StartsWith($_.Path, [StringComparison]::OrdinalIgnoreCase) }).Count }
}
$report.crashAndSwap = Observe {
  $crash=Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\CrashControl'
  @{ crashDumpEnabled=$crash.CrashDumpEnabled; pagefileCount=@(Get-CimInstance Win32_PageFileUsage).Count; wslConfigExists=(Test-Path -LiteralPath (Join-Path $env:USERPROFILE '.wslconfig')); swapEncryptionVerified=$false }
}
$report.storage = Observe { & "$PSScriptRoot/check-d2c-storage.ps1" | ConvertFrom-Json }
$report.docker = Observe { docker info --format '{{json .}}' | ConvertFrom-Json | Select-Object ServerVersion,OSType,OperatingSystem,MemTotal,NCPU,Driver,DockerRootDir }
$report.productionDataAccepted=$false
$report | ConvertTo-Json -Depth 7
