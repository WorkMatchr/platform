import 'server-only'
import type { Prisma } from '@/generated/prisma/client'
import { designSchema } from './certificate-design-contract'
import { certificateDesignChecksum } from './certificate-design-pdf'

// Issue inside the existing certificate transaction without loading administrator auth.
export async function certificateDesignForIssue(tx:Prisma.TransactionClient,courseId:string,courseCode:string,requireCourseBinding=false){
 await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('certificate-design-publication',0))::text`
 const binding=await tx.learningCertificateDesignBinding.findUnique({where:{scope:courseId},include:{design:true}})
   ?? (requireCourseBinding ? null : await tx.learningCertificateDesignBinding.findUnique({where:{scope:'GLOBAL'},include:{design:true}}))
 if(!binding)return null // Existing reviewed renderer remains the compatibility default until explicit activation.
 const d=binding.design
 if(d.state!=='ACTIVE'||d.reviewedChecksum!==d.checksum||certificateDesignChecksum(d.definition)!==d.checksum)throw Error('CERTIFICATE_DESIGN_NOT_APPROVED')
 return {designId:d.id,checksum:d.checksum,courseCode,definition:designSchema.parse(d.definition)}
}
