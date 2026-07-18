import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPrisma } from '../src/lib/prisma'
import {
  ADR013_PHASE2A,
  dryRunAdr013Phase2A,
  executeAdr013Phase2A,
  verifyAdr013Phase2A,
  type ApprovedUserRecord,
} from '../src/lib/account-architecture/adr013-phase2a-service'

type RecordDecisionReport = {
  reportVersion: string
  users: Array<{
    userId: string
    normalizedEmail: string
    status: 'ACTIVE' | 'INVITED'
    membershipCount: number
  }>
}

function selectedMode(): 'dry-run' | 'execute' {
  const dryRun = process.argv.includes('--dry-run')
  const execute = process.argv.includes('--execute')
  if (dryRun === execute) {
    throw new Error('Kies exact één modus: --dry-run of --execute.')
  }
  return execute ? 'execute' : 'dry-run'
}

async function loadApprovedUsers(): Promise<ApprovedUserRecord[]> {
  const reportPath = path.join(process.cwd(), 'reports', 'account-architecture-record-decisions.json')
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as RecordDecisionReport
  if (!report.reportVersion || !Array.isArray(report.users)) {
    throw new Error('Het recordbeslisrapport heeft een ongeldig formaat.')
  }
  const users = report.users.map((user) => ({
    userId: user.userId,
    normalizedEmail: user.normalizedEmail.trim().toLowerCase(),
    status: user.status,
    membershipCount: user.membershipCount,
  }))
  if (
    users.length !== ADR013_PHASE2A.existingUserIds.length ||
    ADR013_PHASE2A.existingUserIds.some((userId) => !users.some((user) => user.userId === userId))
  ) {
    throw new Error('Het recordbeslisrapport bevat niet exact de goedgekeurde Fase 2A-Users.')
  }
  return users
}

async function main() {
  const mode = selectedMode()
  const approvedUsers = await loadApprovedUsers()
  const prisma = getPrisma()
  try {
    const report = mode === 'execute'
      ? await executeAdr013Phase2A(prisma, approvedUsers)
      : await dryRunAdr013Phase2A(prisma, approvedUsers)
    console.log(JSON.stringify(report, null, 2))
    if (mode === 'execute') {
      console.log(JSON.stringify({ verification: await verifyAdr013Phase2A(prisma, approvedUsers) }, null, 2))
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'ADR-013 Fase 2A is fail-closed afgebroken.')
  process.exitCode = 1
})
