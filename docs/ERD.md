# ERD WorkMatchr

De ERD is per domein gesplitst voor leesbaarheid. Velden zijn beperkt tot primaire en relationele sleutels plus bepalende statussen.

## Identity en organisaties

```mermaid
erDiagram
  User ||--o{ OrganizationMembership : has
  User ||--o{ Session : authenticates_with
  User ||--o{ Account : owns
  Organization ||--o{ OrganizationMembership : has
  Organization ||--o{ OrganizationLocation : owns
  Organization ||--o{ OrganizationSector : classified_as
  Sector ||--o{ OrganizationSector : classifies
  User {
    uuid id PK
    string email UK
    PlatformRole platformRole
    UserStatus status
    boolean emailVerified
  }
  Session {
    uuid id PK
    uuid userId FK
    string token UK
    datetime expiresAt
  }
  Account {
    uuid id PK
    uuid userId FK
    string providerId
    string accountId
  }
  Verification {
    uuid id PK
    string identifier
    datetime expiresAt
  }
  RateLimit {
    uuid id PK
    string key UK
    int count
  }
  Organization {
    uuid id PK
    OrganizationType organizationType
    OrganizationStatus status
    string logoStorageKey UK
    string logoMimeType
    int logoSizeBytes
  }
  OrganizationMembership {
    uuid id PK
    uuid userId FK
    uuid organizationId FK
    MembershipStatus status
  }
  OrganizationLocation {
    uuid id PK
    uuid organizationId FK
    string countryCode
    boolean isPrimary
  }
  Sector {
    uuid id PK
    string slug UK
    boolean isActive
  }
  OrganizationSector {
    uuid id PK
    uuid organizationId FK
    uuid sectorId FK
  }
```

## Aanbieders en expertise

```mermaid
erDiagram
  Organization ||--o| ProviderProfile : has
  ProviderProfile ||--o{ ProviderSpecialism : offers
  Specialism ||--o{ ProviderSpecialism : classifies
  Specialism ||--o{ Specialism : parent_of
  ProviderProfile ||--o{ ProviderSector : experienced_in
  Sector ||--o{ ProviderSector : classifies
  ProviderProfile ||--o{ ProviderCertification : holds
  Certification ||--o{ ProviderCertification : types
  User ||--o{ ProviderCertification : verifies
  ProviderProfile {
    uuid id PK
    uuid organizationId FK
    ProviderApprovalStatus approvalStatus
    boolean isAvailable
  }
  Specialism {
    uuid id PK
    uuid parentId FK
    string slug UK
  }
  Certification {
    uuid id PK
    string slug UK
  }
```

## Providerkwalificatie Module 6A.2

```mermaid
erDiagram
  Organization ||--o| ProviderProfile : has
  ProviderProfile ||--o{ ProviderCapability : owns
  ProviderCapability ||--o{ ProviderCapabilityRevision : versions
  ProviderProfile ||--o{ ProviderSectorExperience : owns
  ProviderProfile ||--o{ ProviderWorkArea : owns
  ProviderProfile ||--o{ ProviderCapacitySnapshot : confirms
  ProviderProfile ||--o{ ProviderProfessional : engages
  ProviderProfessional ||--o| ProviderProfessionalPrivateData : isolates
  ProviderProfessional ||--o{ ProviderProfessionalQualification : holds
  ProviderProfile ||--o{ ProviderInsurance : holds
  ProviderProfile ||--o{ ProviderEvidenceDocument : owns
  ProviderEvidenceDocument ||--o{ ProviderEvidenceRevision : versions
  ProviderEvidenceRevision ||--o| ProviderEvidenceScanDecision : scans
  ProviderTaxonomy ||--o{ ProviderTaxonomyVersion : versions
  ProviderTaxonomyVersion ||--o{ ProviderTaxonomyTerm : contains
  ProviderProfile ||--o{ ProviderVerificationReview : reviews
  ProviderProfile ||--o{ ProviderQualificationDecision : qualifies
  ProviderProfile ||--o{ ProviderReadinessAssessment : assesses
  ProviderProfile ||--o{ ProviderSelectabilityAssessment : assesses
  ProviderProfile ||--o{ ProviderBlock : blocks
  ProviderBlock ||--o| ProviderBlockRelease : releases
  ProviderProfile ||--o{ TrustedProviderProjection : projects
  TrustedProviderProjection ||--o| TrustedProviderProjectionInvalidation : invalidates
  User ||--o{ ProviderPlatformPermissionGrant : receives
```

Alle roots blijven aan één `ProviderProfile` gekoppeld. Revisions, reviews, besluiten, assessments, blokkades en projecties zijn append-only. `ProviderProfessionalPrivateData` en `ProviderEvidenceRevision` vallen bewust buiten de Trusted Provider Projection.

## Intake en opdrachten

```mermaid
erDiagram
  Organization ||--o{ Intake : submits
  User ||--o{ Intake : creates
  IntakeQuestionnaire ||--o{ IntakeQuestionnaireVersion : versions
  IntakeQuestionnaireVersion ||--o{ IntakeQuestion : contains
  IntakeQuestion ||--o{ IntakeQuestionOption : offers
  IntakeQuestionnaireVersion ||--o{ Intake : defines
  Intake ||--o{ IntakeAnswer : contains
  IntakeQuestion ||--o{ IntakeAnswer : answers
  IntakeAnswer ||--o{ IntakeAnswerOption : selects
  IntakeQuestionOption ||--o{ IntakeAnswerOption : selected_as
  IntakeAnswer ||--o{ IntakeAnswerRevision : revises
  IntakeAnswerRevision ||--o{ IntakeAnswerRevisionOption : snapshots
  IntakeQuestionOption ||--o{ IntakeAnswerRevisionOption : snapshotted_as
  Intake ||--o{ IntakeStatusHistory : transitions
  Intake ||--o| Assignment : converts_to
  Organization ||--o{ Assignment : commissions
  User ||--o{ Assignment : creates
  User ||--o{ Assignment : publishes
  Assignment ||--o{ AssignmentSpecialism : requires
  Assignment ||--o{ AssignmentStatusHistory : transitions
  Assignment ||--o{ AssignmentRevision : revises
  Assignment ||--o| AssignmentRevision : published_as
  Specialism ||--o{ AssignmentSpecialism : requested_as
  Assignment ||--o{ AssignmentProviderSelection : selects
  ProviderProfile ||--o{ AssignmentProviderSelection : selected_for
  Assignment ||--o| AssignmentResolution : resolves_with
  ProviderProfile ||--o{ AssignmentResolution : awarded_to
  IntakeQuestionnaire {
    uuid id PK
    string slug UK
    boolean isActive
  }
  IntakeQuestionnaireVersion {
    uuid id PK
    uuid questionnaireId FK
    int version
    IntakeQuestionnaireVersionStatus status
  }
  IntakeQuestion {
    uuid id PK
    uuid questionnaireVersionId FK
    string key
    IntakeQuestionInputType inputType
  }
  Intake {
    uuid id PK
    uuid questionnaireVersionId FK
    uuid clientOrganizationId FK
    uuid createdByUserId FK
    int version
    uuid submittedByUserId FK
    datetime convertedAt
  }
  IntakeAnswer {
    uuid id PK
    uuid intakeId FK
    uuid questionId FK
    int version
  }
  IntakeAnswerRevision {
    uuid id PK
    uuid intakeAnswerId FK
    int version
  }
  Assignment {
    uuid id PK
    uuid intakeId FK,UK
    uuid clientOrganizationId FK
    AssignmentStatus status
    int version
    uuid publishedByUserId FK
    int publishedVersion FK
    datetime publishedAt
  }
  AssignmentStatusHistory {
    uuid id PK
    uuid assignmentId FK
    AssignmentStatus toStatus
    uuid changedByUserId FK
  }
  AssignmentRevision {
    uuid id PK
    uuid assignmentId FK
    int version
    uuid changedByUserId FK
  }
  AssignmentProviderSelection {
    uuid id PK
    uuid assignmentId FK
    uuid providerProfileId FK
    ProviderSelectionSource source
    ProviderSelectionStatus status
  }
  AssignmentResolution {
    uuid id PK
    uuid assignmentId FK,UK
    AssignmentResolutionType type
  }
```

## Credits en audit

```mermaid
erDiagram
  Organization ||--o| CreditAccount : owns
  CreditAccount ||--o{ CreditTransaction : records
  User ||--o{ CreditTransaction : initiates
  User ||--o{ AdminActionLog : performs
  CreditAccount {
    uuid id PK
    uuid organizationId FK,UK
    int balance
  }
  CreditTransaction {
    uuid id PK
    uuid creditAccountId FK
    CreditTransactionType type
    int amount
    int balanceAfter
  }
  AdminActionLog {
    uuid id PK
    uuid actorUserId FK
    string action
    uuid entityId
  }
```
