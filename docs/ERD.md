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
  Assignment ||--o{ AssignmentSpecialism : requires
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
    uuid clientOrganizationId FK
    AssignmentStatus status
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
