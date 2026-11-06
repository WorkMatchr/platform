import { certificatePreviewPng } from '@/lib/learning/certificate-design-preview'
import { requireAuthor } from '@/lib/learning/academy-authoring-service'
import { demoCertificateValues, designSchema } from '@/lib/learning/certificate-design-contract'
import { renderCertificateDesign } from '@/lib/learning/certificate-design-pdf'
export async function POST(request:Request) {
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}
 const trusted=process.env.NEXT_PUBLIC_APP_URL
 if(!trusted || request.headers.get('origin')!==new URL(trusted).origin)return Response.json({error:'Voorbeeld niet toegestaan.'},{status:403,headers})
 try{
  await requireAuthor()
  // Limit actual streamed bytes as well as the declared size.
  const reader=request.body?.getReader();if(!reader)throw Error('EMPTY')
  const parts:Uint8Array[]=[];let size=0
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>100_000){await reader.cancel();return Response.json({error:'Ontwerp is te groot.'},{status:413,headers})}parts.push(value)}
  const design=designSchema.parse(JSON.parse(Buffer.concat(parts).toString('utf8')))
  const bytes=await renderCertificateDesign(design,demoCertificateValues,true)
  return Response.json({pdf:Buffer.from(bytes).toString('base64'),image:(await certificatePreviewPng(bytes)).toString('base64')},{headers})
 }catch{return Response.json({error:'Voorbeeld niet beschikbaar. Controleer uw rechten, de invulvelden, afdrukruimte, lettertekens en afbeeldingen.'},{status:400,headers})}
}
