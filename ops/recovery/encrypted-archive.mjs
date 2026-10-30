// Operator building blocks, not a production entrypoint. No database URL or credentials.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { pipeline } from 'node:stream/promises'

const sha256 = b => createHash('sha256').update(b).digest('hex')
function completion(child) {
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve() : reject(new Error('Recovery subprocess failed; raw output suppressed')))
    child.stderr.resume() // Never persist database/client error text containing data.
  })
}

export async function encryptArchive({ launch, source, sourceArgs, gpg, keyring, fingerprint, output, timeoutMs = 120000 }) {
  assert.match(fingerprint, /^[A-F0-9]{40,64}$/)
  assert.ok(output.endsWith('.gpg'))
  const partial = `${output}.partial`
  assert.ok(!fs.existsSync(output) && !fs.existsSync(partial), 'Refuse overwrite')
  const dump = launch(source, sourceArgs)
  const encrypt = launch(gpg, ['--homedir', keyring, '--batch', '--trust-model', 'always', '--cipher-algo', 'AES256', '--compress-algo', 'none', '--recipient', fingerprint, '--output', partial, '--encrypt'])
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const jobs = [completion(dump), completion(encrypt)]
  dump.stdin.end()
  encrypt.stdout.resume()
  jobs.push(pipeline(dump.stdout, encrypt.stdin, { signal: controller.signal }))
  try {
    await Promise.all(jobs)
    assert.ok(fs.statSync(partial).size > 0)
    // Link then unlink refuses a competing destination; rename could overwrite it.
    fs.linkSync(partial, output)
    fs.unlinkSync(partial)
    return { bytes: fs.statSync(output).size, sha256: sha256(fs.readFileSync(output)) }
  } catch {
    dump.kill(); encrypt.kill()
    await Promise.allSettled(jobs)
    if (fs.existsSync(partial)) fs.unlinkSync(partial)
    throw new Error('Encrypted backup not completed; raw output suppressed')
  } finally { clearTimeout(timer) }
}

export async function decryptVerifiedArchive({ run, gpg, keyring, archive, expectedSha256, passphrase }) {
  assert.match(expectedSha256, /^[a-f0-9]{64}$/)
  assert.equal(sha256(fs.readFileSync(archive)), expectedSha256, 'Encrypted archive checksum mismatch')
  const result = await run(gpg, ['--homedir', keyring, '--batch', '--status-fd', '2', '--pinentry-mode', 'loopback', '--passphrase-fd', '0', '--decrypt', archive], `${passphrase}\n`)
  if (result.code !== 0 || !result.stderr.includes('[GNUPG:] DECRYPTION_OKAY') || result.stdout.subarray(0,5).toString() !== 'PGDMP') {
    result.stdout.fill(0)
    throw new Error('Archive authentication/decryption failed; restore not started')
  }
  // Caller must zero this bounded RAM buffer in finally after pg_restore.
  return result.stdout
}
