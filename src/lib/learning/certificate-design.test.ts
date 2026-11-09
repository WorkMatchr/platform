import { describe,it,expect,vi } from 'vitest'
import { certificatePreviewPng } from './certificate-design-preview'
import { PDFDocument } from 'pdf-lib'
import { designSchema,standardCertificateDesign,fillCertificateText,demoCertificateValues,canTransitionDesign } from './certificate-design-contract'
import { certificateDesignChecksum,renderCertificateDesign } from './certificate-design-pdf'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
vi.mock('server-only',()=>({}))
const copy=()=>structuredClone(standardCertificateDesign)
describe('certificate designer contract and PDF',()=>{
 it('has one bounded, printable default and supports all explicit placeholders',()=>{
  expect(designSchema.parse(copy())).toEqual(copy())
  expect(fillCertificateText(Object.keys(demoCertificateValues).map(k=>'{{'+k+'}}').join(' '),demoCertificateValues)).toContain('DEMO-000001')
 })
 it.each(['{{user.password}}','{{deelnemer.naam','<script>alert(1)</script>','{{ constructor }}'])('refuses unsafe/unknown text %s',text=>{
  const d=copy();d.elements.push({id:'test',kind:'text',x:48,y:110,width:700,height:20,text,font:'Helvetica',fontSize:10,bold:false,italic:false,align:'left',color:'#000000'})
  expect(designSchema.safeParse(d).success).toBe(false)
 })
 it('refuses external assets, QR removal, overlaps, margins and missing identity',()=>{
  const changes:Array<(d:ReturnType<typeof copy>)=>void>=[d=>{d.backgroundImage='https://example.invalid/x.png'},d=>{d.elements=d.elements.filter(e=>e.kind!=='qr')},d=>{d.elements[1].x=810},d=>{d.elements[1].y=230},d=>{d.elements=d.elements.filter(e=>e.id!=='number')}]
  for(const change of changes){
   const d=copy();change(d);expect(designSchema.safeParse(d).success).toBe(false)
  }
 })
 it('allows only explicit lifecycle transitions and hashes normalized content',()=>{
  expect(canTransitionDesign('DRAFT','ACTIVE')).toBe(false);expect(canTransitionDesign('ARCHIVED','ACTIVE')).toBe(false);expect(canTransitionDesign('REVIEW','APPROVED')).toBe(true)
  expect(certificateDesignChecksum(copy())).toBe(certificateDesignChecksum(JSON.parse(JSON.stringify(copy()))))
  const d=copy();d.background='#ffffff';expect(certificateDesignChecksum(d)).not.toBe(certificateDesignChecksum(copy()))
 })
 it('uses one A4 landscape page and marks the preview without issuing anything',async()=>{
  const bytes=await renderCertificateDesign(copy(),demoCertificateValues)
  const png=await certificatePreviewPng(bytes);expect(png.subarray(1,4).toString()).toBe('PNG');
  const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(1);expect(pdf.getPage(0).getSize()).toEqual({width:841.89,height:595.28})
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:bytes,useSystemFonts:true}),doc=await task.promise
  const page=await doc.getPage(1),content=await page.getTextContent(),text=content.items.flatMap(i=>'str'in i?[i.str]:[]).join(' ')
  expect(text).toContain('Jan de Vries');expect(text).toContain('DEMO-000001');expect(text).toContain('GEEN GELDIG CERTIFICAAT');expect(await page.getStructTree()).not.toBeNull();await task.destroy()
 })
 it('fits maximum names and titles, rejects impossible text without clipping',async()=>{
  const values={...demoCertificateValues,'deelnemer.naam':'Lange naam '.repeat(20).slice(0,200),'cursus.titel':'Lange opleiding '.repeat(20).slice(0,240)}
  expect((await PDFDocument.load(await renderCertificateDesign(copy(),values))).getPageCount()).toBe(1)
  const d=copy();const e=d.elements.find(e=>e.id==='statement')!;e.height=12
  await expect(renderCertificateDesign(d,values)).rejects.toThrow('Tekst past niet')
 })
 it('fails closed on unavailable images and unsupported fonts or characters',async()=>{
  const d=copy();d.backgroundImage='/learning-media/'+'a'.repeat(64)+'.webp'
  await expect(renderCertificateDesign(d,demoCertificateValues)).rejects.toThrow()
  const invalid=copy();Object.assign(invalid.elements[2],{font:'RemoteFont'});expect(designSchema.safeParse(invalid).success).toBe(false)
  await expect(renderCertificateDesign(copy(),{...demoCertificateValues,'deelnemer.naam':'😀'})).rejects.toThrow('teken')
 })
 it.each([
  ['WL-001','1.2','RI&E in de praktijk'],
  ['WL-002','WL-002-COURSE-1.3','Preventiemedewerker in de praktijk'],
  ['WL-003','WL-003-COURSE-1.1','Veilig en gezond werken'],
 ])('drukt de uitgiftegegevens van %s af op het tekst-/QR-certificaat', async (courseCode,courseVersion,courseTitle) => {
  const definition = copy()
  definition.elements = definition.elements.filter(element => element.kind !== 'image')
  const certificateNumber = 'WM-ACA-2026-0123456789ABCDEF01234567'
  const bytes = await buildLearningCertificatePdf({
   templateVersion: 'ACADEMY-DESIGN-1',
   designSnapshot: { definition, checksum: certificateDesignChecksum(definition), courseCode },
   firstName: 'Synthetische', lastName: 'Cursist', courseTitle, courseVersion, certificateNumber,
   issuedAt: new Date('2026-11-04T12:00:00Z'),
  })
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
  try {
   const pdf = await task.promise
   expect(pdf.numPages).toBe(1)
   const page = await pdf.getPage(1)
   const content = await page.getTextContent()
   const text = content.items.flatMap(item => 'str' in item ? [item.str] : []).join(' ').replace(/\s+/g,' ')
   for (const field of [courseCode,courseVersion,courseTitle,'Synthetische Cursist','4 november 2026',certificateNumber]) {
    expect(text).toContain(field)
   }
   expect(text).toContain('geen wettelijke beroepskwalificatie')
  } finally {
   await task.destroy()
  }
 })
 it('renders only the pinned issued snapshot and refuses corruption',async()=>{
  const definition=copy(),snapshot={definition,checksum:certificateDesignChecksum(definition),courseCode:'WL-TEST'}
  const certificate={templateVersion:'ACADEMY-DESIGN-1',designSnapshot:snapshot,firstName:'Jan',lastName:'de Vries',courseTitle:'Veilig en gezond werken',courseVersion:'2',certificateNumber:'WM-ACA-2026-0123456789ABCDEF01234567',issuedAt:new Date('2026-11-04')}
  const original=await buildLearningCertificatePdf(certificate)
  expect((await PDFDocument.load(original)).getPageCount()).toBe(1)
  expect((await PDFDocument.load(original)).getCreationDate()).toEqual(certificate.issuedAt)
  expect(await buildLearningCertificatePdf(certificate)).toEqual(original)
  await expect(buildLearningCertificatePdf({...certificate,designSnapshot:{...snapshot,checksum:'0'.repeat(64)}})).rejects.toThrow('INTEGRITY')
 })
})
