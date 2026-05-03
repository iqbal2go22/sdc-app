import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";

const COLUMNS = [
  "SKUID",
  "PIMItemNumber",
  "VendorID",
  "VendorName",
  "ProductName",
  "BrandName",
  "TaxonomyClassPath",
  "MFGPartNumber",
  "UOMCode",
  "UOMName",
  "Source",
  "UOMQuantity",
  "Length",
  "LengthUnit",
  "Width",
  "WidthUnit",
  "Height",
  "HeightUnit",
  "Weight",
  "Barcode",
  "BarcodeWaived",
  "EDIUOM",
  "FreightClass",
  "Nestable",
  "NestableIncrement",
  "LayFlat",
  "Stackable",
  "TI",
  "HI",
  "SubmittedAt",
  "SubmittedBy",
];

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function nz(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
}

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.item.findMany({
    where: { wipedAt: null, submittedAt: { not: null } },
    include: {
      vendor: { select: { name: true } },
      itemUoms: {
        where: { removedAt: null },
        include: { uom: { select: { name: true } } },
        orderBy: { position: "asc" },
      },
      submittedBy: { select: { email: true } },
    },
    orderBy: { skuId: "asc" },
  });

  const lines: string[] = [COLUMNS.join(",")];
  for (const it of items) {
    for (const u of it.itemUoms) {
      const row = [
        it.skuId,
        it.pimItemNumber,
        it.vendorId,
        it.vendor.name,
        it.productName,
        it.brandName ?? "",
        it.taxonomyClassPath ?? "",
        it.mfgPartNumber ?? "",
        u.uomCode,
        u.uom.name,
        u.source,
        nz(u.uomQuantity),
        nz(u.length),
        u.lengthUnit ?? "",
        nz(u.width),
        u.widthUnit ?? "",
        nz(u.height),
        u.heightUnit ?? "",
        nz(u.weight),
        u.barcode ?? "",
        nz(u.barcodeWaived),
        u.ediUom ?? "",
        u.freightClass ?? "",
        nz(u.nestable),
        nz(u.nestableIncrement),
        nz(u.layFlat),
        nz(u.stackable),
        nz(u.ti),
        nz(u.hi),
        nz(it.submittedAt),
        it.submittedBy?.email ?? "",
      ];
      lines.push(row.map((v) => csvEscape(String(v))).join(","));
    }
  }

  const csv = lines.join("\r\n") + "\r\n";

  await logEvent({
    eventType: "PIM_EXPORT",
    actorUserId: admin.id,
    eventData: { itemCount: items.length, rowCount: lines.length - 1 },
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sdc-pim-export-${stamp}.csv"`,
    },
  });
}
