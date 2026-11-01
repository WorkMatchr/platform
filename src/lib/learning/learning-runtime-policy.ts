import { isPreviewInfrastructureAccepted } from '@/lib/maintenance/preview-isolation'

// Server-owned release gate. Missing or malformed configuration is disabled.
export function isLearningRuntimeEnabled() {
  return isPreviewInfrastructureAccepted() && process.env.LEARNING_RUNTIME_ENABLED === 'true'
}
