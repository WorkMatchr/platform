import { getPrisma } from '../src/lib/prisma'
import { ensureProviderServiceCatalog } from '../prisma/provider-service-catalog'

async function main() {
  const args = process.argv.slice(2)
  if (args.length && (args.length !== 1 || args[0] !== '--apply')) throw new Error('Onbekende optie.')
  const prisma = getPrisma()
  try {
    console.log(await ensureProviderServiceCatalog(prisma, args[0] === '--apply'))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(() => {
  console.error('Cataloguscontrole of inrichting mislukt. Controleer de doelomgeving, toegang en bestaande SERVICE-versies.')
  process.exitCode = 1
})
