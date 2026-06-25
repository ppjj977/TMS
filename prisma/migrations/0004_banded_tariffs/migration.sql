-- CreateEnum
CREATE TYPE "RateBandType" AS ENUM ('DISTANCE', 'DROP', 'PIECE');

-- AlterTable
ALTER TABLE "RateCard" ADD COLUMN     "retailPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "waitingPerHour" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RateBand" (
    "id" TEXT NOT NULL,
    "rateCardId" TEXT NOT NULL,
    "type" "RateBandType" NOT NULL,
    "minValue" DOUBLE PRECISION NOT NULL,
    "maxValue" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RateBand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateBand_rateCardId_idx" ON "RateBand"("rateCardId");

-- AddForeignKey
ALTER TABLE "RateBand" ADD CONSTRAINT "RateBand_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

