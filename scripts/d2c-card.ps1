param(
  [Parameter(Mandatory)][ValidatePattern('^\\\\\?\\Volume\{[a-fA-F0-9-]{36}\}\\$')][string]$VolumeId,
  [Parameter(Mandatory)][ValidatePattern('^[0-9A-Fa-f]{8}$')][string]$Serial,
  [Parameter(Mandatory)][ValidatePattern('^d2c-[0-9]{13}-[a-f0-9]{8}$')][string]$RunId,
  [string]$Archive,
  [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedHash
)
$ErrorActionPreference = 'Stop'
$dir = [IO.Path]::Combine($VolumeId,'WorkMatchr-Archief')
$final = [IO.Path]::Combine($dir,"$RunId.gpg")
$partial = "$final.partial"
function Assert-Card {
  $v = Get-Volume -DriveLetter D
  $logical = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='D:'"
  if ($v.UniqueId -ne $VolumeId -or $v.FileSystemType -ne 'NTFS' -or $logical.VolumeSerialNumber -ne $Serial) {
    throw 'Unexpected archive volume'
  }
  $folder = [IO.DirectoryInfo]::new($dir)
  if (!$folder.Exists -or $folder.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint)) { throw 'Unsafe archive folder' }
  $acl = [IO.FileSystemAclExtensions]::GetAccessControl($folder)
  $operator = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $rules = $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])
  if (!$acl.AreAccessRulesProtected -or !$rules.Count) { throw 'Missing protected ACL' }
  foreach ($rule in $rules) {
    if ($rule.IdentityReference.Value -notin @($operator,'S-1-5-18')) { throw 'Unexpected archive access' }
  }
}
Assert-Card
if ([IO.File]::Exists($partial) -or [IO.File]::Exists($final)) { throw 'Run already present or incomplete' }
if (!$Archive) { return }
if (!$ExpectedHash -or [IO.Path]::GetFileName($Archive) -cne 'backup.dump.gpg' -or $Archive -notmatch '^[Cc]:\\') {
  throw 'Expected completed local ciphertext'
}
$source = [IO.File]::Open($Archive,'Open','Read','Read')
try {
  $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($source))
  if ($hash -ne $ExpectedHash -or !$source.Length) { throw 'Local archive mismatch' }
  $source.Position = 0
  Assert-Card
  $dest = [IO.File]::Open($partial,'CreateNew','ReadWrite','None')
  try {
    # Open volume-GUID handle cannot be redirected by reassignment of D:.
    Assert-Card
    $source.CopyTo($dest)
    $dest.Flush($true)
    $dest.Position = 0
    if ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($dest)) -ne $hash) { throw 'Copy mismatch' }
  } finally { $dest.Dispose() }
  Assert-Card
  [IO.File]::Move($partial,$final,$false)
  Assert-Card
  if ((Get-FileHash -LiteralPath $final).Hash -ne $hash) { throw 'Final archive mismatch' }
} finally { $source.Dispose() }
