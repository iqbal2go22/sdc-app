import { prisma } from "@/lib/prisma";
import type { AuditEventType } from "@/generated/prisma/enums";

export async function logEvent(params: {
  eventType: AuditEventType;
  actorUserId?: string | null;
  vendorId?: string | null;
  itemId?: string | null;
  uomCode?: string | null;
  eventData?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      eventType: params.eventType,
      actorUserId: params.actorUserId ?? null,
      vendorId: params.vendorId ?? null,
      itemId: params.itemId ?? null,
      uomCode: params.uomCode ?? null,
      eventData: (params.eventData ?? null) as never,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
