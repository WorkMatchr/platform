-- Additive security-delivery audit values. Existing records and mail flows are unchanged.
ALTER TYPE "AccountProvisioningEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_RESET_NOTIFICATION_SENT';
ALTER TYPE "AccountProvisioningEventType" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_RESET_NOTIFICATION_FAILED';
