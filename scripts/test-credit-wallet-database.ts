import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De creditwallettest mag uitsluitend lokaal draaien.')
}
const databaseName = `workmatchr_credit_wallet_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deploySchema() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    throw new Error(`Migraties in creditwallettestdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
  }
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma')['getPrisma']>> | null = null
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deploySchema()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    const {
      getProfessionalCreditWallet,
      recordProfessionalCreditMutation,
    } = await import('../src/lib/credits/credit-wallet-service')
    prisma = getPrisma()

    const clientOrganization = await prisma.organization.create({
      data: { name: 'TEST-WM Credit Opdrachtgever', organizationType: 'CLIENT', status: 'ACTIVE' },
    })
    const professionalOrganization = await prisma.organization.create({
      data: { name: 'TEST-WM Credit Professional', organizationType: 'PROVIDER', status: 'ACTIVE' },
    })
    const otherProfessionalOrganization = await prisma.organization.create({
      data: { name: 'TEST-WM Credit Andere Professional', organizationType: 'PROVIDER', status: 'ACTIVE' },
    })
    const platformOrganization = await prisma.organization.create({
      data: {
        name: 'TEST-WM Credit Platform',
        organizationType: 'PLATFORM_OPERATOR',
        status: 'ACTIVE',
        systemKey: 'WORKMATCHR_PLATFORM',
      },
    })
    const clientUser = await prisma.user.create({
      data: {
        email: `client-${randomUUID()}@example.invalid`,
        accountType: 'CLIENT',
        status: 'ACTIVE',
        emailVerified: true,
        memberships: { create: { organizationId: clientOrganization.id, role: 'OWNER', status: 'ACTIVE' } },
      },
    })
    const professionalUser = await prisma.user.create({
      data: {
        email: `professional-${randomUUID()}@example.invalid`,
        accountType: 'PROFESSIONAL',
        status: 'ACTIVE',
        emailVerified: true,
        memberships: { create: { organizationId: professionalOrganization.id, role: 'OWNER', status: 'ACTIVE' } },
      },
    })
    const otherProfessionalUser = await prisma.user.create({
      data: {
        email: `professional-other-${randomUUID()}@example.invalid`,
        accountType: 'PROFESSIONAL',
        status: 'ACTIVE',
        emailVerified: true,
        memberships: { create: { organizationId: otherProfessionalOrganization.id, role: 'OWNER', status: 'ACTIVE' } },
      },
    })
    const platformAdmin = await prisma.user.create({
      data: {
        email: `platform-${randomUUID()}@example.invalid`,
        status: 'ACTIVE',
        platformRole: 'ADMIN',
        emailVerified: true,
        memberships: { create: { organizationId: platformOrganization.id, role: 'ADMIN', status: 'ACTIVE' } },
      },
    })
    await prisma.providerProfile.create({ data: { organizationId: professionalOrganization.id } })
    await prisma.providerProfile.create({ data: { organizationId: otherProfessionalOrganization.id } })

    await assert.rejects(
      () => prisma!.creditAccount.create({ data: { organizationId: clientOrganization.id } }),
      /creditwallet|professionele organisatie/i,
    )

    const purchaseKey = `PURCHASE:${randomUUID()}`
    const purchase = await recordProfessionalCreditMutation({
      actorUserId: platformAdmin.id,
      organizationId: professionalOrganization.id,
      type: 'PURCHASE',
      amount: 100,
      reason: 'Fictieve aankoop zonder betaalprovider voor de integratietest.',
      referenceType: 'TEST_PURCHASE',
      referenceId: randomUUID(),
      idempotencyKey: purchaseKey,
    })
    assert.equal(purchase.balance.totalBalance, 100)
    const replay = await recordProfessionalCreditMutation({
      actorUserId: platformAdmin.id,
      organizationId: professionalOrganization.id,
      type: 'PURCHASE',
      amount: 100,
      reason: 'Fictieve aankoop zonder betaalprovider voor de integratietest.',
      referenceType: 'TEST_PURCHASE',
      referenceId: purchase.transaction.referenceId!,
      idempotencyKey: purchaseKey,
    })
    assert.equal(replay.idempotent, true)
    assert.equal(replay.transaction.id, purchase.transaction.id)
    await assert.rejects(() => recordProfessionalCreditMutation({
      actorUserId: platformAdmin.id,
      organizationId: professionalOrganization.id,
      type: 'PURCHASE',
      amount: 90,
      reason: 'Conflicterende herhaling voor de integratietest.',
      idempotencyKey: purchaseKey,
    }))

    const firstReference = randomUUID()
    await recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'RESERVATION', amount: 30, reason: 'Fictieve reservering voor een toekomstige zakelijke handeling.', referenceType: 'TEST_RESERVATION', referenceId: firstReference, idempotencyKey: `RESERVE:${randomUUID()}` })
    await recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'RESERVATION_RELEASE', amount: 10, reason: 'Gedeeltelijke vrijgave van de fictieve reservering.', referenceType: 'TEST_RESERVATION', referenceId: firstReference, idempotencyKey: `RELEASE:${randomUUID()}` })
    const secondReference = randomUUID()
    await recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'RESERVATION', amount: 20, reason: 'Tweede fictieve reservering voor consumptie.', referenceType: 'TEST_RESERVATION', referenceId: secondReference, idempotencyKey: `RESERVE:${randomUUID()}` })
    await recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'CONSUMPTION', amount: 20, reason: 'Definitieve fictieve afschrijving van gereserveerde credits.', referenceType: 'TEST_RESERVATION', referenceId: secondReference, idempotencyKey: `CONSUME:${randomUUID()}` })
    await recordProfessionalCreditMutation({ actorUserId: platformAdmin.id, organizationId: professionalOrganization.id, type: 'REFUND', amount: 10, reason: 'Fictieve terugbetaling zonder betaalprovider.', referenceType: 'TEST_REFUND', referenceId: randomUUID(), idempotencyKey: `REFUND:${randomUUID()}` })
    await recordProfessionalCreditMutation({ actorUserId: platformAdmin.id, organizationId: professionalOrganization.id, type: 'CONTRIBUTION_BONUS', amount: 5, reason: 'Fictieve bonus voor de creditwallettest.', referenceType: 'TEST_BONUS', referenceId: randomUUID(), idempotencyKey: `BONUS:${randomUUID()}` })
    await recordProfessionalCreditMutation({ actorUserId: platformAdmin.id, organizationId: professionalOrganization.id, type: 'ADMIN_CORRECTION', amount: -5, reason: 'Fictieve administratieve correctie voor de integratietest.', referenceType: 'TEST_CORRECTION', referenceId: randomUUID(), idempotencyKey: `CORRECTION:${randomUUID()}` })

    const ownWallet = await getProfessionalCreditWallet({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id })
    assert.deepEqual({
      total: ownWallet.totalBalance,
      reserved: ownWallet.reservedBalance,
      available: ownWallet.availableBalance,
    }, { total: 90, reserved: 20, available: 70 })
    assert.equal(await prisma.creditAccount.count({ where: { organizationId: professionalOrganization.id } }), 1)
    assert.equal(await prisma.creditTransaction.count({ where: { idempotencyKey: purchaseKey } }), 1)
    assert.equal(await prisma.marketplaceAuditEvent.count({ where: { organizationId: professionalOrganization.id, action: 'CREDIT_LEDGER_MUTATION_RECORDED' } }), 8)
    await assert.rejects(() => getProfessionalCreditWallet({ actorUserId: clientUser.id, organizationId: clientOrganization.id }))
    await assert.rejects(() => getProfessionalCreditWallet({ actorUserId: otherProfessionalUser.id, organizationId: professionalOrganization.id }))
    await assert.rejects(() => recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'ADMIN_CORRECTION', amount: 1, reason: 'Niet-bevoegde correctiepoging.', idempotencyKey: `DENIED:${randomUUID()}` }))

    const raceReference = randomUUID()
    const race = await Promise.allSettled([
      recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'RESERVATION', amount: 60, reason: 'Eerste parallelle fictieve reservering.', referenceType: 'TEST_RACE', referenceId: raceReference, idempotencyKey: `RACE-A:${randomUUID()}` }),
      recordProfessionalCreditMutation({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id, type: 'RESERVATION', amount: 60, reason: 'Tweede parallelle fictieve reservering.', referenceType: 'TEST_RACE', referenceId: raceReference, idempotencyKey: `RACE-B:${randomUUID()}` }),
    ])
    assert.equal(race.filter((result) => result.status === 'fulfilled').length, 1)
    const afterRace = await getProfessionalCreditWallet({ actorUserId: professionalUser.id, organizationId: professionalOrganization.id })
    assert.deepEqual({ total: afterRace.totalBalance, reserved: afterRace.reservedBalance, available: afterRace.availableBalance }, { total: 90, reserved: 80, available: 10 })

    const ledgerEntry = await prisma.creditTransaction.findFirstOrThrow({ where: { creditAccountId: ownWallet.walletId! } })
    await assert.rejects(() => prisma!.creditTransaction.update({ where: { id: ledgerEntry.id }, data: { reason: 'Overschreven' } }))
    await assert.rejects(() => prisma!.creditTransaction.delete({ where: { id: ledgerEntry.id } }))

    const projected = await prisma.creditAccount.findUniqueOrThrow({ where: { organizationId: professionalOrganization.id } })
    assert.equal(projected.availableBalance, afterRace.availableBalance)
    assert.equal(projected.reservedBalance, afterRace.reservedBalance)
    await assert.rejects(
      () => prisma!.creditAccount.update({
        where: { id: projected.id },
        data: { balance: { increment: 100 }, availableBalance: { increment: 100 } },
      }),
      /uitsluitend afleidbaar uit CreditTransaction/i,
    )
    console.log('Professionele creditwallet, ledger, autorisatie, idempotentie en concurrency zijn geslaagd.')
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende creditwallettestfout.')
  process.exitCode = 1
})
