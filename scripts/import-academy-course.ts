import { readFile } from 'node:fs/promises'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { planAcademyImport, importAcademyBundle } from '../src/lib/learning/academy-import-service'
import { assertAcademyDatabaseTarget } from '../src/lib/learning/academy-database-policy'
import { wl002RemediatedCourseBundle } from '../src/lib/learning/wl002-content-v1-2'

const args = process.argv.slice(2)
const allowed = new Set(['--execute', '--file', '--operator-reference'])
for (let index = 0; index < args.length; index++) {
  if (!allowed.has(args[index])) throw new Error('Onbekende importoptie; gebruik --file, --execute of --operator-reference.')
  if (args[index] !== '--execute') {
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('Importoptie vereist een waarde.')
    index++
  }
}
const value = (flag: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined
const source: unknown = value('--file') ? JSON.parse(await readFile(value('--file')!, 'utf8')) : wl002RemediatedCourseBundle
if (!args.includes('--execute')) {
  const plan = planAcademyImport(source)
  console.info(JSON.stringify({ mode: plan.mode, ...plan.statistics, bundleHash: plan.bundleHash }, null, 2))
} else {
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  try { console.info(JSON.stringify(await importAcademyBundle(db, source, { execute: true, operatorReference: value('--operator-reference') }), null, 2)) }
  finally { await db.$disconnect() }
}
