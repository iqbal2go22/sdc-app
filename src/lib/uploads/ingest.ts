// Smart-merge / upsert ingestion for items, contacts, and UOM master files.
// Per D10 (smart merge) and D18 (long-format items file).

import { prisma } from "@/lib/prisma";
import { getCol, type ParsedRow, requireColumns } from "./parsers";

export type IngestError = { row: number; message: string };
export type IngestWarning = { row?: number; message: string };

export type IngestResult = {
  rowCount: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount: number;
  errors: IngestError[];
  warnings: IngestWarning[];
};

const REQUIRED_ITEMS_COLS = [
  "VendorID",
  "VendorName",
  "SKUID",
  "PIMItemNumber",
  "ProductName",
  "UOMCode",
];

export async function ingestItems(rows: ParsedRow[], headers: string[]): Promise<IngestResult> {
  const result = freshResult(rows.length);

  const missing = requireColumns(headers, REQUIRED_ITEMS_COLS);
  if (missing.length) {
    result.errors.push({ row: 0, message: `Missing required columns: ${missing.join(", ")}` });
    return result;
  }

  // Group rows by SKUID. Within a group, item-level fields must match.
  const groups = new Map<string, { itemRow: ParsedRow; uomRows: { row: ParsedRow; idx: number }[] }>();

  rows.forEach((row, idx) => {
    const skuId = getCol(row, "SKUID");
    if (!skuId) {
      result.errors.push({ row: idx + 2, message: "Missing SKUID" });
      return;
    }
    if (!getCol(row, "VendorID")) {
      result.errors.push({ row: idx + 2, message: "Missing VendorID" });
      return;
    }
    if (!getCol(row, "UOMCode")) {
      result.errors.push({ row: idx + 2, message: "Missing UOMCode" });
      return;
    }

    if (!groups.has(skuId)) {
      groups.set(skuId, { itemRow: row, uomRows: [] });
    }
    groups.get(skuId)!.uomRows.push({ row, idx });
  });

  // Validate all UOM codes exist in UOM master.
  const allUomCodes = new Set<string>();
  groups.forEach((g) =>
    g.uomRows.forEach(({ row }) => allUomCodes.add(getCol(row, "UOMCode").toUpperCase())),
  );
  const validCodes = new Set(
    (await prisma.uomMaster.findMany({ select: { code: true } })).map((u) => u.code),
  );
  for (const code of allUomCodes) {
    if (!validCodes.has(code)) {
      result.errors.push({
        row: 0,
        message: `UOM code "${code}" not found in master list. Upload UOM master first.`,
      });
    }
  }
  if (result.errors.length) return result;

  // Process each item group atomically.
  for (const [skuId, group] of groups) {
    const { itemRow, uomRows } = group;
    const productName = getCol(itemRow, "ProductName");

    // Check for conflicting item-level fields across rows of same SKUID.
    const fieldsToCheck = [
      "VendorID",
      "VendorName",
      "PIMItemNumber",
      "ProductName",
      "BrandName",
      "TaxonomyClassPath",
      "MFGPartNumber",
      "ImageURL",
    ];
    for (const f of fieldsToCheck) {
      const values = new Set(uomRows.map(({ row }) => getCol(row, f)));
      if (values.size > 1) {
        result.errors.push({
          row: uomRows[0].idx + 2,
          message: `SKUID ${skuId} has conflicting ${f} values across rows.`,
        });
      }
    }
    if (result.errors.length > 0) continue;

    const vendorId = getCol(itemRow, "VendorID");
    const vendorName = getCol(itemRow, "VendorName");

    try {
      // Upsert vendor first.
      await prisma.vendor.upsert({
        where: { id: vendorId },
        update: { name: vendorName || vendorId },
        create: { id: vendorId, name: vendorName || vendorId },
      });

      // Upsert item.
      const existing = await prisma.item.findUnique({ where: { skuId } });
      const itemData = {
        pimItemNumber: getCol(itemRow, "PIMItemNumber"),
        vendorId,
        productName,
        brandName: getCol(itemRow, "BrandName") || null,
        taxonomyClassPath: getCol(itemRow, "TaxonomyClassPath") || null,
        mfgPartNumber: getCol(itemRow, "MFGPartNumber") || null,
        imageUrl: getCol(itemRow, "ImageURL") || null,
      };

      if (existing) {
        const changed =
          existing.pimItemNumber !== itemData.pimItemNumber ||
          existing.vendorId !== itemData.vendorId ||
          existing.productName !== itemData.productName ||
          existing.brandName !== itemData.brandName ||
          existing.taxonomyClassPath !== itemData.taxonomyClassPath ||
          existing.mfgPartNumber !== itemData.mfgPartNumber ||
          existing.imageUrl !== itemData.imageUrl;
        if (changed) {
          await prisma.item.update({ where: { skuId }, data: itemData });
          result.updatedCount++;
        } else {
          result.unchangedCount++;
        }
      } else {
        await prisma.item.create({ data: { skuId, ...itemData } });
        result.insertedCount++;
      }

      // Upsert each item_uom row.
      let position = 0;
      const seenCodes: string[] = [];
      for (const { row } of uomRows) {
        const uomCode = getCol(row, "UOMCode").toUpperCase();
        if (seenCodes.includes(uomCode)) {
          result.warnings.push({
            message: `SKUID ${skuId}: duplicate UOM "${uomCode}" — keeping first occurrence.`,
          });
          continue;
        }
        seenCodes.push(uomCode);
        await prisma.itemUom.upsert({
          where: { skuId_uomCode: { skuId, uomCode } },
          update: { source: "FILE", removedAt: null, position },
          create: { skuId, uomCode, source: "FILE", position },
        });
        position++;
      }

      // Soft-delete file-sourced UOMs that aren't in this re-upload.
      const removedUoms = await prisma.itemUom.findMany({
        where: {
          skuId,
          source: "FILE",
          removedAt: null,
          uomCode: { notIn: seenCodes },
        },
      });
      if (removedUoms.length > 0) {
        await prisma.itemUom.updateMany({
          where: { id: { in: removedUoms.map((u) => u.id) } },
          data: { removedAt: new Date() },
        });
        const withData = removedUoms.filter(
          (u) => u.uomQuantity !== null || u.weight !== null || u.length !== null,
        );
        result.warnings.push({
          message: `SKUID ${skuId}: ${removedUoms.length} UOM(s) removed (${withData.length} had vendor data, preserved as orphan).`,
        });
      }
    } catch (e) {
      result.errors.push({
        row: uomRows[0].idx + 2,
        message: `SKUID ${skuId}: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return result;
}

const REQUIRED_CONTACTS_COLS = ["VendorID", "ContactEmail"];

export async function ingestContacts(
  rows: ParsedRow[],
  headers: string[],
): Promise<IngestResult> {
  const result = freshResult(rows.length);

  const missing = requireColumns(headers, REQUIRED_CONTACTS_COLS);
  if (missing.length) {
    result.errors.push({ row: 0, message: `Missing required columns: ${missing.join(", ")}` });
    return result;
  }

  const validVendors = new Set(
    (await prisma.vendor.findMany({ select: { id: true } })).map((v) => v.id),
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const vendorId = getCol(row, "VendorID");
    const email = getCol(row, "ContactEmail").toLowerCase();
    const name = getCol(row, "ContactName") || null;
    const rowNum = i + 2;

    if (!vendorId) {
      result.errors.push({ row: rowNum, message: "Missing VendorID" });
      continue;
    }
    if (!email) {
      result.errors.push({ row: rowNum, message: "Missing ContactEmail" });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.errors.push({ row: rowNum, message: `Invalid email "${email}"` });
      continue;
    }
    if (!validVendors.has(vendorId)) {
      result.warnings.push({
        row: rowNum,
        message: `VendorID "${vendorId}" not found in items table — orphan contact.`,
      });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.role !== "SUPPLIER") {
          result.errors.push({
            row: rowNum,
            message: `Email "${email}" is registered as ${existing.role}.`,
          });
          continue;
        }
        const changed = existing.vendorId !== vendorId || existing.name !== name;
        if (changed) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { vendorId, name, active: true },
          });
          result.updatedCount++;
        } else if (!existing.active) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { active: true },
          });
          result.updatedCount++;
        } else {
          result.unchangedCount++;
        }
      } else {
        await prisma.user.create({
          data: {
            email,
            name,
            role: "SUPPLIER",
            authMethod: "PASSWORD",
            vendorId,
            active: true,
          },
        });
        result.insertedCount++;
      }
    } catch (e) {
      result.errors.push({
        row: rowNum,
        message: `${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return result;
}

const REQUIRED_UOM_MASTER_COLS = ["UOMCode", "UOMName"];

export async function ingestUomMaster(
  rows: ParsedRow[],
  headers: string[],
): Promise<IngestResult> {
  const result = freshResult(rows.length);

  const missing = requireColumns(headers, REQUIRED_UOM_MASTER_COLS);
  if (missing.length) {
    result.errors.push({ row: 0, message: `Missing required columns: ${missing.join(", ")}` });
    return result;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const code = getCol(row, "UOMCode").toUpperCase();
    const name = getCol(row, "UOMName");
    const ediUom = getCol(row, "DefaultEDIUOM") || code;
    const rowNum = i + 2;

    if (!code) {
      result.errors.push({ row: rowNum, message: "Missing UOMCode" });
      continue;
    }
    if (!name) {
      result.errors.push({ row: rowNum, message: "Missing UOMName" });
      continue;
    }
    if (!/^[A-Z0-9]{1,6}$/.test(code)) {
      result.errors.push({
        row: rowNum,
        message: `Invalid UOM code "${code}" — must be 1-6 alphanumeric characters.`,
      });
      continue;
    }

    try {
      const existing = await prisma.uomMaster.findUnique({ where: { code } });
      if (existing) {
        const changed =
          existing.name !== name ||
          existing.defaultEdiUom !== ediUom ||
          existing.displayOrder !== i;
        if (changed) {
          await prisma.uomMaster.update({
            where: { code },
            data: { name, defaultEdiUom: ediUom, displayOrder: i, active: true },
          });
          result.updatedCount++;
        } else {
          result.unchangedCount++;
        }
      } else {
        await prisma.uomMaster.create({
          data: { code, name, defaultEdiUom: ediUom, displayOrder: i },
        });
        result.insertedCount++;
      }
    } catch (e) {
      result.errors.push({
        row: rowNum,
        message: `${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  return result;
}

function freshResult(rowCount: number): IngestResult {
  return {
    rowCount,
    insertedCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    errors: [],
    warnings: [],
  };
}
