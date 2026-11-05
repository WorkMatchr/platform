import { notFound } from 'next/navigation'
import { isLearningRuntimeEnabled } from '@/lib/learning/learning-runtime-policy'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'

export default async function AcademyAdminLayout({ children }: { children: React.ReactNode }) {
  if (!isLearningRuntimeEnabled()) notFound()
  await requirePlatformOperator('/platformbeheer/academy/cursussen')
  return children
}
