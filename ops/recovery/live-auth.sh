authenticate_fixture() {
  sha256sum -c fixture.sha256 || return 1
# Authenticate the complete file before invoking restore. RLIMIT_FSIZE uses 1024-byte units in bash.
  (ulimit -f 524288; gpg --batch --max-output 536870912 --status-fd 3 --output dump --decrypt fixture.gpg 3>status) || return 1
  grep -Fxq '[GNUPG:] DECRYPTION_OKAY' status || return 1
  grep -Eq "^\[GNUPG:\] DECRYPTION_KEY $fp $fp " status || return 1
  test "$(head -c5 dump)" = PGDMP || return 1
  test "$(wc -c <dump)" -le 536870912 || return 1
}
