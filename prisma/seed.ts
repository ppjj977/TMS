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
  await prisma.recurringStop.deleteMany();
  await prisma.recurringJob.deleteMany();
  await prisma.jobSupplement.deleteMany();
  await prisma.fixedPrice.deleteMany();
  await prisma.autoSupplementRule.deleteMany();
  await prisma.vehicleTypeProfile.deleteMany();
  await prisma.trafficScreen.deleteMany();
  await prisma.companySetting.deleteMany();
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

  // Banded tariff demo: Bright LWB tiered £/mile + per-drop charge.
  await prisma.rateCard.create({
    data: {
      kind: "CUSTOMER",
      name: "Bright — LWB tiered",
      customerId: brightLogistics.id,
      vehicleType: "LWB_VAN",
      dayType: "ANY",
      timeBand: "ANY",
      ratePerMile: 1.35,
      minimumCharge: 45,
      effectiveFrom,
      bands: {
        create: [
          { type: "DISTANCE", minValue: 0, maxValue: 30, rate: 1.6 },
          { type: "DISTANCE", minValue: 30.01, maxValue: 9999, rate: 1.2 },
          { type: "DROP", minValue: 1, maxValue: 99, rate: 5 },
        ],
      },
    },
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

  // Approx coordinates for demo postcodes so the live map has data without
  // needing the geocoding API at seed time.
  const COORDS: Record<string, [number, number]> = {
    "M17 1AB": [53.4673, -2.3275],
    "BL1 4RT": [53.5853, -2.4329],
    "OL11 2HX": [53.6205, -2.1611],
    "LS12 2AA": [53.7905, -1.5839],
    "YO30 4XG": [53.9897, -1.1009],
    "S9 3QS": [53.4012, -1.4203],
    "DE1 2QN": [52.9226, -1.4746],
    "NG1 6HS": [52.9536, -1.1525],
    "SK4 1AR": [53.4106, -2.1576],
  };

  // --- Fixed prices & auto supplements (before jobs so they apply) ------
  await prisma.fixedPrice.create({
    data: { customerId: brightLogistics.id, vehicleType: "LWB_VAN", fromOutcode: "LS12", toOutcode: "YO30", price: 95 },
  });
  await prisma.autoSupplementRule.createMany({
    data: [
      { name: "Out of hours", type: "OUT_OF_HOURS", amount: 15, oohStartHour: 8, oohEndHour: 18, appliesWeekend: true },
      { name: "London ULEZ", type: "POSTCODE", amount: 12.5, outcodes: "EC1,EC2,EC3,EC4,WC1,WC2,W1,SW1,N1,SE1" },
    ],
  });

  // Demo standing job: Acme daily run Mon–Fri.
  await prisma.recurringJob.create({
    data: {
      name: "Daily Acme → Bolton",
      customerId: acme.id,
      vehicleType: "SMALL_VAN",
      pieces: 4,
      startHour: 9,
      mon: true, tue: true, wed: true, thu: true, fri: true,
      stops: {
        create: [
          { sequence: 1, type: "COLLECTION", name: "Acme Components Ltd", addressLine1: "Unit 4, Trafford Park", city: "Manchester", postcode: "M17 1AB", latitude: 53.4673, longitude: -2.3275 },
          { sequence: 2, type: "DELIVERY", name: "Northern Assembly", addressLine1: "8 Mill Lane", city: "Bolton", postcode: "BL1 4RT", latitude: 53.5853, longitude: -2.4329 },
        ],
      },
    },
  });

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
    const oc = (pc: string) => pc.trim().toUpperCase().split(/\s+/)[0];
    const firstCol = args.stops.find((s) => s.type === "COLLECTION") ?? args.stops[0];
    const lastDel = [...args.stops].reverse().find((s) => s.type === "DELIVERY") ?? args.stops[args.stops.length - 1];
    const pricing = await priceJob({
      vehicleType: args.vehicleType,
      dayType,
      timeBand,
      serviceDate: args.serviceDate,
      distanceMiles: args.distanceMiles,
      drops: args.stops.filter((s) => s.type === "DELIVERY").length,
      pieces: args.pieces ?? 1,
      customerId: args.customerId,
      driverId: args.driverId,
      fromOutcode: oc(firstCol.postcode),
      toOutcode: oc(lastDel.postcode),
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
        baseCharge: pricing.customerCharge,
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
            latitude: COORDS[s.postcode]?.[0] ?? null,
            longitude: COORDS[s.postcode]?.[1] ?? null,
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

  // --- Vehicle routing profiles ----------------------------------------
  const profiles: { type: any; urbanSpeedMph: number; motorwaySpeedMph: number; dwellMin: number }[] = [
    { type: "BIKE", urbanSpeedMph: 14, motorwaySpeedMph: 22, dwellMin: 5 },
    { type: "CAR", urbanSpeedMph: 20, motorwaySpeedMph: 65, dwellMin: 8 },
    { type: "SMALL_VAN", urbanSpeedMph: 18, motorwaySpeedMph: 60, dwellMin: 10 },
    { type: "SWB_VAN", urbanSpeedMph: 18, motorwaySpeedMph: 58, dwellMin: 10 },
    { type: "LWB_VAN", urbanSpeedMph: 17, motorwaySpeedMph: 56, dwellMin: 12 },
    { type: "LUTON", urbanSpeedMph: 16, motorwaySpeedMph: 52, dwellMin: 15 },
    { type: "SEVEN_FIVE_TONNE", urbanSpeedMph: 15, motorwaySpeedMph: 50, dwellMin: 20 },
    { type: "EIGHTEEN_TONNE", urbanSpeedMph: 14, motorwaySpeedMph: 48, dwellMin: 25 },
    { type: "ARTIC", urbanSpeedMph: 14, motorwaySpeedMph: 50, dwellMin: 30 },
  ];
  await prisma.vehicleTypeProfile.createMany({ data: profiles });

  // --- Company settings -------------------------------------------------
  await prisma.companySetting.create({
    data: {
      name: "Mission Express Ltd",
      addressLine1: "Littleton House, Littleton Road",
      city: "Ashford",
      postcode: "TW15 1UU",
      email: "accounts@missionexpress.example",
      phone: "020 8917 1299",
      vatNumber: "GB720417765",
      vatRate: 20,
      companyReg: "3672615",
      bankName: "NatWest Bank PLC",
      sortCode: "60-08-46",
      accountNumber: "76777162",
    },
  });

  // --- Control Room saved views ----------------------------------------
  await prisma.trafficScreen.createMany({
    data: [
      { name: "Unallocated", orderIndex: 1, statuses: ["BOOKED"], serviceLevels: [], vehicleType: null },
      { name: "On the road", orderIndex: 2, statuses: ["ALLOCATED", "ON_ROUTE"], serviceLevels: [], vehicleType: null },
      { name: "To invoice", orderIndex: 3, statuses: ["COMPLETED"], serviceLevels: [], vehicleType: null },
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
