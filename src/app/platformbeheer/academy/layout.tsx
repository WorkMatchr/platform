import { notFound } from 'next/navigation'
import { isLearningRuntimeEnabled } from '@/lib/learning/learning-runtime-policy'
export default function AcademyAdminLayout({children}:{children:React.ReactNode}){if(!isLearningRuntimeEnabled())notFound();return children}
