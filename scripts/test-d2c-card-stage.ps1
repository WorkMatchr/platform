# Windows host acceptance. Both identifiers must come from the operator's private policy.
param([Parameter(Mandatory)][string]$VolumeId,[Parameter(Mandatory)][string]$Serial,[switch]$Online)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$suffix = [guid]::NewGuid().ToString('N').Substring(0,8)
$runId = "d2c-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$suffix"
$client = "d2c-client-$($runId.Substring(4))"
$image = 'postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5'
$root = Join-Path $env:LOCALAPPDATA 'WorkMatchr\ops07-synthetic'
$dir = Join-Path $root $runId
$keyHome = "/dev/shm/$runId"
$cardFile = [IO.Path]::Combine($VolumeId,'WorkMatchr-Archief',"$runId.gpg")
function InUbuntu([string]$script) {
  $script.Replace('RUN_ID',$runId) | wsl.exe -d Ubuntu --exec sh -c 'tr -d "\r" | bash -se'
}
$created = $false
if ([IO.File]::Exists($cardFile) -or (Test-Path -LiteralPath $dir)) { throw 'Fixture collision' }
try {
  if ([IO.File]::Exists($cardFile)) { throw 'Unexpected existing archive' }
  New-Item -ItemType Directory -Path $dir | Out-Null
  $fingerprint = InUbuntu @'
umask 077
k=/dev/shm/RUN_ID
mkdir "$k" "$k/source" "$k/public" "$k/a" "$k/b"
export GNUPGHOME="$k/source"
gpg --batch --pinentry-mode loopback --passphrase '' --quick-gen-key 'Synthetic <test@example.invalid>' rsa2048 encr 1d 2>/dev/null
gpg --export | gpg --homedir "$k/public" --batch --import 2>/dev/null
for who in a b; do
  openssl rand -hex 32 > "$k/$who.pass"
  gpg --batch --export-secret-keys | gpg --batch --yes --pinentry-mode loopback --passphrase-file "$k/$who.pass" --symmetric --output "$k/$who.copy"
done
gpg --batch --with-colons --fingerprint | awk -F: '$1=="fpr"{print $10;exit}'
'@
  docker run -d --name $client --label "workmatchr.d2c=$runId" --network bridge --add-host db.fixture.test:127.0.0.1 --tmpfs /run/d2c --tmpfs /var/lib/postgresql --entrypoint sleep $image infinity | Out-Null
  $created = $true
  InUbuntu 'k=/dev/shm/RUN_ID; openssl req -x509 -newkey rsa:2048 -nodes -days 1 -keyout "$k/server.key" -out "$k/server.crt" -subj /CN=db.fixture.test -addext subjectAltName=DNS:db.fixture.test 2>/dev/null'
  foreach ($name in 'server.key','server.crt') {
    wsl.exe -d Ubuntu --exec cat "$keyHome/$name" | docker exec -i $client sh -c "umask 077; tr -d '\r' > /var/lib/postgresql/$name"
  }
  @'
set -eu
D=/var/lib/postgresql/fixture
mkdir "$D"
chown postgres "$D"
gosu postgres initdb -D "$D" -A trust >/dev/null
cp /var/lib/postgresql/server.key /var/lib/postgresql/server.crt "$D/"
chmod 644 "$D/server.crt"
chown postgres "$D/server.key"
chmod 600 "$D/server.key"
cat "$D/server.crt" >> /etc/ssl/certs/ca-certificates.crt
gosu postgres pg_ctl -D "$D" -l "$D/test.log" -o "-c ssl=on -c listen_addresses=127.0.0.1" -w start >/dev/null
psql -U postgres -v ON_ERROR_STOP=1 -c 'create role fixture_backup login' -c 'create database fixture_db' >/dev/null
psql -U postgres -d fixture_db -v ON_ERROR_STOP=1 -c 'create table fixture(value int); insert into fixture values(719); grant select on fixture to fixture_backup;' >/dev/null
'@ | ForEach-Object { $_.Replace([string][char]13,'') } | docker exec -i $client sh -c 'tr -d "\r" | sh -e'
  $policy = @{scope='D2D_PRIVATE_TARGET_POLICY';approved=$true;approvalReference='synthetic-fixture-only';project='fixture-project';branch='fixture-branch';host='db.fixture.test';database='fixture_db';backupRole='fixture_backup';restoreOwner='fixture_owner';volumeId=$VolumeId;volumeSerial=$Serial}
  $plan = $policy.Clone()
  $plan.scope='D2C_SINGLE_BACKUP_AND_ISOLATED_RESTORE'
  $plan.until=[DateTime]::UtcNow.AddMinutes(10).ToString('o')
  $plan.runId=$runId
  $plan.archiveRoot=$root
  $plan.publicKeyring="$keyHome/public"
  $plan.fingerprint=($fingerprint | Select-Object -Last 1).Trim()
  foreach ($gate in 'hostSecurityVerified','keyCustodyVerified','writerPauseVerified','cleanupBackstopVerified','preflight85Verified') { $plan[$gate]=$true }
  $mode='backup'
  if ($Online) {
    $mode='online-backup'
    $plan.operatorHost=[Environment]::MachineName.ToLowerInvariant()
    $policy.operatorHost=$plan.operatorHost
    docker exec $client psql -U postgres -v ON_ERROR_STOP=1 -c "alter role fixture_backup createdb createrole replication bypassrls password 'synthetic-fixture'" -c "alter database fixture_db set neon.project_id='fixture-project'" -c "alter database fixture_db set neon.branch_id='fixture-branch'" | Out-Null
    docker exec $client sh -ec 'sed -i "s/^host .*trust$/host all all 127.0.0.1\/32 scram-sha-256/" /var/lib/postgresql/fixture/pg_hba.conf; gosu postgres pg_ctl -D /var/lib/postgresql/fixture reload' | Out-Null
    $plan.Remove('writerPauseVerified')
    $plan.scope='D2C_SINGLE_ONLINE_EXPORT'
    $policy.onlineScope=$plan.scope
    $plan.from=[DateTime]::UtcNow.AddSeconds(-5).ToString('o')
    $plan.onlineSnapshotAccepted=$true
    $plan.privilegedCredentialAccepted=$true
    foreach ($field in 'from','until','runId','fingerprint','onlineSnapshotAccepted','privilegedCredentialAccepted','hostSecurityVerified','keyCustodyVerified','cleanupBackstopVerified','preflight85Verified') { $policy[$field]=$plan[$field] }
  }
  $policy | ConvertTo-Json | Set-Content "$dir/policy.json"
  $plan | ConvertTo-Json | Set-Content "$dir/plan.json"
  foreach ($field in 'volumeId','volumeSerial') {
    $wrong = $policy.Clone()
    $wrong[$field] = if ($field -eq 'volumeId') { '\\?\Volume{00000000-0000-0000-0000-000000000000}\' } else { '00000000' }
    $wrong | ConvertTo-Json | Set-Content "$dir/absent.json"
    $rejected = $false
    try { "synthetic-fixture" | node scripts/d2c-archive-stage.mjs $mode "$dir/plan.json" --execute "$dir/absent.json" }
    catch [System.Management.Automation.NativeCommandExitException] { $rejected = $true }
    if (!$rejected -or (Test-Path "$dir/backup.dump.gpg") -or (Test-Path "$dir/manifest.json")) { throw 'Card preflight did not stop export' }
  }
  if ($Online) {
    docker exec $client mv /etc/ssl/certs/ca-certificates.crt /run/d2c/synthetic-ca
    try {
      $tlsRefused=$false
      try { "synthetic-fixture" | node scripts/d2c-archive-stage.mjs $mode "$dir/plan.json" --execute "$dir/policy.json" }
      catch [System.Management.Automation.NativeCommandExitException] { $tlsRefused=$true }
      if (!$tlsRefused -or (Test-Path "$dir/manifest.json") -or [IO.File]::Exists($cardFile)) { throw 'Untrusted TLS accepted' }
    } finally { docker exec $client mv /run/d2c/synthetic-ca /etc/ssl/certs/ca-certificates.crt }
  }
  "synthetic-fixture" | node scripts/d2c-archive-stage.mjs $mode "$dir/plan.json" --execute "$dir/policy.json"
  if ($Online) {
    $replayRefused=$false
    try { "synthetic-fixture" | node scripts/d2c-archive-stage.mjs $mode "$dir/plan.json" --execute "$dir/policy.json" }
    catch [System.Management.Automation.NativeCommandExitException] { $replayRefused=$true }
    if (!$replayRefused) { throw 'Consumed approval accepted' }
    $probeRun="d2c-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())-$suffix"
    $probe=[IO.Path]::Combine($VolumeId,'WorkMatchr-Archief',"$probeRun.gpg")
    $partial="$probe.partial"
    # Model a process loss mid-copy with a truncated ciphertext prefix.
    $stream=[IO.File]::Open($partial,'CreateNew','Write','None')
    try {
      try { $stream.WriteByte([IO.File]::ReadAllBytes($cardFile)[0]) } finally { $stream.Dispose() }
      $partialRefused=$false
      try { & "$PSScriptRoot/d2c-card.ps1" -VolumeId $VolumeId -Serial $Serial -RunId $probeRun } catch { $partialRefused=$true }
      if (!$partialRefused -or [IO.File]::Exists($probe)) { throw 'Partial accepted' }
    } finally { if ((Get-Volume -DriveLetter D).UniqueId -eq $VolumeId) { [IO.File]::Delete($partial) } }
    $hashRefused=$false
    try { & "$PSScriptRoot/d2c-card.ps1" -VolumeId $VolumeId -Serial $Serial -RunId $probeRun -Archive "$dir/backup.dump.gpg" -ExpectedHash ('0'*64) } catch { $hashRefused=$true }
    if (!$hashRefused -or [IO.File]::Exists($probe)) { throw 'Wrong checksum accepted' }
  }
  $manifest = Get-Content "$dir/manifest.json" -Raw | ConvertFrom-Json
  if ((Get-FileHash -LiteralPath $cardFile).Hash -ne $manifest.sha256) { throw 'Card digest differs' }
  $archiveBytes = [IO.File]::ReadAllBytes($cardFile)
  [Convert]::ToBase64String($archiveBytes) | wsl.exe -d Ubuntu --exec sh -c "base64 -di > $keyHome/checked.gpg"
  InUbuntu @'
k=/dev/shm/RUN_ID
set -o pipefail
for who in a b; do
  gpg --homedir "$k/$who" --batch --pinentry-mode loopback --passphrase-file "$k/$who.pass" --decrypt "$k/$who.copy" 2>/dev/null | gpg --homedir "$k/$who" --batch --import 2>/dev/null
  gpg --homedir "$k/$who" --batch --decrypt "$k/checked.gpg" 2>/dev/null | sha256sum
done > "$k/hashes"
test "$(sort -u "$k/hashes" | wc -l)" -eq 1
'@
  'PASS: synthetic backup, card digest, two independent synthetic keyring imports and decryptions'
} finally {
  if ($created) { docker rm -f $client | Out-Null }
  InUbuntu 'k=/dev/shm/RUN_ID; for h in "$k"/*/; do test ! -d "$h" || gpgconf --homedir "$h" --kill gpg-agent; done; rm -rf -- "$k"'
  if ((Get-Volume -DriveLetter D).UniqueId -eq $VolumeId -and [IO.File]::Exists($cardFile)) { [IO.File]::Delete($cardFile) }
  if ($dir.StartsWith("$root\") -and [IO.Directory]::Exists($dir)) { Remove-Item -Recurse -LiteralPath $dir }
}
