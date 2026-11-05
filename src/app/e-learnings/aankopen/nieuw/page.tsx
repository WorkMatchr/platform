import { randomUUID } from 'node:crypto'
import { notFound } from 'next/navigation'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { assertAcademyCommerceSandbox } from '@/lib/learning/academy-commerce-environment'
import { readAcademyPrices } from '@/lib/learning/academy-pricing-store'
import { getPrisma } from '@/lib/prisma'
import { AcademyOrderForm } from '@/components/learning/academy-commerce-forms'
export const metadata={title:'Academy-testbestelling | WorkMatchr',robots:{index:false,follow:false}}
export default async function Page(){const user=await requireLearningUser('/e-learnings/aankopen/nieuw');try{assertAcademyCommerceSandbox()}catch{notFound()};const db=getPrisma();const courses=await db.learningCourse.findMany({where:{code:{startsWith:'WL-'},status:'PUBLISHED',versions:{some:{status:'PUBLISHED'}}},select:{id:true,code:true,title:true}});const pricedCourses=await Promise.all(courses.map(async c=>{const p=await readAcademyPrices(db,c.id);return {code:c.code,title:c.title,individualCents:p.individualCents,fiveCents:p.fiveCents}}));const member=await db.organizationMembership.findFirst({where:{userId:user.id,status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{status:'ACTIVE',systemKey:null}},select:{organizationId:true}});return <main className="mx-auto max-w-3xl space-y-5 px-4 py-10"><h1 className="text-3xl font-bold">Academy-testbestelling</h1><p>Uitsluitend de geïsoleerde testomgeving. Geen echte betaling of definitieve juridische publicatie.</p>{courses.length?<AcademyOrderForm courses={pricedCourses} organizationId={member?.organizationId} requestId={randomUUID()}/>:<p>Er is nog geen opleiding beschikbaar voor aankoop.</p>}</main>}
