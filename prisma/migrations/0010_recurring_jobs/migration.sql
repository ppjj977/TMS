-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "recurringJobId" TEXT;

-- CreateTable
CREATE TABLE "RecurringJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "serviceLevel" "ServiceLevel" NOT NULL DEFAULT 'SAMEDAY_STANDARD',
    "pieces" INTEGER NOT NULL DEFAULT 1,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startHour" INTEGER NOT NULL DEFAULT 9,
    "startMinute" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "mon" BOOLEAN NOT NULL DEFAULT false,
    "tue" BOOLEAN NOT NULL DEFAULT false,
    "wed" BOOLEAN NOT NULL DEFAULT false,
    "thu" BOOLEAN NOT NULL DEFAULT false,
    "fri" BOOLEAN NOT NULL DEFAULT false,
    "sat" BOOLEAN NOT NULL DEFAULT false,
    "sun" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringStop" (
    "id" TEXT NOT NULL,
    "recurringJobId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "StopType" NOT NULL,
    "name" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "RecurringStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringJob_customerId_idx" ON "RecurringJob"("customerId");

-- CreateIndex
CREATE INDEX "RecurringStop_recurringJobId_idx" ON "RecurringStop"("recurringJobId");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_recurringJobId_fkey" FOREIGN KEY ("recurringJobId") REFERENCES "RecurringJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringJob" ADD CONSTRAINT "RecurringJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringStop" ADD CONSTRAINT "RecurringStop_recurringJobId_fkey" FOREIGN KEY ("recurringJobId") REFERENCES "RecurringJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

