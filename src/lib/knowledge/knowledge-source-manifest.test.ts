import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { inventoryKnowledgeSourceDirectory, loadKnowledgeSourceManifest, verifyManifestSource } from './knowledge-source-manifest'

describe.runIf(existsSync('local-sources/knowledge/knowledge-sources.local.json'))('lokaal kennisbronmanifest', () => {
  it('verifieert de tien geconfigureerde PDF-bronnen', async () => {
    const manifest = await loadKnowledgeSourceManifest()
    expect(manifest.sources.map((source) => source.code)).toEqual([
      'AI-01',
      'AI-02',
      'AI-03',
      'AI-04',
      'AI-05',
      'AI-06',
      'AI-07',
      'AI-08',
      'AI-09',
      'AI-10',
    ])
    for (const source of manifest.sources) await expect(verifyManifestSource(source)).resolves.toMatchObject({ code: source.code, extractionStatus: 'READY' })
  })

  it('inventariseert overige PDF en legacy DOC zonder die te openen', async () => {
    const inventory = await inventoryKnowledgeSourceDirectory()
    expect(inventory.pdfCount).toBe(39)
    expect(inventory.legacyDocCount).toBe(33)
    expect(inventory.duplicateNumbers.some((entry) => entry.multipleFormats)).toBe(true)
  })
})
