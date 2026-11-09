#!/usr/bin/env bash
# Private worker invoked by live_restore.py with a fresh RAM directory and unique container.
set -euo pipefail
umask 077
base=$(cd "$(dirname "$0")" && pwd)
source "$base/live-auth.sh"
python3 -B -c 'from live_host import preflight; preflight()'  # caller sets cwd to this directory
[[ "$1" == /dev/shm/* && "$2" =~ ^wm-live-fixture-[a-f0-9]{32}$ ]]
cd "$1"
name=$2
export HOME="$PWD" GNUPGHOME="$PWD/keys" TMPDIR="$PWD"
mkdir -m 700 "$GNUPGHOME"
ulimit -c 0
image='postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5'
docker run --pull=never --network none --read-only --name "$name" --log-driver none \
  --memory 4g --memory-swap 4g --tmpfs /var/lib/postgresql:rw,nosuid,nodev,size=3g \
  --tmpfs /var/run/postgresql:rw,nosuid,nodev,size=16m --tmpfs /tmp:rw,nosuid,nodev,size=64m \
  -e POSTGRES_HOST_AUTH_METHOD=trust -d "$image" >/dev/null
test "$(docker inspect -f '{{.HostConfig.NetworkMode}}:{{.HostConfig.ReadonlyRootfs}}:{{len .HostConfig.PortBindings}}' "$name")" = none:true:0
for i in {1..60}; do docker exec "$name" pg_isready -h 127.0.0.1 -U postgres >/dev/null && break; sleep 1; done
db() { docker exec -i "$name" psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d "$1"; }
printf '%s\n' 'CREATE DATABASE fixture;' 'CREATE DATABASE restored;' | db postgres
printf '%s\n' 'CREATE TABLE amounts(id integer PRIMARY KEY, amount integer NOT NULL CHECK (amount>=0), payload text);' \
  "INSERT INTO amounts SELECT i,i%101,repeat(md5(i::text),32) FROM generate_series(1,50000) i;" | db fixture
gpg --batch --pinentry-mode loopback --passphrase '' --quick-gen-key 'Live fixture <live@example.invalid>' rsa2048 encr 1d
fp=$(gpg --with-colons --list-secret-keys | awk -F: '$1=="fpr"{print $10;exit}')
[[ "$fp" =~ ^[0-9A-F]{40}$ ]]
docker exec "$name" pg_dump -Fc -U postgres fixture | gpg --batch --recipient "$fp!" --output fixture.gpg --encrypt
sha256sum fixture.gpg > fixture.sha256
authenticate_fixture
docker exec -i "$name" pg_restore -U postgres -d restored --single-transaction --exit-on-error <dump
snapshot="SELECT count(*), sum(amount), md5(string_agg(md5(row(id,amount,payload)::text),'' ORDER BY id)) FROM amounts;"
catalog="SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='amounts'::regclass ORDER BY conname;"
for query in "$snapshot" "$catalog"; do
  original=$(printf '%s' "$query" | db fixture)
  restored=$(printf '%s' "$query" | db restored)
  test -n "$original" && test "$original" = "$restored" || exit 1
done
# Negative integrity control against a changed synthetic row.
printf '%s' 'UPDATE amounts SET amount=0 WHERE id=1' | db restored
test "$(printf '%s' "$snapshot" | db fixture)" != "$(printf '%s' "$snapshot" | db restored)"
