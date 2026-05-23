-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "status" "ProblemStatus" NOT NULL DEFAULT 'DRAFT';
