'use client'
import { useEffect,useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'
import { certificateFields,designSchema,standardCertificateDesign,designStateLabels,canTransitionDesign,type CertificateDesign,type DesignElement,type DesignState } from '@/lib/learning/certificate-design-contract'
import { saveDesign,duplicateDesign,changeDesignState,selectDesign } from '@/app/platformbeheer/academy/certificaten/sjablonen/actions'
type Row={id:string;name:string;version:number;revision:number;state:string;definition:CertificateDesign}
type Data={designs:Row[];courses:{id:string;code:string;title:string}[];bindings:{scope:string;designId:string}[]}
const path='/platformbeheer/academy/certificaten/sjablonen'
export function CertificateDesigner({data,selected}:{data:Data;selected?:Row}){
 const router=useRouter()
 const [design,setDesign]=useState(selected?.definition??standardCertificateDesign),[name,setName]=useState(selected?.name??'WorkMatchr Learning standaard')
 const [history,setHistory]=useState<CertificateDesign[]>([]),[redo,setRedo]=useState<CertificateDesign[]>([])
 const [chosen,setChosen]=useState(design.elements[0].id),[message,setMessage]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false)
 const [image,setImage]=useState('')
 const [pdf,setPdf]=useState(''),[previewError,setPreviewError]=useState(''),[previewBusy,setPreviewBusy]=useState(false)
 const [initial]=useState(()=>JSON.stringify({design,name}))
 const dirty=JSON.stringify({design,name})!==initial
 const editable=!selected||selected.state==='DRAFT'
 const validation=designSchema.safeParse(design)
 const block=design.elements.find(e=>e.id===chosen)
 useEffect(()=>{
  const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue=''}}
  const leaving=(event:MouseEvent)=>{
   const link=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null
   if(!dirty||!link||link.hasAttribute('download')||link.href.startsWith('blob:')||link.getAttribute('href')?.startsWith('#'))return
   if(!window.confirm('Uw niet-opgeslagen ontwerp verlaten?')){event.preventDefault();event.stopPropagation()}
  }
  window.addEventListener('beforeunload',warn);document.addEventListener('click',leaving,true)
  return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',leaving,true)}
 },[dirty])
 useEffect(()=>{
  let url='',imageUrl='';const controller=new AbortController()
  const timer=setTimeout(async()=>{
   if(!designSchema.safeParse(design).success){setPreviewError('Corrigeer eerst de ontwerpvelden.');setPdf('');return}
   setPreviewBusy(true);setPreviewError('');setPdf('');setImage('')
   try{
    const response=await fetch(path+'/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(design),signal:controller.signal})
    if(!response.ok)throw Error((await response.json()).error??'Voorbeeld niet beschikbaar.')
    const result=await response.json()
    const blob=(base64:string,type:string)=>new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type})
    if(controller.signal.aborted)return
    url=URL.createObjectURL(blob(result.pdf,'application/pdf'));imageUrl=URL.createObjectURL(blob(result.image,'image/png'));setPdf(url);setImage(imageUrl)
   }catch(error){if(!controller.signal.aborted)setPreviewError(error instanceof Error?error.message:'Voorbeeld niet beschikbaar.')}
   finally{if(!controller.signal.aborted)setPreviewBusy(false)}
  },600)
  return()=>{clearTimeout(timer);controller.abort();if(url)URL.revokeObjectURL(url);if(imageUrl)URL.revokeObjectURL(imageUrl)}
 },[design])
 function change(next:CertificateDesign){setHistory(h=>[...h.slice(-29),design]);setRedo([]);setDesign(next)}
 function update(patch:Partial<DesignElement>){change({...design,elements:design.elements.map(e=>e.id===chosen?{...e,...patch} as DesignElement:e)})}
 function navigate(id?:string){if(!dirty||window.confirm('Uw niet-opgeslagen ontwerp verlaten?'))router.push(id?path+'?id='+encodeURIComponent(id):path)}
 async function operation(action:()=>Promise<{ok:boolean;message?:string;id?:string}>){
  setBusy(true);setMessage('')
  try{const result=await action();if(!result.ok)setMessage(result.message??'Niet uitgevoerd.');else{setMessage('Opgeslagen.');if(result.id)router.push(path+'?id='+result.id);router.refresh()}}
  catch{setMessage('De verbinding is onderbroken. Uw invoer blijft staan. Controleer de opgeslagen versie voordat u opnieuw probeert.')}
  finally{setBusy(false)}
 }
 async function upload(file:File|undefined,target:'background'|'image'){
  if(!file)return
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>3*1024*1024){setMessage('Kies PNG, JPEG of WebP van maximaal 3 MB. SVG wordt niet ondersteund.');return}
  setBusy(true)
  try{const form=new FormData();form.set('file',file);const response=await fetch('/platformbeheer/academy/media',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw Error('Upload mislukt.');if(target==='background')change({...design,backgroundImage:result.path});else update({source:result.path})}
  catch{setMessage('Afbeelding niet opgeslagen. Controleer het bestand en de private mediaopslag.')}
  finally{setBusy(false)}
 }
 const add=(kind:'text'|'image'|'decoration')=>{
  const id=crypto.randomUUID()
  const base={id,kind,x:48,y:110,width:220,height:24}
  const element:DesignElement=kind==='text'?{...base,kind,text:'Nieuw tekstblok',font:'Helvetica',fontSize:12,bold:false,italic:false,align:'left',color:'#0c3048'}:kind==='image'?{...base,kind,source:'WORKMATCHR_LOGO',alt:'Logo of handtekening',height:40}:{...base,kind,color:'#159fa8',height:12}
  change({...design,elements:[...design.elements,element]});setChosen(id)
 }
 return <div className="space-y-5">
 <header><p className="text-sm text-text-secondary">Academy · Certificaten · Sjablonen</p><h1 className="text-2xl font-bold">Certificaatontwerper</h1><p className="mt-2 text-text-secondary">Ontwerp, controleer en kies het certificaat voor uw e-learning. Uitgegeven certificaten veranderen niet.</p></header>
 <div className="flex flex-wrap items-end gap-3">
 <label className="min-w-64">Sjabloon<select className={fieldClassName} value={selected?.id??''} onChange={e=>navigate(e.target.value)}><option value="">Nieuw WorkMatchr-standaardsjabloon</option>{data.designs.map(d=><option key={d.id} value={d.id}>{d.name} · versie {d.version} · {designStateLabels[d.state as DesignState]}</option>)}</select></label>
 {selected&&<><Button variant="outline" disabled={busy||dirty} onClick={()=>operation(()=>duplicateDesign(selected.id,false))}>Dupliceren</Button><Button variant="outline" disabled={busy||dirty} onClick={()=>operation(()=>duplicateDesign(selected.id,true))}>Nieuwe conceptversie</Button></>}
 </div>
 <p role="status" className="text-sm">{message}{dirty?' Niet-opgeslagen wijzigingen.':''}</p>
 <div className="grid gap-5 xl:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)]">
 <section className="min-w-0 space-y-4 rounded-card border border-border bg-surface p-4" aria-label="Ontwerpinstellingen">
 <fieldset disabled={!editable||busy} className="space-y-3">
 <legend className="font-semibold">Ontwerpinstellingen {selected?'— '+designStateLabels[selected.state as DesignState]:''}</legend>
 <label className="block">Sjabloonnaam<input className={fieldClassName} value={name} maxLength={160} onChange={e=>setName(e.target.value)}/></label>
 <div className="flex flex-wrap gap-3">
 <label>Achtergrond<input aria-label="Achtergrondkleur" type="color" value={design.background} onChange={e=>change({...design,background:e.target.value})}/></label>
 <label>Randkleur<input type="color" value={design.borderColor} onChange={e=>change({...design,borderColor:e.target.value})}/></label>
 <label>Randdikte<input className={fieldClassName} type="number" min={0} max={8} value={design.borderWidth} onChange={e=>change({...design,borderWidth:Number(e.target.value)})}/></label>
 </div>
 <label className="block">Achtergrondafbeelding (maximaal 3 MB)<input type="file" accept="image/png,image/jpeg,image/webp" className={fieldClassName} onChange={e=>void upload(e.target.files?.[0],'background')}/></label>
 {design.backgroundImage&&<Button variant="outline" type="button" onClick={()=>change({...design,backgroundImage:''})}>Achtergrondafbeelding verwijderen</Button>}
 <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={()=>add('text')}>Tekst toevoegen</Button><Button type="button" variant="outline" onClick={()=>add('image')}>Logo / handtekening</Button><Button type="button" variant="outline" onClick={()=>add('decoration')}>Accent toevoegen</Button></div>
 <label className="block">Blok bewerken<select className={fieldClassName} value={chosen} onChange={e=>setChosen(e.target.value)}>{design.elements.map((e,i)=><option key={e.id} value={e.id}>{i+1}. {e.kind==='text'?e.text.slice(0,55):e.kind==='qr'?'QR-code':e.kind==='image'?e.alt:'Decoratief accent'}</option>)}</select></label>
 {block&&<div className="space-y-3 border-t border-border pt-3">
 <p className="text-sm text-text-secondary">Positie en afmetingen in punten (A4 liggend). Alle blokken moeten binnen de marges passen; de voettekst blijft gereserveerd.</p>
 <div className="grid grid-cols-2 gap-3">{([['x','Links'],['y','Boven'],['width','Breedte'],['height','Hoogte']] as const).map(([key,label])=><label key={key}>{label}<input className={fieldClassName} type="number" step="0.5" value={block[key]} onChange={e=>update({[key]:Number(e.target.value)})}/></label>)}</div>
 {block.kind==='text'&&<>
 <label className="block">Tekst<textarea className={fieldClassName} rows={5} value={block.text} onChange={e=>update({text:e.target.value})}/></label>
 <label className="block">Invulveld toevoegen<select className={fieldClassName} value="" onChange={e=>update({text:block.text+' {{'+e.target.value+'}}'})}><option value="" disabled>Kies een invulveld</option>{certificateFields.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
 <div className="grid grid-cols-2 gap-3"><label>Lettertype<select className={fieldClassName} value={block.font} onChange={e=>update({font:e.target.value as typeof block.font})}><option>Helvetica</option><option>Times</option><option>Courier</option></select></label><label>Tekstgrootte<input className={fieldClassName} type="number" min={8} max={60} value={block.fontSize} onChange={e=>update({fontSize:Number(e.target.value)})}/></label><label>Uitlijning<select className={fieldClassName} value={block.align} onChange={e=>update({align:e.target.value as typeof block.align})}><option value="left">Links</option><option value="center">Midden</option><option value="right">Rechts</option></select></label><label>Tekstkleur<input type="color" value={block.color} onChange={e=>update({color:e.target.value})}/></label></div>
 <div className="flex gap-4"><label><input type="checkbox" checked={block.bold} onChange={e=>update({bold:e.target.checked})}/> Vet</label><label><input type="checkbox" checked={block.italic} onChange={e=>update({italic:e.target.checked})}/> Cursief</label></div>
 </>}
 {block.kind==='image'&&<><label className="block">Logo of handtekening uploaden<input className={fieldClassName} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0],'image')}/></label><label className="block">Beschrijving afbeelding<input className={fieldClassName} value={block.alt} onChange={e=>update({alt:e.target.value})}/></label><Button variant="outline" onClick={()=>update({source:'WORKMATCHR_LOGO',alt:'WorkMatchr Learning'})}>WorkMatchr-logo gebruiken</Button></>}
 {block.kind==='decoration'&&<label>Accentkleur<input type="color" value={block.color} onChange={e=>update({color:e.target.value})}/></label>}
 {block.kind!=='qr'&&<Button variant="outline" onClick={()=>{const elements=design.elements.filter(e=>e.id!==chosen);change({...design,elements});setChosen(elements[0]?.id??'')}}>Blok verwijderen</Button>}
 </div>}
 <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!history.length} onClick={()=>{setRedo(r=>[...r,design]);setDesign(history[history.length-1]);setHistory(h=>h.slice(0,-1))}}>Ongedaan maken</Button><Button variant="outline" disabled={!redo.length} onClick={()=>{setHistory(h=>[...h,design]);setDesign(redo[redo.length-1]);setRedo(r=>r.slice(0,-1))}}>Opnieuw uitvoeren</Button></div>
 {!validation.success&&<ul role="alert" className="text-sm text-error">{[...new Set(validation.error.issues.map(i=>i.message))].map(m=><li key={m}>{m}</li>)}</ul>}
 <Button disabled={!validation.success||!name.trim()} onClick={()=>operation(()=>saveDesign({id:selected?.id,revision:selected?.revision??0,name,definition:design}))}>Concept opslaan</Button>
 </fieldset>
 {!editable&&<p>Deze versie staat vast. Kies ‘Nieuwe conceptversie’ om het ontwerp te wijzigen.</p>}
 </section>
 <section className="min-w-0 space-y-3" aria-label="Certificaatvoorbeeld">
 <h2 className="text-xl font-semibold">Livevoorbeeld — geen geldig certificaat</h2>
 <p className="text-sm text-text-secondary">Synthetische voorbeeldgegevens. Het voorbeeld gebruikt exact dezelfde PDF-weergave als de download. Tekst verkleint zo nodig binnen het gekozen blok; onleesbare of overlappende inhoud wordt geweigerd.</p>
 {previewBusy&&<p role="status">Voorbeeld wordt bijgewerkt…</p>}{previewError&&<p role="alert">{previewError}</p>}
 {pdf&&<><Image unoptimized src={image} width={1263} height={893} alt="Certificaatvoorbeeld met synthetische gegevens; geen geldig certificaat" className="h-auto w-full rounded-card border border-border bg-white"/><a href={pdf} download="Voorbeeld-certificaat.pdf" className="inline-flex min-h-11 items-center rounded-control px-3 underline focus-visible:outline-2">Voorbeeld-PDF downloaden</a></>}
 </section>
 </div>
 {selected&&<section className="space-y-3 rounded-card border border-border p-4"><h2 className="text-xl font-semibold">Review en publicatie</h2><p>Controleer tekst, afbeeldingen, lange namen en afdrukbaarheid. Activering van een nieuwe versie vervangt de vorige versie voor toekomstige uitgiften op bestaande koppelingen. Bestaande certificaten blijven gelijk.</p><label className="block">Onderbouwing<textarea className={fieldClassName} value={reason} minLength={10} maxLength={500} onChange={e=>setReason(e.target.value)}/></label><div className="flex flex-wrap gap-2">{(['DRAFT','REVIEW','APPROVED','ACTIVE','ARCHIVED'] as const).filter(s=>canTransitionDesign(selected.state as DesignState,s)).map(s=><Button key={s} variant="outline" disabled={busy||dirty||reason.trim().length<10} onClick={()=>operation(()=>changeDesignState(selected.id,selected.revision,s,reason))}>Naar {designStateLabels[s]}</Button>)}</div></section>}
 <section className="space-y-3 rounded-card border border-border p-4"><h2 className="text-xl font-semibold">Sjabloon per e-learning</h2><p>Zonder eigen koppeling gebruikt een cursus de globale standaard. Tot een ontworpen standaard expliciet is geactiveerd en gekoppeld, blijft de bestaande certificaatweergave gelden.</p>{[{id:'GLOBAL',code:'Standaard',title:'Alle e-learnings'},...data.courses].map(c=><label key={c.id} className="block">{c.code} — {c.title}<select className={fieldClassName} disabled={busy||dirty} value={data.bindings.find(b=>b.scope===c.id)?.designId??''} onChange={e=>operation(()=>selectDesign(c.id,e.target.value||null))}><option value="">{c.id==='GLOBAL'?'Bestaande certificaatweergave':'Gebruik globale standaard'}</option>{data.designs.filter(d=>d.state==='ACTIVE').map(d=><option key={d.id} value={d.id}>{d.name} · versie {d.version}</option>)}</select></label>)}</section>
 </div>
}
