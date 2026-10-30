# Synthetic key wrapping only; no real secret, file, registry or Credential Manager writes.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$bytes=New-Object byte[] 32
$entropy=New-Object byte[] 32
$rng=[Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes); $rng.GetBytes($entropy)
try {
  $wrapped=[Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $plain=[Security.Cryptography.ProtectedData]::Unprotect($wrapped,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  if (-not [Linq.Enumerable]::SequenceEqual([byte[]]$bytes,[byte[]]$plain)) { throw 'Roundtrip mismatch' }
  $wrong=New-Object byte[] 32
  $denied=$false
  try { $unexpected=[Security.Cryptography.ProtectedData]::Unprotect($wrapped,$wrong,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Array]::Clear($unexpected,0,$unexpected.Length) } catch { $denied=$true }
  if (-not $denied) { throw 'Wrong entropy accepted' }
  @{ status='PASS'; syntheticOnly=$true; currentUserDpapiRoundtrip=$true; wrongEntropyRejected=$true; credentialManagerChanged=$false; crossHostRecoveryProven=$false; productionKeyCreated=$false } | ConvertTo-Json
} finally {
  foreach($buffer in @($bytes,$entropy,$plain,$wrapped)) { if($buffer) { [Array]::Clear($buffer,0,$buffer.Length) } }
  $rng.Dispose()
}
