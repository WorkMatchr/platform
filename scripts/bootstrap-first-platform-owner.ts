import 'dotenv/config'
import { getPrisma } from '../src/lib/prisma'
import { assertFirstPlatformOwnerBootstrapEnvironment, FirstPlatformOwnerBootstrapPolicyError } from '../src/lib/account-architecture/first-platform-owner-bootstrap-policy'
import { parseFirstPlatformOwnerBootstrapArguments, FirstPlatformOwnerBootstrapArgumentError } from '../src/lib/account-architecture/first-platform-owner-bootstrap-command'
import { executeFirstPlatformOwnerBootstrap, inspectFirstPlatformOwnerBootstrap, FirstPlatformOwnerBootstrapError } from '../src/lib/account-architecture/first-platform-owner-bootstrap-service'

async function main() {
  const { execute, userId, operatorReference } = parseFirstPlatformOwnerBootstrapArguments(process.argv.slice(2))
  assertFirstPlatformOwnerBootstrapEnvironment()
  const prisma = getPrisma()
  try {
    const report = execute
      ? await executeFirstPlatformOwnerBootstrap(prisma, { userId, operatorReference })
      : await inspectFirstPlatformOwnerBootstrap(prisma, { userId, operatorReference })
    console.log(JSON.stringify(report, null, 2))
    if (!execute) {
      console.log('Dry-run: er zijn geen databasewijzigingen uitgevoerd.')
      if (report.blockers.length) process.exitCode = 1
    }
  } finally { await prisma.$disconnect() }
}
main().catch((error: unknown) => {
  if (error instanceof FirstPlatformOwnerBootstrapPolicyError || error instanceof FirstPlatformOwnerBootstrapError || error instanceof FirstPlatformOwnerBootstrapArgumentError) {
    console.error(error.message)
  } else console.error('First-owner-bootstrap is fail-closed afgebroken; details zijn weggelaten.')
  process.exitCode = 1
})
