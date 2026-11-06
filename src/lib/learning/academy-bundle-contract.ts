import type { AcademyCourseBundle } from './academy-content-standard'
export function isAcademyBundle(value: unknown): value is AcademyCourseBundle {
 return Boolean(value && typeof value === 'object' && 'formatVersion' in value)
}
