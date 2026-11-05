import { NextResponse } from 'next/server'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { downloadAcademyCorrection } from '@/lib/learning/academy-review-service'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export async function GET(_request:Request,{params}:{params:Promise<{revisionId:string}>}){
 const user=await requireLearningUser('/e-learnings/beoordeling');const {revisionId}=await params
 try { const pdf=await downloadAcademyCorrection(user.id,revisionId);return new NextResponse(Buffer.from(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="Certificaat-correctie.pdf"','Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}}) }
 catch {return NextResponse.json({error:'Niet gevonden.'},{status:404})}
}
