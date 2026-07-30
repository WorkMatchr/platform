import 'dotenv/config'
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
  const prisma = getPrisma()

  try {
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

    async function publishTestRequest(
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
      return requestService.publishRequest({
        viewer,
        publication: {
          adviceDossierId: dossier.id,
          publicSummary:
            'Wij zoeken ondersteuning bij een actuele risico-inventarisatie voor onze organisatie.',
          requestedStart: 'IN_CONSULTATION',
          notes:
            'Neem bij interesse contact op met onze vaste contactpersoon.',
        },
        at,
      })
    }

    async function actorsForRequest(requestId: string) {
      const eligible =
        await prisma.requestEligibleProvider.findMany({
          where: { requestId },
          orderBy: { providerOrganizationId: 'asc' },
          include: {
            providerOrganization: {
              include: {
                memberships: {
                  where: {
                    status: 'ACTIVE',
                    role: 'OWNER',
                  },
                  take: 1,
                },
              },
            },
          },
        })
      assert.ok(eligible.length >= 6)
      return eligible.map((item) => ({
        userId: item.providerOrganization.memberships[0]!.userId,
        organizationId: item.providerOrganizationId,
      }))
    }

    const sequentialRequest = await publishTestRequest(
      1,
      new Date('2026-07-30T12:00:00Z'),
    )
    const sequentialActors = await actorsForRequest(
      sequentialRequest.id,
    )
    for (const actor of sequentialActors.slice(0, 4)) {
      await interestService.registerRequestInterest({
        actor,
        requestId: sequentialRequest.id,
      })
    }

    const requesterBeforeClaim =
      await interestService.getEligibleRequestForProvider(
        sequentialActors[0]!,
        sequentialRequest.id,
      )
    assert.equal(requesterBeforeClaim.requesterDetails, null)
    assert.equal(
      JSON.stringify(requesterBeforeClaim).includes(
        clientMembership.organization.name,
      ),
      false,
    )

    const first = await offerSlotService.claimRequestOfferSlot({
      actor: sequentialActors[0]!,
      requestId: sequentialRequest.id,
      at: new Date('2026-07-30T12:10:00Z'),
    })
    const second = await offerSlotService.claimRequestOfferSlot({
      actor: sequentialActors[1]!,
      requestId: sequentialRequest.id,
      at: new Date('2026-07-30T12:11:00Z'),
    })
    const third = await offerSlotService.claimRequestOfferSlot({
      actor: sequentialActors[2]!,
      requestId: sequentialRequest.id,
      at: new Date('2026-07-30T12:12:00Z'),
    })
    assert.deepEqual(
      [first.slotNumber, second.slotNumber, third.slotNumber],
      [1, 2, 3],
    )
    await expectCode(
      () =>
        offerSlotService.claimRequestOfferSlot({
          actor: sequentialActors[3]!,
          requestId: sequentialRequest.id,
        }),
      'FULL',
    )
    const duplicate = await offerSlotService.claimRequestOfferSlot({
      actor: sequentialActors[0]!,
      requestId: sequentialRequest.id,
    })
    assert.equal(duplicate.id, first.id)
    assert.equal(
      await prisma.requestOfferSlot.count({
        where: {
          requestId: sequentialRequest.id,
          providerOrganizationId:
            sequentialActors[0]!.organizationId,
        },
      }),
      1,
    )

    const requesterAfterClaim =
      await interestService.getEligibleRequestForProvider(
        sequentialActors[0]!,
        sequentialRequest.id,
      )
    assert.ok(requesterAfterClaim.requesterDetails)
    assert.equal(
      requesterAfterClaim.requesterDetails.organizationName,
      clientMembership.organization.tradeName ??
        clientMembership.organization.name,
    )
    assert.equal(
      requesterAfterClaim.requesterDetails.notes,
      'Neem bij interesse contact op met onze vaste contactpersoon.',
    )
    const serializedAfterClaim = JSON.stringify(requesterAfterClaim)
    assert.equal(
      serializedAfterClaim.includes('originalHelpRequest'),
      false,
    )
    assert.equal(serializedAfterClaim.includes('dossierCode'), false)

    const nonInterestedActor = sequentialActors[4]!
    await expectCode(
      () =>
        offerSlotService.claimRequestOfferSlot({
          actor: nonInterestedActor,
          requestId: sequentialRequest.id,
        }),
      'NOT_FOUND',
    )

    const noLongerSelectableActor = sequentialActors[5]!
    await interestService.registerRequestInterest({
      actor: noLongerSelectableActor,
      requestId: sequentialRequest.id,
    })
    await prisma.providerProfile.update({
      where: {
        organizationId:
          noLongerSelectableActor.organizationId,
      },
      data: { selectabilityStatus: 'NOT_SELECTABLE' },
    })
    await expectCode(
      () =>
        offerSlotService.claimRequestOfferSlot({
          actor: noLongerSelectableActor,
          requestId: sequentialRequest.id,
        }),
      'ACCESS_DENIED',
    )

    const member = await prisma.user.create({
      data: {
        email: 'm7d3-member@example.invalid',
        displayName: 'M7D.3 lid',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: member.id,
        organizationId: sequentialActors[3]!.organizationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
    })
    await expectCode(
      () =>
        offerSlotService.claimRequestOfferSlot({
          actor: {
            userId: member.id,
            organizationId:
              sequentialActors[3]!.organizationId,
          },
          requestId: sequentialRequest.id,
        }),
      'ACCESS_DENIED',
    )
    await expectCode(
      () =>
        offerSlotService.claimRequestOfferSlot({
          actor: {
            userId: sequentialActors[0]!.userId,
            organizationId:
              sequentialActors[3]!.organizationId,
          },
          requestId: sequentialRequest.id,
        }),
      'ACCESS_DENIED',
    )
    await expectCode(
      () =>
        interestService.withdrawRequestInterest({
          actor: sequentialActors[0]!,
          requestId: sequentialRequest.id,
        }),
      'SLOT_CLAIMED',
    )

    const ownSequentialRequest = await requestService.getOwnRequest(
      viewer,
      sequentialRequest.id,
    )
    assert.equal(ownSequentialRequest._count.offerSlots, 3)

    const firstEvent =
      await prisma.requestOfferSlotEvent.findFirstOrThrow({
        where: { offerSlotId: first.id },
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

    const concurrentRequest = await publishTestRequest(
      2,
      new Date('2026-07-30T13:00:00Z'),
    )
    const concurrentActors = (
      await actorsForRequest(concurrentRequest.id)
    ).slice(0, 4)
    const providerAdmin = await prisma.user.create({
      data: {
        email: 'm7d3-admin@example.invalid',
        displayName: 'M7D.3 beheerder',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: providerAdmin.id,
        organizationId: concurrentActors[0]!.organizationId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })
    concurrentActors[0] = {
      userId: providerAdmin.id,
      organizationId: concurrentActors[0]!.organizationId,
    }
    for (const actor of concurrentActors) {
      await interestService.registerRequestInterest({
        actor,
        requestId: concurrentRequest.id,
      })
    }
    const race = await Promise.allSettled(
      concurrentActors.map((actor) =>
        offerSlotService.claimRequestOfferSlot({
          actor,
          requestId: concurrentRequest.id,
          at: new Date('2026-07-30T13:10:00Z'),
        }),
      ),
    )
    assert.equal(
      race.filter((result) => result.status === 'fulfilled').length,
      3,
    )
    assert.equal(
      race.filter(
        (result) =>
          result.status === 'rejected' &&
          result.reason instanceof
            offerSlotService.RequestOfferSlotServiceError &&
          result.reason.code === 'FULL',
      ).length,
      1,
    )
    const concurrentSlots = await prisma.requestOfferSlot.findMany({
      where: {
        requestId: concurrentRequest.id,
        status: 'CLAIMED',
      },
      orderBy: { slotNumber: 'asc' },
      include: { events: true },
    })
    assert.deepEqual(
      concurrentSlots.map((slot) => slot.slotNumber),
      [1, 2, 3],
    )
    assert.equal(
      concurrentSlots.every((slot) => slot.events.length === 1),
      true,
    )

    await prisma.request.update({
      where: { id: concurrentRequest.id },
      data: {
        status: 'CANCELLED',
        archivedAt: new Date('2026-07-30T13:20:00Z'),
      },
    })
    const unclaimedActor = concurrentActors.find(
      (actor) =>
        !concurrentSlots.some(
          (slot) =>
            slot.providerOrganizationId === actor.organizationId,
        ),
    )!
    await expectCode(
      () =>
        offerSlotService.claimRequestOfferSlot({
          actor: unclaimedActor,
          requestId: concurrentRequest.id,
        }),
      'INVALID_STATUS',
    )

    assert.equal(await prisma.quote.count(), 0)
    assert.equal(await prisma.creditReservation.count(), 0)
    assert.equal(await prisma.creditTransaction.count(), 0)
    assert.equal(await prisma.marketplaceMessage.count(), 0)

    console.log(
      'M7D.3-integriteit: slot 1-3, transactionele vierde weigering, parallelle claims, privacy, rollen, tenantisolatie en append-only events geslaagd.',
    )
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
