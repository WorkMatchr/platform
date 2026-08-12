import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('detailpagina beheercommunicatie', () => {
  it('gebruikt de server-side operatorguard en toont alleen het opgeslagen tekstsnapshot', () => {
    const page = read('src/app/platformbeheer/communicatie/[communicationId]/page.tsx')

    expect(page).toContain('requirePlatformAdministrator')
    expect(page).toContain('getPlatformAdminCommunicationDetail')
    expect(page).toContain('communication.textSnapshot')
    expect(page).not.toContain('dangerouslySetInnerHTML')
  })
})
