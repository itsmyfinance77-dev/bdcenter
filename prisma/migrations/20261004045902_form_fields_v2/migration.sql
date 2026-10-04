-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FormFieldType" ADD VALUE 'RADIO';
ALTER TYPE "FormFieldType" ADD VALUE 'MULTI_CHOICE';
ALTER TYPE "FormFieldType" ADD VALUE 'JALALI_DATE';
ALTER TYPE "FormFieldType" ADD VALUE 'TIME';
ALTER TYPE "FormFieldType" ADD VALUE 'NATIONAL_CODE';
ALTER TYPE "FormFieldType" ADD VALUE 'LEGAL_ID';
ALTER TYPE "FormFieldType" ADD VALUE 'POSTAL_CODE';
ALTER TYPE "FormFieldType" ADD VALUE 'MOBILE';
ALTER TYPE "FormFieldType" ADD VALUE 'RATING';
ALTER TYPE "FormFieldType" ADD VALUE 'SECTION';

-- AlterTable
ALTER TABLE "form_definitions" ADD COLUMN     "descriptionHtml" TEXT;

-- AlterTable
ALTER TABLE "form_fields" ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "fields" JSONB;
