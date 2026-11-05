import { z } from 'zod'

export const designStates = ['DRAFT', 'REVIEW', 'APPROVED', 'ACTIVE', 'ARCHIVED'] as const
export type DesignState = typeof designStates[number]
export const designStateLabels: Record<DesignState,string> = { DRAFT:'Concept', REVIEW:'Review', APPROVED:'Goedgekeurd', ACTIVE:'Actief', ARCHIVED:'Gearchiveerd' }
export const certificateFields = ['deelnemer.naam','cursus.titel','cursus.code','cursus.versie','datum','certificaat.nummer','certificaat.verificatie_url'] as const
export type CertificateValues = Record<typeof certificateFields[number],string>
const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Gebruik een geldige kleur.')
const text = z.string().max(2000).refine(v => !/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v), 'Gebruik gewone tekst, geen HTML.')
  .refine(v => [...v.matchAll(/{{(.*?)}}/g)].every(m => (certificateFields as readonly string[]).includes(m[1])) && !/[{}]/.test(v.replace(/{{.*?}}/g,'')), 'Onbekend of onvolledig invulveld.')
const box = { id:z.string().regex(/^[a-zA-Z0-9-]{1,60}$/), x:z.number().min(24).max(790), y:z.number().min(24).max(500), width:z.number().min(20).max(794), height:z.number().min(12).max(480) }
const media = z.string().regex(/^\/learning-media\/[a-f0-9]{64}\.webp$/, 'Kies een geüploade afbeelding.')
export const designSchema = z.object({
  schemaVersion:z.literal(1), background:color, backgroundImage:z.union([z.literal(''),media]),
  borderColor:color, borderWidth:z.number().min(0).max(8),
  elements:z.array(z.discriminatedUnion('kind',[
    z.object({...box,kind:z.literal('text'),text,font:z.enum(['Helvetica','Times','Courier']),fontSize:z.number().min(8).max(60),bold:z.boolean(),italic:z.boolean(),align:z.enum(['left','center','right']),color}).strict(),
    z.object({...box,kind:z.literal('image'),source:z.union([z.literal('WORKMATCHR_LOGO'),media]),alt:z.string().min(1).max(160)}).strict(),
    z.object({...box,kind:z.literal('qr')}).strict(),
    z.object({...box,kind:z.literal('decoration'),color}).strict(),
  ])).min(4).max(30),
}).strict().superRefine((v,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:'custom',message})
  if(new Set(v.elements.map(e=>e.id)).size!==v.elements.length) issue('Elk blok heeft een unieke identiteit nodig.')
  if(v.elements.filter(e=>e.kind==='image').length>4) issue('Gebruik maximaal vier afbeeldingen naast de achtergrond.')
  const qr=v.elements.filter(e=>e.kind==='qr')
  if(qr.length!==1 || qr[0].width<70 || qr[0].height!==qr[0].width) issue('Gebruik precies één vierkante QR-code van minimaal 70 punten.')
  for(const e of v.elements) if(e.x+e.width>818 || e.y+e.height>515) issue('Houd alle blokken binnen de afdrukmarges en boven de vaste voettekst.')
  const texts=v.elements.filter(e=>e.kind==='text').map(e=>e.text).join(' ')
  for(const field of ['deelnemer.naam','cursus.titel','datum','certificaat.nummer']) if(!texts.includes('{{'+field+'}}')) issue('Het invulveld '+field+' is verplicht.')
  const foreground=v.elements.filter(e=>e.kind!=='decoration')
  for(let i=0;i<foreground.length;i++) for(let j=i+1;j<foreground.length;j++){
    const a=foreground[i],b=foreground[j]
    if(a.x<b.x+b.width && a.x+a.width>b.x && a.y<b.y+b.height && a.y+a.height>b.y) issue('Tekst, afbeeldingen en QR-code mogen elkaar niet overlappen.')
  }
})
export type CertificateDesign = z.infer<typeof designSchema>
export type DesignElement = CertificateDesign['elements'][number]
export function fillCertificateText(text:string,values:CertificateValues) {
  return text.replace(/{{(.*?)}}/g,(_,key:string)=>{
    if(!(certificateFields as readonly string[]).includes(key)) throw Error('Onbekend invulveld.')
    return values[key as keyof CertificateValues]
  })
}
export const demoCertificateValues:CertificateValues = {
  'deelnemer.naam':'Jan de Vries','cursus.titel':'Veilig en gezond werken','cursus.code':'WL-DEMO','cursus.versie':'1.0',
  datum:'4 november 2026','certificaat.nummer':'DEMO-000001','certificaat.verificatie_url':'https://example.invalid/certificaat/DEMO-000001',
}
export const standardCertificateDesign:CertificateDesign = {
 schemaVersion:1,background:'#f5fbff',backgroundImage:'',borderColor:'#0c3048',borderWidth:2,
 elements:[
 {id:'accent',kind:'decoration',x:24,y:24,width:794,height:12,color:'#159fa8'},
 {id:'logo',kind:'image',x:48,y:55,width:185,height:52,source:'WORKMATCHR_LOGO',alt:'WorkMatchr Learning'},
 {id:'learning',kind:'text',x:250,y:68,width:300,height:30,text:'WORKMATCHR LEARNING',font:'Helvetica',fontSize:15,bold:true,italic:false,align:'left',color:'#0c3048'},
 {id:'title',kind:'text',x:48,y:140,width:740,height:55,text:'CERTIFICAAT',font:'Helvetica',fontSize:36,bold:true,italic:false,align:'center',color:'#0c3048'},
 {id:'statement',kind:'text',x:65,y:220,width:710,height:140,text:'Bij WorkMatchr Learning heeft {{deelnemer.naam}} de e-learning {{cursus.titel}} met goed gevolg afgerond.',font:'Helvetica',fontSize:22,bold:false,italic:false,align:'center',color:'#0c3048'},
 {id:'date',kind:'text',x:65,y:395,width:530,height:32,text:'Behaald op {{datum}} · {{cursus.code}} / {{cursus.versie}}',font:'Helvetica',fontSize:12,bold:false,italic:false,align:'left',color:'#0c3048'},
 {id:'number',kind:'text',x:65,y:445,width:530,height:45,text:'Certificaatnummer: {{certificaat.nummer}}',font:'Helvetica',fontSize:11,bold:true,italic:false,align:'left',color:'#0c3048'},
 {id:'qr',kind:'qr',x:680,y:390,width:100,height:100},
 ],
}
export function canTransitionDesign(from:DesignState,to:DesignState) {
 return ({DRAFT:['REVIEW'],REVIEW:['DRAFT','APPROVED'],APPROVED:['ACTIVE','ARCHIVED'],ACTIVE:['ARCHIVED'],ARCHIVED:[]} as Record<DesignState,string[]>)[from].includes(to)
}
