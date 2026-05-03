import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSupplier } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";
import { validateUom } from "@/lib/validation";

const UomBody = z.object({
  uomCode: z.string().min(1).max(6),
  source: z.enum(["FILE", "ADDED"]),
  uomQuantity: z.number().nullable(),
  barcode: z.string().nullable(),
  barcodeWaived: z.boolean(),
  ediUom: z.string().nullable(),
  length: z.number().nullable(),
  lengthUnit: z.string(),
  width: z.number().nullable(),
  widthUnit: z.string(),
  height: z.number().nullable(),
  heightUnit: z.string(),
  weight: z.number().nullable(),
  freightClass: z.string().nullable(),
  nestable: z.boolean().nullable(),
  nestableIncrement: z.number().nullable(),
  layFlat: z.boolean().nullable(),
  stackable: z.boolean().nullable(),
  ti: z.number().nullable(),
  hi: z.number().nullable(),
});

const Body = z.object({
  mfgPartNumber: z.string().nullable().optional(),
  uoms: z.array(UomBody),
  submit: z.boolean().default(false),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ skuId: string }> },
) {
  let user;
  try {
    user = await requireSupplier();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { skuId } = await params;
  const item = await prisma.item.findUnique({ where: { skuId } });
  if (!item || item.vendorId !== user.vendorId || item.wipedAt) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  if (item.submittedAt) {
    return NextResponse.json({ error: "Item already submitted." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Validate every UOM if submitting; for draft, just save what we have.
  if (parsed.submit) {
    for (const u of parsed.uoms) {
      const issues = validateUom(u);
      if (issues.length > 0) {
        return NextResponse.json(
          { error: `Validation failed for ${u.uomCode}: ${issues.map((i) => `${i.field}: ${i.message}`).join("; ")}` },
          { status: 400 },
        );
      }
    }
  }

  // Validate UOM codes against master.
  const codes = Array.from(new Set(parsed.uoms.map((u) => u.uomCode)));
  const masterCodes = await prisma.uomMaster.findMany({
    where: { code: { in: codes } },
    select: { code: true },
  });
  const masterSet = new Set(masterCodes.map((m) => m.code));
  for (const c of codes) {
    if (!masterSet.has(c))
      return NextResponse.json({ error: `Unknown UOM code: ${c}` }, { status: 400 });
  }

  // Get existing item_uom rows so we know who's new vs updated.
  const existing = await prisma.itemUom.findMany({
    where: { skuId, removedAt: null },
    select: { uomCode: true, source: true },
  });
  const existingByCode = new Map(existing.map((e) => [e.uomCode, e.source]));

  // Persist within a transaction.
  await prisma.$transaction(async (tx) => {
    if (parsed.mfgPartNumber !== undefined) {
      await tx.item.update({
        where: { skuId },
        data: { mfgPartNumber: parsed.mfgPartNumber || null },
      });
    }
    for (let i = 0; i < parsed.uoms.length; i++) {
      const u = parsed.uoms[i];
      await tx.itemUom.upsert({
        where: { skuId_uomCode: { skuId, uomCode: u.uomCode } },
        update: {
          uomQuantity: u.uomQuantity,
          barcode: u.barcodeWaived ? null : u.barcode,
          barcodeWaived: u.barcodeWaived,
          ediUom: u.ediUom,
          length: u.length,
          lengthUnit: u.lengthUnit,
          width: u.width,
          widthUnit: u.widthUnit,
          height: u.height,
          heightUnit: u.heightUnit,
          weight: u.weight,
          freightClass: u.freightClass,
          nestable: u.nestable,
          nestableIncrement: u.nestableIncrement,
          layFlat: u.layFlat,
          stackable: u.stackable,
          ti: u.ti,
          hi: u.hi,
          removedAt: null,
        },
        create: {
          skuId,
          uomCode: u.uomCode,
          source: u.source,
          position: i,
          uomQuantity: u.uomQuantity,
          barcode: u.barcodeWaived ? null : u.barcode,
          barcodeWaived: u.barcodeWaived,
          ediUom: u.ediUom,
          length: u.length,
          lengthUnit: u.lengthUnit,
          width: u.width,
          widthUnit: u.widthUnit,
          height: u.height,
          heightUnit: u.heightUnit,
          weight: u.weight,
          freightClass: u.freightClass,
          nestable: u.nestable,
          nestableIncrement: u.nestableIncrement,
          layFlat: u.layFlat,
          stackable: u.stackable,
          ti: u.ti,
          hi: u.hi,
        },
      });
    }
    // Hard-remove any ADDED UOMs that the user dropped from the form.
    const submittedCodes = new Set(parsed.uoms.map((u) => u.uomCode));
    for (const [code, source] of existingByCode) {
      if (source === "ADDED" && !submittedCodes.has(code)) {
        await tx.itemUom.delete({
          where: { skuId_uomCode: { skuId, uomCode: code } },
        });
      }
    }
    if (parsed.submit) {
      await tx.item.update({
        where: { skuId },
        data: { submittedAt: new Date(), submittedByUserId: user.id },
      });
    }
  });

  // Fire UOM_ADDED events for new ADDED UOMs.
  for (const u of parsed.uoms) {
    if (u.source === "ADDED" && !existingByCode.has(u.uomCode)) {
      await logEvent({
        eventType: "UOM_ADDED",
        actorUserId: user.id,
        vendorId: user.vendorId,
        itemId: skuId,
        uomCode: u.uomCode,
      });
    }
  }
  // Removed events
  const submittedCodes = new Set(parsed.uoms.map((u) => u.uomCode));
  for (const [code, source] of existingByCode) {
    if (source === "ADDED" && !submittedCodes.has(code)) {
      await logEvent({
        eventType: "UOM_REMOVED",
        actorUserId: user.id,
        vendorId: user.vendorId,
        itemId: skuId,
        uomCode: code,
      });
    }
  }

  if (parsed.submit) {
    await logEvent({
      eventType: "ITEM_SUBMITTED",
      actorUserId: user.id,
      vendorId: user.vendorId,
      itemId: skuId,
    });
    // Compute next item for the supplier.
    const queue = await prisma.item.findMany({
      where: { vendorId: user.vendorId, wipedAt: null, submittedAt: null },
      orderBy: { skuId: "asc" },
      select: { skuId: true },
    });
    const nextSkuId = queue[0]?.skuId ?? null;
    return NextResponse.json({ ok: true, submitted: true, nextSkuId });
  }

  return NextResponse.json({ ok: true, submitted: false });
}
