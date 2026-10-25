import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { F4_BINDING } from '../src/lib/compliance/compliance-f4-catalog'

// Operator-only CLI: existing, explicitly supplied database read access; no HTTP/auth bypass.
// No env-file loading, actor impersonation, publication flag or apply mode.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  return nextResolve(specifier, context)
} })

async function main() {
  if (process.argv.slice(2).join(' ') !== '--check' || !process.env.COMPLIANCE_REVIEW_DATABASE_URL) {
    console.error('Gebruik --check met een afzonderlijk aangeleverde COMPLIANCE_REVIEW_DATABASE_URL. Geen apply-modus.')
    process.exitCode = 1
    return
  }
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.COMPLIANCE_REVIEW_DATABASE_URL }), log: [] })
  try {
    const { inspectComplianceFramework } = await import('../src/lib/compliance/compliance-v2-framework')
    const result = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      return inspectComplianceFramework(tx, F4_BINDING.id)
    }, { isolationLevel: 'RepeatableRead', timeout: 30_000 })
    const { definition, ...report } = result
    const manifest = JSON.parse(readFileSync('docs/compliance-f4-legal-matrix.json', 'utf8')) as { rules: { code: string; templateChecksum: string }[] }
    console.log(JSON.stringify({ framework: F4_BINDING, checkedAt: new Date().toISOString(), readOnly: true, ...report,
      expectedRules: manifest.rules.map(rule => ({ code: rule.code, templateChecksum: rule.templateChecksum,
        present: result.rules.some(r => r.code === rule.code) })),
      sourceBindings: definition?.modules.flatMap(m => m.rules.map(r => ({ rule: r.code, sources: r.sources.map(s => ({ claimId: s.claimId, claimChecksum: s.claimChecksum, sourceVersionId: s.sourceVersionId, sourceChecksum: s.sourceChecksum })) }))) ?? [],
    }, null, 2))
    if (result.decision !== 'GO') process.exitCode = 2
  } catch {
    // Driver errors can contain URLs or data. Never print raw exceptions.
    console.error('NO_GO: database of framework kon niet veilig read-only worden gecontroleerd.')
    process.exitCode = 1
  } finally { await db.$disconnect() }
}

void main()
