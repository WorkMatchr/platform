import 'dotenv/config'
import { getPrisma } from '../src/lib/prisma'
import {
  WORKMATCHR_PLATFORM_ORGANIZATION,
  ensurePlatformOrganization,
} from '../src/lib/account-architecture/platform-organization-service'

async function main() {
  if (!process.argv.includes('--execute')) {
    console.log('Geen databasewijziging uitgevoerd. Gebruik --execute voor de expliciete idempotente bootstrap.')
    console.log(`Systeemidentiteit: ${WORKMATCHR_PLATFORM_ORGANIZATION.systemKey}`)
    return
  }

  const prisma = getPrisma()
  try {
    const organization = await ensurePlatformOrganization(prisma)
    console.log(`Platformorganisatie beschikbaar met ID ${organization.id}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Bootstrap van de platformorganisatie is mislukt.')
    process.exitCode = 1
  })
