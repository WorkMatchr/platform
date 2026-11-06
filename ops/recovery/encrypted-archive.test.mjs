import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { mkdtempSync, writeFileSync, appendFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archiveSha256, decryptVerifiedArchive } from './encrypted-archive.mjs'

test('multi-chunk archive hash matches independent digest; corruption refuses decryption', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'wm-p17-archive-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const file = join(dir, 'synthetic.gpg'), hash = createHash('sha256')
  writeFileSync(file, '')
  for (let n = 0; n < 128; n++) {
    const chunk = randomBytes(64 * 1024)
    hash.update(chunk); appendFileSync(file, chunk)
  }
  const expectedSha256 = hash.digest('hex')
  assert.equal(await archiveSha256(file), expectedSha256)
  appendFileSync(file, 'corruption')
  await assert.rejects(decryptVerifiedArchive({ archive: file, expectedSha256,
    run: () => assert.fail('Corrupt archive must never reach decrypt/restore') }), /checksum mismatch/)
  await assert.rejects(archiveSha256(join(dir, 'absent.gpg')), /ENOENT/)
})

test('matching hash still requires authenticated decryption and a PostgreSQL archive', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'wm-p17-auth-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const archive = join(dir, 'synthetic.gpg')
  writeFileSync(archive, randomBytes(1024))
  const expectedSha256 = await archiveSha256(archive)
  for (const response of [
    { code: 1, stderr: '[GNUPG:] DECRYPTION_OKAY', stdout: Buffer.from('PGDMPsynthetic') },
    { code: 0, stderr: '', stdout: Buffer.from('PGDMPsynthetic') },
    { code: 0, stderr: '[GNUPG:] DECRYPTION_OKAY', stdout: Buffer.from('not a dump') },
  ]) {
    await assert.rejects(decryptVerifiedArchive({ archive, expectedSha256, run: async () => response }), /authentication\/decryption/)
    assert.ok(response.stdout.every(byte => byte === 0))
  }
  const buffer = Buffer.from('PGDMPsynthetic')
  const result = await decryptVerifiedArchive({ archive, expectedSha256,
    run: async () => ({ code: 0, stderr: '[GNUPG:] DECRYPTION_OKAY', stdout: buffer }) })
  assert.equal(result, buffer)
  result.fill(0)
})
