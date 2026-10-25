// Server-owned release gate. Missing or malformed configuration is disabled.
export function isLearningRuntimeEnabled() {
  return process.env.LEARNING_RUNTIME_ENABLED === 'true'
}
