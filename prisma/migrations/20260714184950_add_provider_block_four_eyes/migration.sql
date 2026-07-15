/*
  Warnings:

  - Added the required column `reviewedByUserId` to the `ProviderBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewedByUserId` to the `ProviderBlockRelease` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProviderBlock" ADD COLUMN     "reviewedByUserId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ProviderBlockRelease" ADD COLUMN     "reviewedByUserId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "ProviderBlock" ADD CONSTRAINT "ProviderBlock_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderBlockRelease" ADD CONSTRAINT "ProviderBlockRelease_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProviderBlock"
  ADD CONSTRAINT "ProviderBlock_four_eyes_check" CHECK ("reviewedByUserId" <> "blockedByUserId");

ALTER TABLE "ProviderBlockRelease"
  ADD CONSTRAINT "ProviderBlockRelease_four_eyes_check" CHECK ("reviewedByUserId" <> "releasedByUserId");
