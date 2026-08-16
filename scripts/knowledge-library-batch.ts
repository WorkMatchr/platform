import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { formatKnowledgeLibraryReport, inventoryKnowledgeLibrary, parseKnowledgeLibraryMetadataManifest, type KnowledgeLibraryBatchOptions } from '../src/lib/knowledge/knowledge-library-batch'

function option(args: string[], name: string) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

async function main() {
  const args = process.argv.slice(2)
  const root = option(args, '--root')
  if (!root) throw new Error('Gebruik --root <local-sources-map>.')
  const overridesFile = option(args, '--metadata')
  const options: KnowledgeLibraryBatchOptions = {
    limit: Number(option(args, '--limit') ?? 100),
    fullExtractionLimit: Number(option(args, '--extract') ?? 0),
    metadataOverrides: overridesFile ? parseKnowledgeLibraryMetadataManifest(JSON.parse(await readFile(path.resolve(overridesFile), 'utf8'))) : undefined,
  }
  const report = await inventoryKnowledgeLibrary(path.resolve(root), options)
  const output = args.includes('--json') ? JSON.stringify(report, null, 2) : formatKnowledgeLibraryReport(report)
  const outputFile = option(args, '--output')
  if (outputFile) await writeFile(path.resolve(outputFile), output, 'utf8')
  else console.info(output)
  if (report.files.some((file) => file.status !== 'READY')) process.exitCode = 2
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Knowledge Library batchinventarisatie mislukt.')
  process.exitCode = 1
})
