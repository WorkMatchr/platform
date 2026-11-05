import { NextResponse } from 'next/server'
import { AcademyCertificateAdminError, downloadAcademyCertificate } from '@/lib/learning/academy-certificate-admin-service'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const headers = { 'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex, nofollow, noarchive', 'X-Content-Type-Options':'nosniff' }
export async function GET(_request: Request, {params}: {params: Promise<{certificateId:string}>}) {
  try {
    const {certificateId} = await params
    const data = await downloadAcademyCertificate(certificateId)
    return new NextResponse(Buffer.from(data.pdf),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="' + data.filename + '"'}})
  } catch (error) {
    return NextResponse.json({error:'Certificaat niet beschikbaar.'},{status:error instanceof AcademyCertificateAdminError ? error.status : 500,headers})
  }
}
