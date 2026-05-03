// Seed script — creates an initial admin user, a starter UOM master, the 12 sample items
// from Convo.txt, and one supplier contact for RICHES SEEDS so the app is demo-ready out of the box.
//
// Idempotent: re-running doesn't duplicate rows.
//
// Usage: `npx tsx prisma/seed.ts`

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ADMIN_EMAIL = (process.env.ADMIN_SEED_EMAIL ?? "admin@siteone.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe123!";

const UOM_SEED = [
  { code: "EA", name: "Each", defaultEdiUom: "EA" },
  { code: "CS", name: "Case", defaultEdiUom: "CS" },
  { code: "PL", name: "Pallet", defaultEdiUom: "PL" },
  { code: "BG", name: "Bag", defaultEdiUom: "BG" },
  { code: "BX", name: "Box", defaultEdiUom: "BX" },
  { code: "PK", name: "Pack", defaultEdiUom: "PK" },
  { code: "BD", name: "Bundle", defaultEdiUom: "BD" },
  { code: "RL", name: "Roll", defaultEdiUom: "RL" },
  { code: "DR", name: "Drum", defaultEdiUom: "DR" },
  { code: "CT", name: "Carton", defaultEdiUom: "CT" },
];

// 12 items pulled from Convo.txt — real SiteOne SKUs with image URLs.
const ITEM_SEED = [
  {
    skuId: "111197",
    pim: "20-11-250",
    vendor: { id: "RICHES_SEEDS", name: "RICHES SEEDS" },
    productName: "LESCO All Pro Transition Tall Fescue Seed Blend 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Seed>Cool Season Turf Grass>Tall Fescue",
    mfg: "20-11-250",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/itemImage/111197-1.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "89896",
    pim: "91249",
    vendor: { id: "OCC_CHEM", name: "OCCIDENTAL CHEMICAL CORP." },
    productName: "PELADOW Premier Calcium Chloride Pellets 50 lb. Bag",
    brand: "PELADOW",
    taxonomy: "Agronomic Maintenance>Ice Melt>Granular Ice Melt>Bagged",
    mfg: "91249",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/PELADOW/altImage/89896_1_infographic_12302025.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "300079",
    pim: "20-24-250",
    vendor: { id: "RICHES_SEEDS", name: "RICHES SEEDS" },
    productName: "LESCO Tall Fescue Select Blend (Certified) Seed 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Seed>Cool Season Turf Grass>Tall Fescue",
    mfg: "20-24-250",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/altImage/558169914885_pd_infographic_1_021626.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "32869",
    pim: "20-09-250",
    vendor: { id: "RICHES_SEEDS", name: "RICHES SEEDS" },
    productName: "LESCO All Pro Team Mates Plus Seed Mixture 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Seed>Cool Season Turf Grass>Cool Season Mixtures",
    mfg: "20-09-250",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/altImage/550031044184_pd_infographic_1_021626.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "336048",
    pim: "32-52-950",
    vendor: { id: "TURF_MERCHANTS", name: "TURF MERCHANTS" },
    productName: "LESCO Overseeding Eagle Seed Blend 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Seed>Cool Season Turf Grass>Perennial Ryegrass",
    mfg: "32-52-950",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/itemImage/336048-1.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "351442",
    pim: "510131",
    vendor: { id: "KNOX_FERT", name: "KNOX FERTILIZER COMPANY" },
    productName: "LESCO 32-0-3 20% PolyPlus 1% Fe Turfgrass Granular Fertilizer 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Fertility & Nutrition>Fertilizer>Granular",
    mfg: "510131",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/itemImage/351442-1.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "718568",
    pim: "90015DS",
    vendor: { id: "MORTON_SALT", name: "MORTON SALT" },
    productName: "Morton Salt Ice Melt Bulk (Direct Ship)",
    brand: "Morton",
    taxonomy: "Agronomic Maintenance>Ice Melt>Granular Ice Melt>Bulk",
    mfg: "90015DS",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/Morton/itemImage/718568-1.jpg",
    uoms: ["EA", "PL"],
  },
  {
    skuId: "336704",
    pim: "98627",
    vendor: { id: "TURF_CARE_HATFIELD", name: "TURF CARE SUPPLY CORP-HATFIELD" },
    productName: "LESCO 18-24-12 25% PolyPlus OPTI 9% Cl MOP Starter Granular Fertilizer 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Fertility & Nutrition>Fertilizer>Granular",
    mfg: "98627",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/itemImage/336704-1.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "34966",
    pim: "20-07-250",
    vendor: { id: "RICHES_SEEDS", name: "RICHES SEEDS" },
    productName: "LESCO Premium Athletic Seed Mixture 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Seed>Cool Season Turf Grass>Kentucky Bluegrass",
    mfg: "20-07-250",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/itemImage/34966-1.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "861839",
    pim: "2011250-NF",
    vendor: { id: "NORFARM_SEEDS", name: "NORFARM SEEDS INC" },
    productName: "LESCO All Pro Transition Tall Fescue Seed Blend 50 lb. Bag",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Seed>Cool Season Turf Grass>Tall Fescue",
    mfg: "2011250-NF",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/altImage/550010080930_pd_infographic_1_021626.jpg",
    uoms: ["EA", "CS", "PL"],
  },
  {
    skuId: "282050",
    pim: "82003599",
    vendor: { id: "PALMETTO_DC", name: "Palmetto Distribution Center" },
    productName: "Taurus SC Insecticide 78 oz. (QGCY)",
    brand: "Taurus SC",
    taxonomy: "Agronomic Maintenance>Pest Control>Termiticides",
    mfg: "82003599",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/Taurus%20SC/itemImage/282050-1.jpg",
    uoms: ["EA", "CS"],
  },
  {
    skuId: "336327",
    pim: "LFHCTS",
    vendor: { id: "PROFILE_PRODUCTS", name: "PROFILE PRODUCTS LLC." },
    productName: "LESCO Hydrocover Triplestart Hydromulch Pellets 40 lb.",
    brand: "LESCO",
    taxonomy: "Agronomic Maintenance>Hydromulch>Base Mulch>Pellets",
    mfg: "LFHCTS",
    image: "https://pimassets.siteone.com/sys-master-siteoneprod/assets/ProductAssets/US/LESCO/itemImage/336327-1.jpg",
    uoms: ["EA", "BG", "PL"],
  },
];

const SUPPLIER_CONTACT_SEED = [
  // RICHES SEEDS — owns 4 of the 12 items so it's the most demoable.
  { vendorId: "RICHES_SEEDS", email: "rep@richesseeds.example.com", name: "Sample Rep" },
];

async function main() {
  console.log("Seeding…");

  // Admin user.
  const passwordHash = await hash(ADMIN_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { active: true, role: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      name: "SiteOne Admin",
      role: "ADMIN",
      authMethod: "PASSWORD",
      active: true,
    },
  });
  await prisma.passwordCredential.upsert({
    where: { userId: admin.id },
    update: { passwordHash },
    create: { userId: admin.id, passwordHash },
  });
  console.log(`✓ Admin: ${ADMIN_EMAIL}`);

  // UOM master.
  for (let i = 0; i < UOM_SEED.length; i++) {
    const u = UOM_SEED[i];
    await prisma.uomMaster.upsert({
      where: { code: u.code },
      update: { name: u.name, defaultEdiUom: u.defaultEdiUom, displayOrder: i },
      create: { code: u.code, name: u.name, defaultEdiUom: u.defaultEdiUom, displayOrder: i },
    });
  }
  console.log(`✓ UOM master: ${UOM_SEED.length} entries`);

  // Vendors + items + item_uom rows.
  const vendorIds = new Set<string>();
  for (const item of ITEM_SEED) {
    if (!vendorIds.has(item.vendor.id)) {
      await prisma.vendor.upsert({
        where: { id: item.vendor.id },
        update: { name: item.vendor.name },
        create: { id: item.vendor.id, name: item.vendor.name },
      });
      vendorIds.add(item.vendor.id);
    }
    await prisma.item.upsert({
      where: { skuId: item.skuId },
      update: {
        pimItemNumber: item.pim,
        vendorId: item.vendor.id,
        productName: item.productName,
        brandName: item.brand,
        taxonomyClassPath: item.taxonomy,
        mfgPartNumber: item.mfg,
        imageUrl: item.image,
      },
      create: {
        skuId: item.skuId,
        pimItemNumber: item.pim,
        vendorId: item.vendor.id,
        productName: item.productName,
        brandName: item.brand,
        taxonomyClassPath: item.taxonomy,
        mfgPartNumber: item.mfg,
        imageUrl: item.image,
      },
    });
    for (let i = 0; i < item.uoms.length; i++) {
      const code = item.uoms[i];
      await prisma.itemUom.upsert({
        where: { skuId_uomCode: { skuId: item.skuId, uomCode: code } },
        update: { source: "FILE", removedAt: null, position: i },
        create: { skuId: item.skuId, uomCode: code, source: "FILE", position: i },
      });
    }
  }
  console.log(`✓ Vendors: ${vendorIds.size}, Items: ${ITEM_SEED.length}`);

  // Sample supplier contacts.
  for (const c of SUPPLIER_CONTACT_SEED) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: { vendorId: c.vendorId, name: c.name, active: true },
      create: {
        email: c.email,
        name: c.name,
        role: "SUPPLIER",
        authMethod: "PASSWORD",
        active: true,
        vendorId: c.vendorId,
      },
    });
  }
  console.log(`✓ Supplier contacts: ${SUPPLIER_CONTACT_SEED.length}`);

  console.log("\nDone. Sign in as admin at /login with the email above.");
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
