import { renderToStaticMarkup } from 'react-dom/server'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it, vi } from 'vitest'
import { ArboGuideReportView } from './arbo-guide-report-view'
import { buildComplianceV2Report } from '@/lib/compliance/compliance-v2'
import { v2Definition, v2Answers, v2Context } from '@/test-fixtures/compliance-v2'
import { buildComplianceReportPdf } from '@/lib/compliance-guide/compliance-report-pdf'
import { buildComplianceReportData } from '@/lib/compliance-guide/compliance-report'
import { initialComplianceGuideAnswers } from '@/lib/compliance-guide/compliance-guide'
import { arboGuideReportV1SnapshotSchema } from '@/lib/arbo-guides/arbo-guide-run-service'
import ComplianceDashboardPage from '@/app/dashboard/compliance/page'
const { dashboard } = vi.hoisted(() => ({ dashboard: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/organizations/organization-authorization', () => ({ requireOrganizationMembership: async () => ({ user: { id: 'synthetic' }, activeMembership: { organization: { id: 'synthetic-org' } } }) }))
vi.mock('@/lib/compliance/compliance-action-service', () => ({ getComplianceDashboard: dashboard }))
vi.mock('@/app/dashboard/compliance/actions', () => ({ updateComplianceActionFromForm: vi.fn() }))

describe('Versiegebonden historische rapportlezers', () => {
  it('leest v2 ook op het bestaande dashboard zonder vierstatusprojectie of betaalde acties', async () => {
    dashboard.mockResolvedValue({ latestRun: { id: 'synthetic-run', reportSnapshot: buildComplianceV2Report(v2Definition(), v2Answers, v2Context) }, actions: [], members: [] })
    const html = renderToStaticMarkup(await ComplianceDashboardPage())
    for (const label of ['Op orde', 'Aandacht nodig', 'Actie vereist', 'Niet beoordeeld', 'Niet van toepassing']) expect(html).toContain(label)
    expect(html).toContain('/mijn-arbo-wijzers/synthetic-run/pdf')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('<form')
    expect(dashboard).toHaveBeenCalledWith({ userId: 'synthetic', organizationId: 'synthetic-org' })
  })
  it('houdt legacy Controleren en vier tellingen ongewijzigd', () => {
    const legacy = arboGuideReportV1SnapshotSchema.parse(buildComplianceReportData({ answers: initialComplianceGuideAnswers, organizationName: 'Test', scannedAt: new Date(v2Context.scannedAt), tier: 'BASIC' }))
    const before = JSON.stringify(legacy)
    const html = renderToStaticMarkup(<ArboGuideReportView report={legacy} />)
    expect(html).toContain('moeten worden gecontroleerd')
    expect(html).not.toContain('onderwerp is nog niet voldoende beoordeeld')
    expect(JSON.stringify(legacy)).toBe(before)
  })
  it('toont vijf labels, incompleetheid en wettelijke grondslag zonder terugvertaling', () => {
    const r = buildComplianceV2Report(v2Definition(), v2Answers, v2Context)
    const html = renderToStaticMarkup(<ArboGuideReportView report={r} />)
    for (const label of ['Op orde', 'Aandacht nodig', 'Actie vereist', 'Niet beoordeeld', 'Niet van toepassing']) expect(html).toContain(label)
    expect(html).toContain('Wettelijke verplichting')
    expect(html).toContain('nog niet voldoende beoordeeld')
    expect(html).toContain('noopener noreferrer')
  })
  it('maakt de v2-PDF uit dezelfde immutable snapshot met vijf statussen', async () => {
    const r = buildComplianceV2Report(v2Definition(), v2Answers, v2Context), before = JSON.stringify(r)
    const bytes = await buildComplianceReportPdf(r)
    const task = getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
    const document = await task.promise, pages: string[] = []
    for (let i = 1; i <= document.numPages; i++) pages.push((await (await document.getPage(i)).getTextContent()).items.map(x => 'str' in x ? x.str : '').join(' '))
    await task.destroy()
    const text = pages.join(' ')
    for (const label of ['Op orde', 'Aandacht nodig', 'Actie vereist', 'Niet beoordeeld', 'Niet van toepassing']) expect(text).toContain(label)
    expect(text).toContain('Wettelijke verplichting')
    expect(JSON.stringify(r)).toBe(before)
  })
})
