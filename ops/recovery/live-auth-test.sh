#!/usr/bin/env bash
set -euo pipefail
umask 077
source "$(dirname "$0")/live-auth.sh"
dir=$(mktemp -d /dev/shm/wm-live-check-XXXXXXXX)
export GNUPGHOME="$dir/keys"
mkdir "$GNUPGHOME"
cd "$dir"
trap 'gpgconf --homedir "$GNUPGHOME" --kill gpg-agent; cd /; rm -r -- "$dir"' EXIT
gpg --batch --pinentry-mode loopback --passphrase '' --quick-gen-key fixture@example.invalid rsa2048 encr 1d 2>/dev/null
fp=$(gpg --with-colons --list-secret-keys 2>/dev/null | awk -F: '$1=="fpr"{print $10;exit}')
printf PGDMPfixture | gpg --batch --recipient "$fp!" --output fixture.gpg --encrypt
sha256sum fixture.gpg > fixture.sha256
authenticate_fixture
rm dump
saved=$fp
fp=0000000000000000000000000000000000000000
if authenticate_fixture; then exit 1; fi
rm dump
fp=$saved
printf X >>fixture.gpg
if authenticate_fixture; then exit 1; fi
truncate -s 80 fixture.gpg
sha256sum fixture.gpg >fixture.sha256
if authenticate_fixture; then exit 1; fi
printf 'PASS: valid, wrong fingerprint, wrong hash, corrupt archive\n'
