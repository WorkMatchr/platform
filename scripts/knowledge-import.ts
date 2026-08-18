import 'dotenv/config'
import { correctKnowledgePackage, importKnowledgePackage, previewKnowledgeImport } from '../src/lib/knowledge/knowledge-import-service'
import { validateKnowledgeImport } from '../src/lib/knowledge/knowledge-import-validation'
import { readFile, stat } from 'node:fs/promises'
import { KNOWLEDGE_IMPORT_MAX_BYTES } from '../src/lib/knowledge/knowledge-import-schema'
import { getPrisma } from '../src/lib/prisma'
import { attachReviewedKnowledgeToExistingSourceVersion, previewReviewedKnowledgeAttachment } from '../src/lib/knowledge/knowledge-reviewed-attachment-service'

async function main() {
  const [, , command, fileName, ...flags] = process.argv
  if (!['validate', 'preview', 'import', 'correct', 'attach-preview', 'attach'].includes(command ?? '') || !fileName) throw new Error('Gebruik: knowledge-import <validate|preview|import|correct|attach-preview|attach> <bestand> [--confirm] [--reason="..."]')
  if (command === 'validate') {
    if ((await stat(fileName)).size > KNOWLEDGE_IMPORT_MAX_BYTES) throw new Error('Het importpakket is groter dan 5 MB.')
    const result = validateKnowledgeImport(JSON.parse(await readFile(fileName, 'utf8')) as unknown)
    if (!result.valid) throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
    console.info(JSON.stringify({ valid: true, counts: result.counts, conflicts: result.conflicts }, null, 2))
    return
  }
  if (command === 'preview') {
    try {
      console.info(JSON.stringify(await previewKnowledgeImport(fileName), null, 2))
    } finally {
      await getPrisma().$disconnect()
    }
    return
  }
  if (command === 'attach-preview') {
    try {
      console.info(JSON.stringify(await previewReviewedKnowledgeAttachment(fileName), null, 2))
    } finally {
      await getPrisma().$disconnect()
    }
    return
  }
  try {
    if (command === 'attach') {
      console.info(JSON.stringify(await attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: flags.includes('--confirm') }), null, 2))
    } else if (command === 'correct') {
      const reason = flags.find((flag) => flag.startsWith('--reason='))?.slice('--reason='.length) ?? ''
      console.info(JSON.stringify(await correctKnowledgePackage(fileName, { confirm: flags.includes('--confirm'), correctionReason: reason }), null, 2))
    } else {
      console.info(JSON.stringify(await importKnowledgePackage(fileName, { confirm: flags.includes('--confirm') }), null, 2))
    }
  } finally {
    await getPrisma().$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Onbekende importfout.')
  process.exitCode = 1
})
