param([string]$ArchiveRoot = (Join-Path $env:LOCALAPPDATA 'WorkMatchr/production-recovery'))
# Read-only. Does not create folders, change ACLs, enable encryption or register tasks.
$ErrorActionPreference = 'Stop'
$resolved = [System.IO.Path]::GetFullPath($ArchiveRoot)
$outsideSyncAndRepository = $resolved -notmatch '(?i)(OneDrive|worktrees|\.git|Documenten)'
$directoryExists = Test-Path -LiteralPath $resolved -PathType Container
$reparse = $false
$ancestor = $resolved
while ($ancestor) {
  if (Test-Path -LiteralPath $ancestor) {
    if ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint) { $reparse = $true }
  }
  $ancestor = [IO.Path]::GetDirectoryName($ancestor.TrimEnd('\'))
}
$aclRestricted = $false
if ($directoryExists) {
  $acl = Get-Acl -LiteralPath $resolved
  $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $rules = @($acl.Access | ForEach-Object { $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value })
  $aclRestricted = $acl.AreAccessRulesProtected -and $rules.Count -gt 0 -and @($rules | Where-Object { $_ -notin @($sid, 'S-1-5-18') }).Count -eq 0
}
$drive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($resolved).Substring(0,1))
$bitLocker = 'UNVERIFIED'
try {
  $volume = Get-BitLockerVolume -MountPoint ([IO.Path]::GetPathRoot($resolved)) -ErrorAction Stop
  $bitLocker = if ($volume.ProtectionStatus -eq 'On' -and $volume.EncryptionPercentage -eq 100) { 'VERIFIED_ON' } else { 'NOT_PROTECTED' }
} catch { $bitLocker = 'UNVERIFIED' }
[pscustomobject]@{
  ArchiveRoot=$resolved; Exists=$directoryExists; OutsideSyncAndRepository=$outsideSyncAndRepository
  ReparsePointInPath=$reparse; OperatorAndSystemAclOnly=$aclRestricted
  FreeBytes=$drive.Free; MinimumFiveGiBAvailable=($drive.Free -ge 5GB); BitLocker=$bitLocker
  RetentionAutomationVerified=$false; IndependentKeyCustodyVerified=$false
  ProductionStorageReady=$false # Requires separate operator/retention/key-custody acceptance.
} | ConvertTo-Json
