import 'dotenv/config'
import { formatKnowledgeBatchReportMarkdown, validateKnowledgeImportBatch } from '../src/lib/knowledge/knowledge-import-batch'
import { getPrisma } from '../src/lib/prisma'

async function main() {
  const args = process.argv.slice(2)
  const preview = args.includes('--preview')
  const json = args.includes('--json')
  const files = args.filter((arg) => !arg.startsWith('--'))
  const report = await validateKnowledgeImportBatch(files, { preview })
  console.info(json ? JSON.stringify(report, null, 2) : formatKnowledgeBatchReportMarkdown(report))
  if (report.blockedCount > 0) process.exitCode = 2
}

main()
  .finally(async () => { if (process.argv.includes('--preview')) await getPrisma().$disconnect() })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Batchvalidatie mislukt.')
    process.exitCode = 1
  })
