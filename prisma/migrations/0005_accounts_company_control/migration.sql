-- CreateEnum
CREATE TYPE "InvoiceSchedule" AS ENUM ('ON_COMPLETION', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PREPAY', 'CREDIT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'CREDIT',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "invoiceSchedule" "InvoiceSchedule" NOT NULL DEFAULT 'ON_COMPLETION',
ADD COLUMN     "slaGroup" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "vat" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanySetting" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Your Company Ltd',
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "vatNumber" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "companyReg" TEXT,
    "bankName" TEXT,
    "sortCode" TEXT,
    "accountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficScreen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "statuses" "JobStatus"[],
    "serviceLevels" "ServiceLevel"[],
    "vehicleType" "VehicleType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficScreen_pkey" PRIMARY KEY ("id")
);

