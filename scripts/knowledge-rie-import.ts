import 'dotenv/config'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { getPrisma } from '../src/lib/prisma'
import { IMA_RIE_ACCEPTANCE_SOURCE_CODES, importImaRieDocuments, inspectImaRieDocuments, prepareImaRieSet, preflightImaRieDocuments } from '../src/lib/knowledge/knowledge-rie-import'

function option(args: string[], name: string) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function assertPreviewDatabaseBinding() {
  if (process.env.KNOWLEDGE_IMPORT_TARGET !== 'preview') throw new Error('KNOWLEDGE_RIE_PREVIEW_TARGET_REQUIRED')
  const expectedHostHash = process.env.KNOWLEDGE_IMPORT_EXPECTED_DATABASE_HOST_HASH
  if (!expectedHostHash || !/^[0-9a-f]{64}$/u.test(expectedHostHash)) throw new Error('KNOWLEDGE_RIE_EXPECTED_DATABASE_IDENTITY_REQUIRED')
  let url: URL
  try { url = new URL(process.env.DATABASE_URL ?? '') } catch { throw new Error('KNOWLEDGE_RIE_DATABASE_URL_INVALID') }
  const hostHash = createHash('sha256').update(url.hostname.toLocaleLowerCase('en-US')).digest('hex')
  if (hostHash !== expectedHostHash) throw new Error('KNOWLEDGE_RIE_DATABASE_IDENTITY_MISMATCH')
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const root = path.resolve(option(args, '--root') ?? '')
  if (!root || !['prepare', 'preflight', 'import-acceptance', 'verify-acceptance'].includes(command ?? '')) throw new Error('Gebruik: knowledge-rie-import <prepare|preflight|import-acceptance|verify-acceptance> --root <local-sources/rie> [--output <map>] [--confirm-preview]')
  const output = path.resolve(option(args, '--output') ?? path.join(root, 'knowledge-safe'))
  const prepared = await prepareImaRieSet(root, output)
  if (command === 'prepare') {
    console.info(JSON.stringify({ prepared: prepared.length, output, sourceCodes: prepared.map((entry) => entry.definition.sourceCode), redactions: prepared.map((entry) => ({ sourceCode: entry.definition.sourceCode, counts: entry.redactionReport.counts })) }, null, 2))
    return
  }
  assertPreviewDatabaseBinding()
  const database = getPrisma()
  try {
    const selected = command === 'import-acceptance' ? prepared.filter((entry) => IMA_RIE_ACCEPTANCE_SOURCE_CODES.includes(entry.definition.sourceCode)) : prepared
    if (command === 'verify-acceptance') {
      const inspection = await inspectImaRieDocuments(IMA_RIE_ACCEPTANCE_SOURCE_CODES, database)
      console.info(JSON.stringify({ target: 'preview', inspection }, null, 2))
      return
    }
    const preflight = await preflightImaRieDocuments(selected, database)
    console.info(JSON.stringify({ target: 'preview', selected: selected.map((entry) => entry.definition.sourceCode), statuses: preflight.documents, preflightCounts: { sourceCodeMatches: preflight.sourceCodeMatches.length, checksumMatches: preflight.checksumMatches.length, canonicalIdentityMatches: preflight.canonicalIdentityMatches.length } }, null, 2))
    if (command === 'preflight') return
    if (!args.includes('--confirm-preview')) throw new Error('KNOWLEDGE_RIE_IMPORT_CONFIRMATION_REQUIRED')
    if (preflight.documents.some((document) => document.status === 'CONFLICT')) throw new Error('KNOWLEDGE_RIE_IMPORT_PREFLIGHT_CONFLICT')
    const result = await importImaRieDocuments(prepared, IMA_RIE_ACCEPTANCE_SOURCE_CODES, new Date(), database)
    console.info(JSON.stringify({ imported: result.results.map(({ entry, result: item }) => ({ sourceCode: entry.definition.sourceCode, sourceId: item.sourceId, sourceVersionId: item.sourceVersionId, extractionRunId: item.extractionRunId, sourceCreated: item.sourceCreated, extractionCreated: item.extractionCreated })), family: result.family }, null, 2))
  } finally {
    await database.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'IMA RI&E-import mislukt.')
  process.exitCode = 1
})
