import { PrismaClient, StopType } from "@prisma/client";
import { classifyDay, classifyTimeBand, priceJob } from "../src/lib/pricing";
import { nextJobReference } from "../src/lib/reference";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  // Safety guard: never wipe a database that already has data unless explicitly
  // forced. This makes it safe to run the seed on every deploy — it only
  // populates an empty database, and is a no-op once real data exists.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== "true") {
    console.log(
      `Seed skipped: ${existingUsers} user(s) already exist. ` +
        `Set FORCE_SEED=true to wipe and reseed demo data.`,
    );
    return;
  }

  console.log("Seeding TMS demo data…");

  // Clear existing data (idempotent reseed).
  await prisma.notificationLog.deleteMany();
  await prisma.jobEvent.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.job.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.user.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();

  // --- Vehicles ---------------------------------------------------------
  const [smallVan, lwbVan, luton, sevenHalf] = await Promise.all([
    prisma.vehicle.create({ data: { registration: "AB12 CDE", type: "SMALL_VAN", make: "Ford", model: "Transit Connect" } }),
    prisma.vehicle.create({ data: { registration: "FG34 HIJ", type: "LWB_VAN", make: "Mercedes", model: "Sprinter" } }),
    prisma.vehicle.create({ data: { registration: "KL56 MNO", type: "LUTON", make: "DAF", model: "LF" } }),
    prisma.vehicle.create({ data: { registration: "PQ78 RST", type: "SEVEN_FIVE_TONNE", make: "Iveco", model: "Eurocargo" } }),
  ]);

  // --- Drivers ----------------------------------------------------------
  const [dave, sam, priya] = await Promise.all([
    prisma.driver.create({ data: { name: "Dave Roberts", phone: "07700 900111", licenceNumber: "ROBER901011AB9CD", defaultVehicleId: smallVan.id } }),
    prisma.driver.create({ data: { name: "Sam Hughes", phone: "07700 900222", licenceNumber: "HUGHE801022EF1GH", defaultVehicleId: lwbVan.id } }),
    prisma.driver.create({ data: { name: "Priya Patel", phone: "07700 900333", licenceNumber: "PATEL750233IJ2KL", defaultVehicleId: luton.id } }),
  ]);

  // --- Customers + contacts --------------------------------------------
  const acme = await prisma.customer.create({
    data: {
      accountCode: "ACME01",
      name: "Acme Components Ltd",
      email: "accounts@acme.example",
      phone: "0161 496 0000",
      addressLine1: "Unit 4, Trafford Park",
      city: "Manchester",
      postcode: "M17 1AB",
      paymentTerms: 30,
      contacts: {
        create: [
          { name: "Janet Cole", role: "Transport Manager", email: "janet@acme.example", phone: "0161 496 0001", isPrimary: true },
          { name: "Mark Lee", role: "Goods In", phone: "0161 496 0002" },
        ],
      },
    },
  });

  const brightLogistics = await prisma.customer.create({
    data: {
      accountCode: "BRIGHT01",
      name: "Bright Logistics",
      email: "ops@brightlog.example",
      phone: "0113 200 0000",
      addressLine1: "12 Canal Road",
      city: "Leeds",
      postcode: "LS12 2AA",
      paymentTerms: 14,
      contacts: { create: [{ name: "Tom Fielding", role: "Operations", email: "tom@brightlog.example", isPrimary: true }] },
    },
  });

  // --- Saved addresses (address book) -----------------------------------
  await prisma.savedAddress.createMany({
    data: [
      { customerId: acme.id, label: "Acme HQ (Trafford Park)", name: "Acme Components Ltd", addressLine1: "Unit 4, Trafford Park", city: "Manchester", postcode: "M17 1AB" },
      { customerId: acme.id, label: "Northern Assembly (Bolton)", name: "Northern Assembly", addressLine1: "8 Mill Lane", city: "Bolton", postcode: "BL1 4RT" },
      { customerId: brightLogistics.id, label: "Bright DC (Leeds)", name: "Bright Logistics", addressLine1: "12 Canal Road", city: "Leeds", postcode: "LS12 2AA" },
    ],
  });

  // --- Users (auth) -----------------------------------------------------
  // All demo users share the password "password".
  const pw = hashPassword("password");
  await prisma.user.createMany({
    data: [
      { email: "admin@tms.example", name: "Alex Admin", role: "ADMIN", passwordHash: pw },
      { email: "ops@tms.example", name: "Olivia Operator", role: "OPERATOR", passwordHash: pw },
    ],
  });
  await prisma.user.create({
    data: { email: "dave@tms.example", name: dave.name, role: "DRIVER", passwordHash: pw, driverId: dave.id },
  });
  await prisma.user.create({
    data: { email: "sam@tms.example", name: sam.name, role: "DRIVER", passwordHash: pw, driverId: sam.id },
  });
  await prisma.user.create({
    data: { email: "priya@tms.example", name: priya.name, role: "DRIVER", passwordHash: pw, driverId: priya.id },
  });
  await prisma.user.create({
    data: { email: "janet@acme.example", name: "Janet Cole", role: "CUSTOMER", passwordHash: pw, customerId: acme.id },
  });
  await prisma.user.create({
    data: { email: "tom@brightlog.example", name: "Tom Fielding", role: "CUSTOMER", passwordHash: pw, customerId: brightLogistics.id },
  });

  // --- Rate cards -------------------------------------------------------
  // Effective from the start of the current year so all demo jobs price.
  const effectiveFrom = new Date(new Date().getFullYear(), 0, 1);

  // Customer default per-mile rates by vehicle type, with minimum charges.
  const customerDefaults: { name: string; vehicleType: any; ratePerMile: number; minimumCharge: number }[] = [
    { name: "Default — Small van", vehicleType: "SMALL_VAN", ratePerMile: 1.1, minimumCharge: 35 },
    { name: "Default — LWB van", vehicleType: "LWB_VAN", ratePerMile: 1.35, minimumCharge: 45 },
    { name: "Default — Luton", vehicleType: "LUTON", ratePerMile: 1.7, minimumCharge: 65 },
    { name: "Default — 7.5t", vehicleType: "SEVEN_FIVE_TONNE", ratePerMile: 2.2, minimumCharge: 95 },
  ];
  for (const c of customerDefaults) {
    await prisma.rateCard.create({ data: { kind: "CUSTOMER", dayType: "ANY", timeBand: "ANY", effectiveFrom, ...c } });
  }

  // Weekend premium (applies to any vehicle, Saturday & Sunday).
  await prisma.rateCard.create({
    data: { kind: "CUSTOMER", name: "Weekend premium — Saturday", dayType: "SATURDAY", timeBand: "ANY", ratePerMile: 1.8, minimumCharge: 70, effectiveFrom },
  });
  await prisma.rateCard.create({
    data: { kind: "CUSTOMER", name: "Weekend premium — Sunday", dayType: "SUNDAY", timeBand: "ANY", ratePerMile: 2.1, minimumCharge: 85, effectiveFrom },
  });

  // Out-of-hours premium.
  await prisma.rateCard.create({
    data: { kind: "CUSTOMER", name: "Out-of-hours premium", dayType: "ANY", timeBand: "OUT_OF_HOURS", ratePerMile: 1.9, minimumCharge: 75, effectiveFrom },
  });

  // Negotiated rate for Acme (overrides defaults for them, small van).
  await prisma.rateCard.create({
    data: { kind: "CUSTOMER", name: "Acme — Small van (contract)", customerId: acme.id, vehicleType: "SMALL_VAN", dayType: "WEEKDAY", timeBand: "DAYTIME", ratePerMile: 0.95, minimumCharge: 30, effectiveFrom },
  });

  // Driver cost cards (what we pay drivers) by vehicle type.
  const driverDefaults: { name: string; vehicleType: any; ratePerMile: number; minimumCharge: number }[] = [
    { name: "Driver pay — Small van", vehicleType: "SMALL_VAN", ratePerMile: 0.65, minimumCharge: 20 },
    { name: "Driver pay — LWB van", vehicleType: "LWB_VAN", ratePerMile: 0.8, minimumCharge: 28 },
    { name: "Driver pay — Luton", vehicleType: "LUTON", ratePerMile: 1.0, minimumCharge: 40 },
    { name: "Driver pay — 7.5t", vehicleType: "SEVEN_FIVE_TONNE", ratePerMile: 1.3, minimumCharge: 55 },
  ];
  for (const c of driverDefaults) {
    await prisma.rateCard.create({ data: { kind: "DRIVER", dayType: "ANY", timeBand: "ANY", effectiveFrom, ...c } });
  }

  // --- Jobs (bookings) --------------------------------------------------
  const today = new Date();
  function at(hour: number, dayOffset = 0): Date {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    return d;
  }

  async function makeJob(args: {
    customerId: string;
    contactName?: string;
    vehicleType: any;
    serviceDate: Date;
    distanceMiles: number;
    estimatedMins: number;
    pieces?: number;
    weightKg?: number;
    driverId?: string;
    vehicleId?: string;
    status?: any;
    customerRef?: string;
    stops: { type: StopType; name: string; addressLine1: string; city: string; postcode: string; contactName?: string }[];
  }) {
    const dayType = classifyDay(args.serviceDate);
    const timeBand = classifyTimeBand(args.serviceDate);
    const pricing = await priceJob({
      vehicleType: args.vehicleType,
      dayType,
      timeBand,
      serviceDate: args.serviceDate,
      distanceMiles: args.distanceMiles,
      customerId: args.customerId,
      driverId: args.driverId,
    });
    const reference = await nextJobReference(args.serviceDate);

    return prisma.job.create({
      data: {
        reference,
        customerId: args.customerId,
        vehicleType: args.vehicleType,
        serviceDate: args.serviceDate,
        dayType,
        timeBand,
        distanceMiles: args.distanceMiles,
        estimatedMins: args.estimatedMins,
        pieces: args.pieces ?? 1,
        weightKg: args.weightKg ?? 0,
        driverId: args.driverId ?? null,
        vehicleId: args.vehicleId ?? null,
        status: args.status ?? "BOOKED",
        customerRef: args.customerRef,
        customerCharge: pricing.customerCharge,
        driverCost: pricing.driverCost,
        customerRateCardId: pricing.customerRateCardId,
        driverRateCardId: pricing.driverRateCardId,
        stops: {
          create: args.stops.map((s, i) => ({
            sequence: i + 1,
            type: s.type,
            name: s.name,
            addressLine1: s.addressLine1,
            city: s.city,
            postcode: s.postcode,
            contactName: s.contactName,
          })),
        },
      },
    });
  }

  await makeJob({
    customerId: acme.id,
    vehicleType: "SMALL_VAN",
    serviceDate: at(9),
    distanceMiles: 42,
    estimatedMins: 120,
    pieces: 6,
    weightKg: 48,
    driverId: dave.id,
    vehicleId: smallVan.id,
    status: "ALLOCATED",
    customerRef: "PO-88231",
    stops: [
      { type: "COLLECTION", name: "Acme Components Ltd", addressLine1: "Unit 4, Trafford Park", city: "Manchester", postcode: "M17 1AB" },
      { type: "DELIVERY", name: "Northern Assembly", addressLine1: "8 Mill Lane", city: "Bolton", postcode: "BL1 4RT", contactName: "Goods In" },
      { type: "DELIVERY", name: "Pennine Engineering", addressLine1: "22 Foundry Road", city: "Rochdale", postcode: "OL11 2HX" },
    ],
  });

  await makeJob({
    customerId: brightLogistics.id,
    vehicleType: "LWB_VAN",
    serviceDate: at(11),
    distanceMiles: 68,
    estimatedMins: 180,
    status: "BOOKED",
    stops: [
      { type: "COLLECTION", name: "Bright Logistics", addressLine1: "12 Canal Road", city: "Leeds", postcode: "LS12 2AA" },
      { type: "DELIVERY", name: "York Retail Park", addressLine1: "5 Clifton Moor", city: "York", postcode: "YO30 4XG" },
    ],
  });

  await makeJob({
    customerId: brightLogistics.id,
    vehicleType: "LUTON",
    serviceDate: at(7),
    distanceMiles: 130,
    estimatedMins: 300,
    pieces: 12,
    weightKg: 320,
    driverId: priya.id,
    vehicleId: luton.id,
    status: "ON_ROUTE",
    customerRef: "BL-5567",
    stops: [
      { type: "COLLECTION", name: "Bright DC", addressLine1: "12 Canal Road", city: "Leeds", postcode: "LS12 2AA" },
      { type: "DELIVERY", name: "Sheffield Store", addressLine1: "100 Attercliffe Rd", city: "Sheffield", postcode: "S9 3QS" },
      { type: "DELIVERY", name: "Derby Store", addressLine1: "44 London Rd", city: "Derby", postcode: "DE1 2QN" },
      { type: "DELIVERY", name: "Nottingham Store", addressLine1: "9 Maid Marian Way", city: "Nottingham", postcode: "NG1 6HS" },
    ],
  });

  await makeJob({
    customerId: acme.id,
    vehicleType: "SMALL_VAN",
    serviceDate: at(14, -1),
    distanceMiles: 25,
    estimatedMins: 90,
    driverId: dave.id,
    vehicleId: smallVan.id,
    status: "COMPLETED",
    stops: [
      { type: "COLLECTION", name: "Acme Components Ltd", addressLine1: "Unit 4, Trafford Park", city: "Manchester", postcode: "M17 1AB" },
      { type: "DELIVERY", name: "Stockport Depot", addressLine1: "3 Heaton Lane", city: "Stockport", postcode: "SK4 1AR" },
    ],
  });

  const counts = {
    customers: await prisma.customer.count(),
    drivers: await prisma.driver.count(),
    vehicles: await prisma.vehicle.count(),
    rateCards: await prisma.rateCard.count(),
    jobs: await prisma.job.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
