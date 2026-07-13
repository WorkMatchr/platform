import type { IntakeActorContext, IntakePolicyContext } from './intake-types'

const MANAGER_ROLES = ['OWNER', 'ADMIN'] as const
const EDITABLE_STATUSES = ['DRAFT', 'IN_PROGRESS'] as const

function hasActiveClientContext(context: IntakeActorContext): boolean {
  return (
    context.userStatus === 'ACTIVE' &&
    context.membershipStatus === 'ACTIVE' &&
    context.organizationStatus === 'ACTIVE' &&
    (context.organizationType === 'CLIENT' || context.organizationType === 'BOTH')
  )
}

function managesOrganization(context: IntakeActorContext): boolean {
  return MANAGER_ROLES.includes(context.membershipRole as (typeof MANAGER_ROLES)[number])
}

function ownsIntake(context: IntakePolicyContext): boolean {
  return context.userId === context.createdByUserId
}

export function canCreateIntake(context: IntakeActorContext): boolean {
  return hasActiveClientContext(context)
}

export function canViewIntake(context: IntakePolicyContext): boolean {
  return hasActiveClientContext(context) && (managesOrganization(context) || ownsIntake(context))
}

export function canEditIntake(context: IntakePolicyContext): boolean {
  return (
    canViewIntake(context) &&
    EDITABLE_STATUSES.includes(context.intakeStatus as (typeof EDITABLE_STATUSES)[number])
  )
}

export function canMarkIntakeReadyForReview(context: IntakePolicyContext): boolean {
  return canEditIntake(context)
}

export function canReopenIntake(context: IntakePolicyContext): boolean {
  return canViewIntake(context) && context.intakeStatus === 'READY_FOR_REVIEW'
}

export function canArchiveIntake(context: IntakePolicyContext): boolean {
  return canEditIntake(context)
}
