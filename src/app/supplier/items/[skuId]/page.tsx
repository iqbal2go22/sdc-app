import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { logEvent } from "@/lib/db/audit";
import { ItemEditor } from "./ItemEditor";

export const dynamic = "force-dynamic";

export default async function ItemEditorPage({
  params,
}: {
  params: Promise<{ skuId: string }>;
}) {
  const { skuId } = await params;
  const user = await getSessionUser();
  if (!user || !user.vendorId) redirect("/login");

  const item = await prisma.item.findUnique({
    where: { skuId },
    include: {
      itemUoms: {
        where: { removedAt: null },
        include: { uom: true },
        orderBy: [{ source: "asc" }, { position: "asc" }],
      },
      vendor: true,
    },
  });
  if (!item || item.vendorId !== user.vendorId || item.wipedAt) notFound();

  const allUoms = await prisma.uomMaster.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });

  // Find prev / next item in the queue
  const queue = await prisma.item.findMany({
    where: { vendorId: user.vendorId, wipedAt: null },
    orderBy: { skuId: "asc" },
    select: { skuId: true },
  });
  const idx = queue.findIndex((i) => i.skuId === skuId);
  const prev = idx > 0 ? queue[idx - 1].skuId : null;
  const next = idx < queue.length - 1 ? queue[idx + 1].skuId : null;
  const position = idx + 1;
  const total = queue.length;

  await logEvent({
    eventType: "ITEM_OPENED",
    actorUserId: user.id,
    vendorId: item.vendorId,
    itemId: item.skuId,
  });

  return (
    <ItemEditor
      item={{
        skuId: item.skuId,
        pimItemNumber: item.pimItemNumber,
        productName: item.productName,
        brandName: item.brandName,
        vendorName: item.vendor.name,
        mfgPartNumber: item.mfgPartNumber,
        taxonomyClassPath: item.taxonomyClassPath,
        imageUrl: item.imageUrl,
        submittedAt: item.submittedAt,
      }}
      uoms={item.itemUoms.map((u) => ({
        id: u.id,
        uomCode: u.uomCode,
        uomName: u.uom.name,
        defaultEdiUom: u.uom.defaultEdiUom,
        source: u.source,
        uomQuantity: u.uomCode === "EA" ? 1 : u.uomQuantity,
        barcode: u.barcode,
        barcodeWaived: u.barcodeWaived,
        ediUom: u.ediUom,
        length: u.length,
        lengthUnit: u.lengthUnit ?? "IN",
        width: u.width,
        widthUnit: u.widthUnit ?? "IN",
        height: u.height,
        heightUnit: u.heightUnit ?? "IN",
        weight: u.weight,
        freightClass: u.freightClass,
        nestable: u.nestable,
        nestableIncrement: u.nestableIncrement,
        layFlat: u.layFlat,
        stackable: u.stackable,
        ti: u.ti,
        hi: u.hi,
      }))}
      allUomsForPicker={allUoms.map((u) => ({
        code: u.code,
        name: u.name,
        defaultEdiUom: u.defaultEdiUom,
      }))}
      navigation={{ prev, next, position, total }}
    />
  );
}
