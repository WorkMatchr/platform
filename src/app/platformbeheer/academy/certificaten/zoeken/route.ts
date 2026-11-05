import { NextResponse } from 'next/server'
import { AcademyCertificateAdminError, listAcademyCertificates } from '@/lib/learning/academy-certificate-admin-service'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex, nofollow, noarchive' }
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 4096) return NextResponse.json({error:'Ongeldige filters.'},{status:400,headers})
    const data = await listAcademyCertificates(await request.json())
    return NextResponse.json(data,{headers})
  } catch (error) {
    return NextResponse.json({error:'Certificaten niet beschikbaar.'},{status:error instanceof AcademyCertificateAdminError ? error.status : error instanceof SyntaxError ? 400 : 500,headers})
  }
}
