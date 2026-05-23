-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "constraints" TEXT,
ADD COLUMN     "inputFormat" TEXT,
ADD COLUMN     "outputFormat" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "memory" INTEGER,
ADD COLUMN     "runtime" INTEGER;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "explanation" TEXT;
