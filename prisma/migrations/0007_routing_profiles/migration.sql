-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "deadlineRisk" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "VehicleTypeProfile" (
    "type" "VehicleType" NOT NULL,
    "urbanSpeedMph" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "motorwaySpeedMph" DOUBLE PRECISION NOT NULL DEFAULT 55,
    "dwellMin" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "VehicleTypeProfile_pkey" PRIMARY KEY ("type")
);

