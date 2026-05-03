// Admin file upload endpoint. Routes to one of three ingestion paths based on `type`.
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { logEvent } from "@/lib/db/audit";
import { parseUpload } from "@/lib/uploads/parsers";
import {
  ingestContacts,
  ingestItems,
  ingestUomMaster,
  type IngestResult,
} from "@/lib/uploads/ingest";

const VALID_TYPES = ["ITEMS", "CONTACTS", "UOM_MASTER"] as const;
type UploadType = (typeof VALID_TYPES)[number];

export async function POST(request: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as UploadType)) {
    return NextResponse.json({ error: "Invalid upload type." }, { status: 400 });
  }
  const uploadType = type as UploadType;

  let parsed;
  try {
    parsed = await parseUpload(file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse file." },
      { status: 400 },
    );
  }

  let result: IngestResult;
  if (uploadType === "ITEMS") result = await ingestItems(parsed.rows, parsed.headers);
  else if (uploadType === "CONTACTS") result = await ingestContacts(parsed.rows, parsed.headers);
  else result = await ingestUomMaster(parsed.rows, parsed.headers);

  const status =
    result.errors.length > 0 && result.insertedCount + result.updatedCount === 0
      ? "FAILED"
      : "COMMITTED";

  await prisma.uploadHistory.create({
    data: {
      type: uploadType,
      filename: file.name,
      uploadedById: admin.id,
      status,
      rowCount: result.rowCount,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      unchangedCount: result.unchangedCount,
      errorCount: result.errors.length,
      errors: result.errors as never,
      warnings: result.warnings as never,
    },
  });

  await logEvent({
    eventType: "FILE_UPLOAD",
    actorUserId: admin.id,
    eventData: {
      type: uploadType,
      filename: file.name,
      rows: result.rowCount,
      inserted: result.insertedCount,
      updated: result.updatedCount,
      errors: result.errors.length,
    },
  });

  return NextResponse.json({ ...result, status });
}
