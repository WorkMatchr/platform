import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import type { Metadata } from 'next'
import { listCertificateDesigns } from '@/lib/learning/certificate-design-service'
import { CertificateDesigner } from '@/components/learning/certificate-designer'
export const metadata:Metadata={title:'Academy — Certificaatsjablonen',robots:{index:false,follow:false}}
export const dynamic='force-dynamic'
export default async function CertificateDesignPage({searchParams}:{searchParams:Promise<{id?:string}>}){
 await requirePlatformOperator('/platformbeheer/academy/certificaten/sjablonen')
 const data=await listCertificateDesigns()
 const {id}=await searchParams
 const selected=data.designs.find(d=>d.id===id)
 return <CertificateDesigner key={selected?.id+':'+selected?.revision} data={data} selected={selected}/>
}
