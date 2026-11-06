// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
const m = vi.hoisted(() => ({ guard: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/platform-admin/platform-admin-authorization',()=>({requirePlatformOperator:m.guard}))
vi.mock('@/lib/learning/academy-review-service',()=>({listAcademyReviews:m.read}))
vi.mock('@/components/learning/academy-review-decision-form',()=>({AcademyReviewDecisionForm:()=> <button>Beoordeling vastleggen</button>}))
import Page from './page'
const first={id:'request',caseId:'case',action:'REQUESTED',kind:'EXAM_SCORE',createdAt:new Date('2026-10-31'),reason:'Bezwaar tegen de inhoudelijke beoordeling'}
beforeEach(()=>{vi.resetAllMocks();m.guard.mockResolvedValue({userId:'operator'});m.read.mockResolvedValue([first])})
afterEach(cleanup)
it('loads without commerce activation and offers named native filters and expandable details',async()=>{render(await Page({searchParams:Promise.resolve({})}));expect(m.read).toHaveBeenCalledWith('operator',true);expect(screen.getByRole('combobox',{name:'Soort verzoek'})).toBeTruthy();expect(screen.getByText(/Bezwaar tegen examenresultaat —/).tagName).toBe('SUMMARY');expect(screen.getByRole('combobox',{name:'Status'})).toBeTruthy()})
it('filters kinds and handles empty selections',async()=>{render(await Page({searchParams:Promise.resolve({kind:'CERTIFICATE_NAME'})}));expect(screen.getByText(/geen beoordelingsverzoeken/)).toBeTruthy()})
it('shows terminal history but no repeat decision form',async()=>{m.read.mockResolvedValue([first,{...first,id:'accepted',action:'ACCEPTED',reason:'Motivering van het besluit'}]);const {container}=render(await Page({searchParams:Promise.resolve({status:'closed'})}));expect(container.textContent).toContain('Geaccepteerd');expect(container.textContent).toContain('Motivering van het besluit');expect(container.textContent).not.toContain('Beoordeling vastleggen')})
it('open filter excludes a terminal case',async()=>{m.read.mockResolvedValue([first,{...first,id:'accepted',action:'ACCEPTED'}]);render(await Page({searchParams:Promise.resolve({status:'open'})}));expect(screen.getByText(/geen beoordelingsverzoeken/)).toBeTruthy()})
it('ignores invalid filter values and escapes request text',async()=>{m.read.mockResolvedValue([{...first,reason:'<script>unsafe()</script>'}]);const {container}=render(await Page({searchParams:Promise.resolve({kind:'__proto__',status:'wrong'})}));expect(container.querySelector('script')).toBeNull();expect(container.textContent).toContain('<script>unsafe()</script>')})
it('shows actionable safe failure without internal errors',async()=>{m.read.mockRejectedValue(Error('PRIVATE_DATABASE_SECRET'));const {container}=render(await Page({searchParams:Promise.resolve({})}));expect(screen.getByRole('link',{name:'Probeer opnieuw'})).toBeTruthy();expect(container.textContent).not.toContain('PRIVATE_DATABASE_SECRET')})
it('never reads private records after failed authorization',async()=>{m.guard.mockRejectedValue(Error('UNAUTHORIZED'));await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('UNAUTHORIZED');expect(m.read).not.toHaveBeenCalled()})
