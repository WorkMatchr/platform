import type { Prisma } from "@/generated/prisma/client";

import { IntakeServiceError } from "@/lib/intakes/intake-errors";
import {
  canArchiveIntake,
  canCreateIntake,
  canEditIntake,
  canMarkIntakeReadyForReview,
  canReopenIntake,
  canViewIntake,
} from "@/lib/intakes/intake-policy";
import type {
  IntakeActorContext,
  IntakePolicyContext,
} from "@/lib/intakes/intake-types";

type TransactionClient = Prisma.TransactionClient;

const accessDenied = () =>
  new IntakeServiceError(
    "ACCESS_DENIED",
    "U heeft geen toegang tot deze intake.",
  );

const buildActor = (
  userId: string,
  membership: {
    role: IntakeActorContext["membershipRole"];
    status: IntakeActorContext["membershipStatus"];
    user: { status: IntakeActorContext["userStatus"] };
  },
  organization: {
    status: IntakeActorContext["organizationStatus"];
    organizationType: IntakeActorContext["organizationType"];
  },
): IntakeActorContext => ({
  userId,
  userStatus: membership.user.status,
  membershipRole: membership.role,
  membershipStatus: membership.status,
  organizationStatus: organization.status,
  organizationType: organization.organizationType,
});

export const requireIntakeCreator = async (
  transaction: TransactionClient,
  userId: string,
  organizationId: string,
) => {
  const organization = await transaction.organization.findFirst({
    where: {
      id: organizationId,
      memberships: {
        some: { userId },
      },
    },
    select: {
      id: true,
      status: true,
      organizationType: true,
      memberships: {
        where: { userId },
        select: {
          role: true,
          status: true,
          user: { select: { status: true } },
        },
        take: 1,
      },
    },
  });

  const membership = organization?.memberships[0];

  if (
    !organization ||
    !membership ||
    !canCreateIntake(buildActor(userId, membership, organization))
  ) {
    throw accessDenied();
  }

  return { organizationId: organization.id };
};

const intakeAccessSelect = {
  id: true,
  clientOrganizationId: true,
  createdByUserId: true,
  questionnaireVersionId: true,
  status: true,
  version: true,
  archivedAt: true,
  clientOrganization: {
    select: {
      status: true,
      organizationType: true,
      memberships: {
        select: {
          userId: true,
          role: true,
          status: true,
          user: { select: { status: true } },
        },
      },
    },
  },
} satisfies Prisma.IntakeSelect;

type IntakeAccessRecord = Prisma.IntakeGetPayload<{
  select: typeof intakeAccessSelect;
}>;

const requireIntakeAccess = async (
  transaction: TransactionClient,
  userId: string,
  intakeId: string,
  policy: (context: IntakePolicyContext) => boolean,
): Promise<IntakeAccessRecord> => {
  const intake = await transaction.intake.findFirst({
    where: {
      id: intakeId,
      clientOrganization: {
        memberships: {
          some: { userId },
        },
      },
    },
    select: {
      ...intakeAccessSelect,
      clientOrganization: {
        select: {
          ...intakeAccessSelect.clientOrganization.select,
          memberships: {
            where: { userId },
            select:
              intakeAccessSelect.clientOrganization.select.memberships.select,
            take: 1,
          },
        },
      },
    },
  });

  const membership = intake?.clientOrganization.memberships[0];

  if (!intake || !membership) {
    throw accessDenied();
  }

  const context: IntakePolicyContext = {
    ...buildActor(userId, membership, intake.clientOrganization),
    createdByUserId: intake.createdByUserId,
    intakeStatus: intake.status,
  };

  if (!policy(context)) {
    throw accessDenied();
  }

  return intake;
};

export const requireIntakeViewer = (
  transaction: TransactionClient,
  userId: string,
  intakeId: string,
) => requireIntakeAccess(transaction, userId, intakeId, canViewIntake);

export const requireIntakeEditor = (
  transaction: TransactionClient,
  userId: string,
  intakeId: string,
) => requireIntakeAccess(transaction, userId, intakeId, canEditIntake);

export const requireIntakeReviewer = (
  transaction: TransactionClient,
  userId: string,
  intakeId: string,
) => requireIntakeAccess(transaction, userId, intakeId, canMarkIntakeReadyForReview);

export const requireIntakeReopener = (
  transaction: TransactionClient,
  userId: string,
  intakeId: string,
) => requireIntakeAccess(transaction, userId, intakeId, canReopenIntake);

export const requireIntakeArchiver = (
  transaction: TransactionClient,
  userId: string,
  intakeId: string,
) => requireIntakeAccess(transaction, userId, intakeId, canArchiveIntake);
