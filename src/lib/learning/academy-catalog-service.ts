import 'server-only'
import { isAcademyBundle } from './academy-bundle-contract'
import { getPrisma } from '@/lib/prisma'
import { readAcademyPrices } from './academy-pricing-store'
import { authoringMetadata } from './academy-authoring-service'
import { currentAcademyAccess } from './academy-access-policy'
/** Public course facts only: no questions, answer keys or learner records. */
export async function availableAcademyCourses(userId:string) {
  const db=getPrisma()
  const courses=await db.learningCourse.findMany({where:{status:'PUBLISHED',versions:{some:{status:'PUBLISHED'}}},orderBy:{title:'asc'},select:{id:true,code:true,slug:true,title:true,description:true,versions:{where:{status:'PUBLISHED'},orderBy:{publishedAt:'desc'},take:1,select:{version:true,sourceMetadata:true,chapters:{select:{estimatedMinutes:true}},enrollments:{where:{userId,...currentAcademyAccess()},select:{id:true},take:1}}}}})
  return Promise.all(courses.map(async course=>{
    const version=course.versions[0];const price=await readAcademyPrices(db,course.id)
    let details:{category:string;level:string;image:string}|null=null
    if(version.sourceMetadata && typeof version.sourceMetadata==='object' && 'authoring' in version.sourceMetadata){const content=authoringMetadata(version.sourceMetadata).authoring.content;details=isAcademyBundle(content)?{category:content.definition.subtitle,level:'',image:''}:{category:content.category,level:content.level,image:content.image}}
    return {id:course.id,code:course.code,slug:course.slug,title:course.title,description:course.description,version:version.version,minutes:version.chapters.reduce((sum,c)=>sum+c.estimatedMinutes,0),chapters:version.chapters.length,enrolled:version.enrollments.length>0,priceCents:price.individualCents,details}
  }))
}
