import 'server-only'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { designSchema, fillCertificateText, type CertificateValues, type CertificateDesign } from './certificate-design-contract'
import { readLearningMedia } from './learning-media-storage'

export function certificateDesignChecksum(raw:unknown) {
 return createHash('sha256').update(JSON.stringify(designSchema.parse(raw))).digest('hex')
}
export function certificateFont(e:Extract<CertificateDesign['elements'][number],{kind:'text'}>) {
 if(e.font==='Times') return e.bold?(e.italic?'Times-BoldItalic':'Times-Bold'):(e.italic?'Times-Italic':'Times-Roman')
 return e.font+(e.bold?(e.italic?'-BoldOblique':'-Bold'):(e.italic?'-Oblique':''))
}
async function imageBytes(source:string) {
 if(source==='WORKMATCHR_LOGO')return readFile(path.join(process.cwd(),'public','branding','workmatchr-logo.png'))
 const found=await readLearningMedia(source.replace('/learning-media/',''))
 if(!found || found.mediaType!=='image/webp')throw Error('Een afbeelding ontbreekt of is gewijzigd.')
 const {default:sharp}=await import('sharp')
 return sharp(found.bytes).png().toBuffer()
}
export async function renderCertificateDesign(raw:unknown,values:CertificateValues,preview=true,correctionNotice?:string) {
 const design=designSchema.parse(raw)
 const doc=new PDFDocument({size:'A4',layout:'landscape',margin:0,tagged:true,lang:'nl',displayTitle:true,info:{Title:preview?'VOORBEELD — geen geldig certificaat':'WorkMatchr Learning certificaat',Author:'WorkMatchr Learning'}})
 const chunks:Buffer[]=[]
 const completed=new Promise<Uint8Array>((resolve,reject)=>{doc.on('data',(c:Buffer)=>chunks.push(c));doc.on('end',()=>resolve(new Uint8Array(Buffer.concat(chunks))));doc.on('error',reject)})
 // Read and validate all assets before writing. Only existing content-addressed private media.
 const assets=new Map<string,Buffer>()
 for(const source of [design.backgroundImage,...design.elements.flatMap(e=>e.kind==='image'?[e.source]:[])].filter(Boolean)) if(!assets.has(source))assets.set(source,await imageBytes(source))
 const qr=await QRCode.toBuffer(values['certificaat.verificatie_url'],{errorCorrectionLevel:'M',margin:4,width:400})
 const structure:PDFKit.PDFStructureElement[]=[]
 const artifact=(draw:()=>void)=>{doc.markContent('Artifact');draw();doc.endMarkedContent()}
 artifact(()=>{
  doc.rect(0,0,841.89,595.28).fill(design.background)
  if(design.backgroundImage)doc.image(assets.get(design.backgroundImage)!,24,24,{fit:[794,491],align:'center',valign:'center'})
  if(design.borderWidth)doc.rect(24,24,794,547).lineWidth(design.borderWidth).stroke(design.borderColor)
  for(const e of design.elements.filter(e=>e.kind==='decoration'))doc.rect(e.x,e.y,e.width,e.height).fill(e.color)
 })
 for(const e of design.elements.filter(e=>e.kind!=='decoration')){
  if(e.kind==='text'){
   const text=fillCertificateText(e.text,values).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,' ')
   // The existing bundled PDF standard fonts use WinAnsi, never silently drop glyphs.
   if(/[^\u0020-\u007e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u20ac\n\r]/.test(text))throw Error('Een teken wordt niet ondersteund door dit lettertype. Gebruik een ondersteund teken.')
   doc.font(certificateFont(e))
   let size=e.fontSize
   while(size>8){doc.fontSize(size);if(doc.heightOfString(text,{width:e.width,align:e.align})<=e.height && text.split(/\s+/).every(w=>doc.widthOfString(w)<=e.width))break;size-=0.5}
   doc.fontSize(size)
   if(doc.heightOfString(text,{width:e.width,align:e.align})>e.height || text.split(/\s+/).some(w=>doc.widthOfString(w)>e.width))throw Error('Tekst past niet. Vergroot het tekstblok of verkort de tekst.')
   const mark=doc.markStructureContent('P')
   doc.fillColor(e.color).text(text,e.x,e.y,{width:e.width,align:e.align})
   doc.endMarkedContent();structure.push(doc.struct('P',{},mark))
  }else{
   const alt=e.kind==='qr'?'Verificatie van het certificaat':e.alt
   const mark=doc.markStructureContent('Figure',{alt})
   if(e.kind==='qr'){doc.rect(e.x,e.y,e.width,e.height).fill('#ffffff');doc.image(qr,e.x,e.y,{width:e.width,height:e.height})}
   else doc.image(assets.get(e.source)!,e.x,e.y,{fit:[e.width,e.height],align:'center',valign:'center'})
   doc.endMarkedContent();structure.push(doc.struct('Figure',{alt},mark))
  }
 }
 const footer=(preview?'VOORBEELD — GEEN GELDIG CERTIFICAAT. ':'')+(correctionNotice?correctionNotice+' ':'')+'Dit certificaat bevestigt cursusafronding en verleent geen wettelijke beroepskwalificatie, erkenning, accreditatie of bevoegdheid tot formele RI&E-toetsing.'
 const mark=doc.markStructureContent('P')
 doc.font('Helvetica').fontSize(8).fillColor('#213340').text(footer,48,535,{width:746})
 doc.endMarkedContent();structure.push(doc.struct('P',{},mark))
 doc.addStructure(doc.struct('Document',{},structure));doc.end()
 return completed
}
