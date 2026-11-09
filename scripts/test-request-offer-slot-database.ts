import 'dotenv/config'
import { seedHistoricalRequest, seedHistoricalParticipants } from './fixtures/historical-request'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is niet geconfigureerd.')
}
const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error(
    'De offerteplaatsintegratietest mag uitsluitend tegen lokale PostgreSQL draaien.',
  )
}
const databaseName = `workmatchr_test_providers_m7d3_${process.pid}_${Date.now()}`
const targetUrl = new URL(sourceUrl)
targetUrl.pathname = `/${databaseName}`
targetUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de npm-CLI ontbreekt.')

function runDataset(command: 'seed' | 'remove') {
  const script =
    command === 'seed'
      ? 'seed:test-providers'
      : 'seed:test-providers:remove'
  return spawnSync(process.execPath, [npmExecPath!, 'run', script], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      WORKMATCHR_TEST_PROVIDER_DATABASE: databaseName,
    },
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

async function expectCode(
  action: () => Promise<unknown>,
  expected: string,
) {
  let code: string | undefined
  try {
    await action()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      code = String(error.code)
    }
  }
  assert.equal(code, expected)
}

async function main() {
  const seeded = runDataset('seed')
  if (seeded.status !== 0) {
    throw new Error(
      `M7X.1-seed mislukt:\n${seeded.stdout}\n${seeded.stderr}`,
    )
  }
  process.env.DATABASE_URL = targetUrl.toString()
  const { getPrisma } = await import('../src/lib/prisma')
  const requestService = await import(
    '../src/lib/requests/request-service'
  )
  const interestService = await import(
    '../src/lib/requests/request-interest-service'
  )
  const offerSlotService = await import(
    '../src/lib/requests/request-offer-slot-service'
  )
  const reliabilityService = await import(
    '../src/lib/marketplace/marketplace-reliability-service'
  )
  const prisma = getPrisma()

  try {
    await (await import('./fixtures/reviewed-marketplace-provider')).reviewSelectableRequestFixtures(prisma)
    const reviewedAt = Date.now()
    const scenarioTime = (minutes: number) => new Date(reviewedAt + minutes * 60_000)
    const clientMembership =
      await prisma.organizationMembership.findFirstOrThrow({
        where: {
          role: 'OWNER',
          status: 'ACTIVE',
          organization: {
            organizationType: 'CLIENT',
            name: { startsWith: 'TEST-WM-' },
          },
        },
        select: {
          userId: true,
          organizationId: true,
          organization: {
            select: {
              name: true,
              tradeName: true,
            },
          },
        },
      })
    const viewer = {
      userId: clientMembership.userId,
      organizationId: clientMembership.organizationId,
      organizationRole: 'OWNER' as const,
    }

    async function createHistoricalRequest(
      sequence: number,
      at: Date,
    ) {
      const dossier = await prisma.adviceDossier.create({
        data: {
          dossierCode: `WM-2026-73${String(sequence).padStart(4, '0')}`,
          ownerUserId: clientMembership.userId,
          organizationId: clientMembership.organizationId,
          sourceRoute: 'KNOWLEDGE',
          subject: 'Risico-inventarisatie en -evaluatie',
          status: 'COMPLETED',
          currentVersionNumber: 1,
          completedAt: at,
        },
      })
      await prisma.adviceDossierVersion.create({
        data: {
          adviceDossierId: dossier.id,
          versionNumber: 1,
          originalHelpRequest:
            'Wij willen onze risico-inventarisatie laten beoordelen.',
          situationSummary:
            'U wilt weten welke ondersteuning past bij een actuele RI&E.',
          subject: 'Risico-inventarisatie en -evaluatie',
          adviceTitle: 'Breng risico’s systematisch in kaart',
          adviceBody:
            'Een deskundige kan de inventarisatie ondersteunen.',
          adviceReasons: [
            'Een actuele beoordeling ondersteunt preventie.',
          ],
          selfActions: [
            'Verzamel werkzaamheden en bestaande maatregelen.',
          ],
          primaryProfessionalRequirementSnapshot: {
            label: 'Middelbaar Veiligheidskundige (MVK)',
            priority: 'PRIMARY',
            reason: 'Ondersteuning bij de RI&E.',
            expertise: ['RI&E', 'Risicobeoordeling'],
            capabilityCodes: ['RISK_ASSESSMENT'],
          },
          additionalProfessionalRequirementsSnapshot: [
            {
              label: 'Veiligheidskundige',
              priority: 'ADDITIONAL',
              reason: 'Aanvullend veiligheidsadvies.',
              expertise: ['Veiligheidsadvies'],
              capabilityCodes: ['SAFETY_ADVICE'],
            },
          ],
          knowledgeReferencesSnapshot: [],
          sourceReferencesSnapshot: [],
          uncertaintiesSnapshot: [],
          disclaimer:
            'Dit advies ondersteunt uw afweging en vervangt geen professionele beoordeling of juridisch advies.',
          outcomeSpecificity: 'SPECIFIC',
          completionStatus: 'COMPLETED_WITH_GUIDANCE',
        },
      })
      return seedHistoricalRequest(prisma, dossier.id, viewer.organizationId, at)
    }

    async function fundActors(
      actors: Array<{ organizationId: string; userId: string }>,
      credits = 100,
    ) {
      const uniqueActors = new Map(actors.map((actor) => [actor.organizationId, actor]))
      for (const actor of uniqueActors.values()) {
        const account = await prisma.creditAccount.upsert({
          where: { organizationId: actor.organizationId },
          create: {
            organizationId: actor.organizationId,
          },
          update: {},
        })
        const ledger = await prisma.creditTransaction.aggregate({
          where: { creditAccountId: account.id },
          _sum: { totalDelta: true, reservedDelta: true },
        })
        const available =
          (ledger._sum.totalDelta ?? 0) - (ledger._sum.reservedDelta ?? 0)
        if (available < credits) {
          const amount = credits - available
          const idempotencyKey = `TEST-FUND:${actor.organizationId}:${credits}:${available}`
          await prisma.creditTransaction.create({
            data: {
              creditAccountId: account.id,
              type: 'ADMIN_GRANT',
              amount,
              totalDelta: amount,
              reservedDelta: 0,
              balanceAfter: available + amount,
              reason: 'Fictief beginsaldo voor de offerteplaatstest.',
              createdByUserId: actor.userId,
              idempotencyKey,
            },
          })
        }
      }
    }

    const sequentialRequest = await createHistoricalRequest(
      1,
      scenarioTime(0),
    )
    const sequentialActors = await seedHistoricalParticipants(prisma, sequentialRequest.id, 4)
    await fundActors(sequentialActors)
    const rule = await (await import('../src/lib/marketplace/marketplace-rules-service')).getApplicableMarketplaceRuleSet(prisma, scenarioTime(0))
    const slotIds: string[] = []
    for (const [index, actor] of sequentialActors.slice(0, 3).entries()) {
      const slot = await prisma.requestOfferSlot.create({ data: { requestId: sequentialRequest.id,
        requestInterestId: actor.interestId, providerOrganizationId: actor.organizationId, slotNumber: index + 1,
        claimedAt: scenarioTime(0), createdByUserId: actor.userId } })
      const account = await prisma.creditAccount.findUniqueOrThrow({ where: { organizationId: actor.organizationId } })
      const cost = rule.participationPriceCredits
      const payment = await prisma.creditTransaction.create({ data: { creditAccountId: account.id, type: 'PARTICIPATION_PAYMENT',
        amount: -cost, totalDelta: -cost, reservedDelta: 0, balanceBefore: 100, balanceAfter: 100 - cost,
        availableBefore: 100, availableAfter: 100 - cost, reservedBefore: 0, reservedAfter: 0, spentBefore: 0, spentAfter: cost,
        referenceType: 'RequestOfferSlot', referenceId: slot.id, requestId: sequentialRequest.id, offerSlotId: slot.id,
        marketplaceRuleSetId: rule.id, reason: 'Historische synthetische deelname', idempotencyKey: 'history:payment:' + slot.id,
        createdByUserId: actor.userId } })
      await prisma.requestOfferSlot.update({ where: { id: slot.id }, data: { creditAmount: cost, marketplaceRuleSetId: rule.id, creditTransactionId: payment.id } })
      await prisma.requestOfferSlotEvent.create({ data: { offerSlotId: slot.id, requestId: sequentialRequest.id,
        providerOrganizationId: actor.organizationId, actorUserId: actor.userId, type: 'CLAIMED', toStatus: 'CLAIMED',
        slotNumber: index + 1, idempotencyKey: 'history:slot:' + slot.id } })
      slotIds.push(slot.id)
    }
    const { requireNoHistoricalParticipation } = await import('../src/lib/requests/historical-participation')
    await expectCode(() => prisma.$transaction(tx => requireNoHistoricalParticipation(tx, sequentialRequest.id)), 'INVALID_STATE')
    for (const actor of sequentialActors) {
      const input = { actor, requestId: sequentialRequest.id }
      await Promise.all(Array.from({ length: 4 }, () => expectCode(() => offerSlotService.claimRequestOfferSlot(input), 'LEGACY_ROUTE_CLOSED')))
      const detail = await interestService.getEligibleRequestForProvider(actor, sequentialRequest.id)
      assert.equal(detail.interest?.offerSlot?.id, slotIds[sequentialActors.indexOf(actor)])
      assert.equal(detail.interest?.offerSlot?.creditAmount ?? 0, detail.interest?.offerSlot ? rule.participationPriceCredits : 0)
    }
    assert.equal(await prisma.creditTransaction.count({ where: { requestId: sequentialRequest.id } }), 3)
    assert.equal(await prisma.creditReservation.count(), 0)
    await expectCode(() => interestService.withdrawRequestInterest({ actor: sequentialActors[0]!, requestId: sequentialRequest.id }), 'SLOT_CLAIMED')
    await expectCode(() => offerSlotService.claimRequestOfferSlot({ actor: { userId: viewer.userId, organizationId: sequentialActors[0]!.organizationId }, requestId: sequentialRequest.id }), 'ACCESS_DENIED')
    const ownSequentialRequest = await requestService.getOwnRequest(
      viewer,
      sequentialRequest.id,
    )
    assert.equal(ownSequentialRequest._count.offerSlots, 3)

    const firstEvent =
      await prisma.requestOfferSlotEvent.findFirstOrThrow({
        where: { offerSlotId: slotIds[0]! },
      })
    await assert.rejects(
      prisma.requestOfferSlotEvent.update({
        where: { id: firstEvent.id },
        data: { slotNumber: 2 },
      }),
    )
    await assert.rejects(
      prisma.requestOfferSlotEvent.delete({
        where: { id: firstEvent.id },
      }),
    )

    const withdrawal = await reliabilityService.withdrawPublishedRequest({
      userId: viewer.userId,
      organizationId: viewer.organizationId,
      values: {
        requestId: sequentialRequest.id,
        reason: 'NO_LONGER_NEEDED',
        confirmed: true,
      },
      at: scenarioTime(30),
    })
    assert.equal(withdrawal.refundedCredits, 69)
    assert.equal(withdrawal.idempotent, false)
    const repeatedWithdrawal =
      await reliabilityService.withdrawPublishedRequest({
        userId: viewer.userId,
        organizationId: viewer.organizationId,
        values: {
          requestId: sequentialRequest.id,
          reason: 'NO_LONGER_NEEDED',
          confirmed: true,
        },
        at: scenarioTime(31),
      })
    assert.equal(repeatedWithdrawal.refundedCredits, 69)
    assert.equal(repeatedWithdrawal.idempotent, true)
    assert.equal(
      await prisma.creditTransaction.count({
        where: {
          requestId: sequentialRequest.id,
          type: 'WITHDRAWAL_REFUND',
        },
      }),
      3,
    )
    const refundedAccounts = await prisma.creditAccount.findMany({
      where: {
        organizationId: {
          in: sequentialActors
            .slice(0, 3)
            .map((actor) => actor.organizationId),
        },
      },
    })
    assert.equal(
      refundedAccounts.every(
        (account) =>
          account.availableBalance === 93 && account.spentBalance === 7,
      ),
      true,
    )
    assert.equal(
      await prisma.marketplaceReliabilityEvent.count({
        where: {
          requestId: sequentialRequest.id,
          type: 'WITHDRAWN_AFTER_PARTICIPATION',
          participantCount: 3,
          totalRefundedCredits: 69,
        },
      }),
      1,
    )

    const archived = await interestService.getEligibleRequestForProvider(sequentialActors[0]!, sequentialRequest.id)
    assert.equal(archived.interest.offerSlot?.id, slotIds[0])
    assert.equal(archived.interest.offerSlot?.creditAmount, rule.participationPriceCredits)
    assert.equal(archived.request.status, 'CANCELLED')
    assert.equal(archived.requesterDetails, null)
    console.log('Drie historische betaalrechten en het auditspoor behouden; zestien aankoopverzoeken zonder extra afschrijving. Historische intrekking idempotent.')
  } finally {
    await prisma.$disconnect()
    const removed = runDataset('remove')
    if (removed.status !== 0) {
      throw new Error(
        `Tijdelijke M7D.3-database kon niet worden verwijderd:\n${removed.stdout}\n${removed.stderr}`,
      )
    }
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
