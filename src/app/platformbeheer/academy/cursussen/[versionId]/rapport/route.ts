import { readCourseReport } from '@/lib/learning/academy-course-results'

export async function GET(_:Request,{params}:{params:Promise<{versionId:string}>}) {
  const {versionId}=await params
  const rows=await readCourseReport(versionId)
  const csv=[['Kengetal','Waarde'],...rows].map(row=>row.join(';')).join('\r\n')
  return new Response('\uFEFF'+csv,{headers:{
    'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="cursusrapport.csv"',
    'Cache-Control':'private, no-store',
  }})
}
