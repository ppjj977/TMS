-- CreateEnum
CREATE TYPE "SupplementType" AS ENUM ('OUT_OF_HOURS', 'POSTCODE', 'MANUAL');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "baseCharge" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FixedPrice" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "vehicleType" "VehicleType",
    "fromOutcode" TEXT NOT NULL,
    "toOutcode" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FixedPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSupplement" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "auto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "JobSupplement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoSupplementRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplementType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "oohStartHour" INTEGER,
    "oohEndHour" INTEGER,
    "appliesWeekend" BOOLEAN NOT NULL DEFAULT false,
    "outcodes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoSupplementRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedPrice_customerId_idx" ON "FixedPrice"("customerId");

-- CreateIndex
CREATE INDEX "FixedPrice_fromOutcode_toOutcode_idx" ON "FixedPrice"("fromOutcode", "toOutcode");

-- CreateIndex
CREATE INDEX "JobSupplement_jobId_idx" ON "JobSupplement"("jobId");

-- AddForeignKey
ALTER TABLE "FixedPrice" ADD CONSTRAINT "FixedPrice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSupplement" ADD CONSTRAINT "JobSupplement_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

