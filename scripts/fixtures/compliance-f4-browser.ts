import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync, rmSync, createWriteStream } from 'node:fs'
import { spawn } from 'node:child_process'
import type { PrismaClient } from '../../src/generated/prisma/client'
import { f4TestDefinition } from '../../src/test-fixtures/compliance-f4'

export async function verifyF4Browser(db: PrismaClient, actor: { userId: string; organizationId: string }, other: { userId: string; organizationId: string }) {
  const directory = '.local-storage/f4-browser'
  mkdirSync(directory, { recursive: true })
  assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY)
  const base = 'http://127.0.0.1:3089'
  Object.assign(process.env, { BETTER_AUTH_URL: base, NEXT_PUBLIC_APP_URL: base, BETTER_AUTH_SECRET: randomBytes(48).toString('base64url') })
  const { auth } = await import('../../src/lib/auth')
  const { hashPassword } = await import('better-auth/crypto')
  const password = randomBytes(24).toString('base64url')
  const context = await auth.$context
  const users = []
  for (const current of [actor, other]) {
    await db.organizationMembership.update({ where: { userId: current.userId }, data: { role: 'OWNER', status: 'ACTIVE' } })
    const user = await db.user.findUniqueOrThrow({ where: { id: current.userId } })
    await context.internalAdapter.createAccount({ userId: user.id, accountId: user.id, providerId: 'credential', password: await hashPassword(password) })
    users.push({ email: user.email })
  }
  const d = f4TestDefinition()
  await db.knowledgeSource.update({ where: { code: 'SYNTHETIC_F4' }, data: { title: d.modules[0].rules[0].sources[0].title } })
  writeFileSync(`${directory}/runtime.json`, JSON.stringify({ base, password, users }), { mode: 0o600 })
  const log = createWriteStream(`${directory}/server.log`)
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3089'], { env: { ...process.env, NODE_ENV: 'development', COMPLIANCE_F4_ENABLED: 'true', CONTACT_FORM_ENABLED: 'false', LEARNING_RUNTIME_ENABLED: 'false', ENABLE_TEST_ACCOUNT_SWITCHER: 'false', RESEND_API_KEY: '', MOLLIE_API_KEY: '', JORTT_CLIENT_SECRET: '' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout.pipe(log); server.stderr.pipe(log)
  try {
    let ready = false
    for (let n = 0; n < 90; n++) {
      await new Promise(r => setTimeout(r, 2000))
      try { if ((await fetch(`${base}/inloggen`)).ok) { ready = true; break } } catch {}
      if (server.exitCode !== null) break
    }
    assert.ok(ready, 'Local acceptance server must be ready')
    const phase = (name: string) => new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/test-compliance-f4-browser.mjs', name], { env: process.env, windowsHide: true, stdio: 'inherit' })
      child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Browser ${name} failed`)))
    })
    await phase('draft')
    const draft = await db.arboGuideRun.findFirstOrThrow({ where: { completedByUserId: actor.userId, status: 'IN_PROGRESS', draftRevision: { not: null } } })
    await (await import('./compliance-f4-payment-database')).fundF4Draft(db, actor, draft.id)
    await phase('complete')
    assert.equal(await db.session.count(), 0, 'Every browser session was revoked on logout')
    assert.equal((await db.arboGuideRun.findUniqueOrThrow({ where: { id: draft.id } })).status, 'COMPLETED')
    console.log('F4 real browser PASS: login, save, logout, new session/resume, tenant, mobile/keyboard, paid completion, PDF; zero sessions.')
  } finally {
    server.kill(); await new Promise<void>(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', () => resolve()) })
    log.end(); rmSync(`${directory}/runtime.json`, { force: true })
  }
}
