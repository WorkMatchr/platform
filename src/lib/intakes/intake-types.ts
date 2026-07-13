import type {
  IntakeQuestionCategory,
  IntakeStatus,
  MembershipStatus,
  OrganizationMembershipRole,
  OrganizationStatus,
  OrganizationType,
  UserStatus,
} from '@/generated/prisma/client'

export type IntakeActorContext = {
  userId: string
  userStatus: UserStatus
  membershipStatus: MembershipStatus
  membershipRole: OrganizationMembershipRole
  organizationStatus: OrganizationStatus
  organizationType: OrganizationType
}

export type IntakePolicyContext = IntakeActorContext & {
  createdByUserId: string
  intakeStatus: IntakeStatus
}

export type IntakeAnswerInput = {
  questionId: string
  value: unknown
}

export type CreateIntakeInput = {
  freeText: string
}

export type SaveIntakeStepInput = {
  expectedIntakeVersion: number
  category: IntakeQuestionCategory
  answers: IntakeAnswerInput[]
}

export type IntakeVersionInput = {
  expectedIntakeVersion: number
}

export type NormalizedIntakeAnswer = {
  textValue: string | null
  numberValue: string | null
  booleanValue: boolean | null
  dateValue: Date | null
  organizationLocationId: string | null
  optionIds: string[]
  isEmpty: boolean
}

export type IntakeProgress = {
  isComplete: boolean
  missingQuestionKeys: string[]
  nextIncompleteCategory: IntakeQuestionCategory | null
  answeredQuestionCount: number
  totalQuestionCount: number
}
