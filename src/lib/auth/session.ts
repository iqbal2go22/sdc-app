import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateSessionId } from "./tokens";
import { env } from "@/lib/env";
import type { User } from "@/generated/prisma/client";

const SESSION_COOKIE = "sdc_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8-hour workday session per D6

export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { id, userId, expiresAt, ipAddress, userAgent },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  return id;
}

export async function destroySession() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  if (!session.user.active) return null;

  // Touch lastSeenAt — used for heartbeat-driven time-on-app
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastSeenAt: new Date() },
  });

  return session.user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error("Unauthorized");
    (err as { status?: number }).status = 401;
    throw err;
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    const err = new Error("Forbidden");
    (err as { status?: number }).status = 403;
    throw err;
  }
  return user;
}

export async function requireSupplier(): Promise<User & { vendorId: string }> {
  const user = await requireUser();
  if (user.role !== "SUPPLIER" || !user.vendorId) {
    const err = new Error("Forbidden");
    (err as { status?: number }).status = 403;
    throw err;
  }
  return user as User & { vendorId: string };
}

export async function bumpHeartbeat(sessionId: string, deltaMs: number) {
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      activeMs: { increment: Math.max(0, Math.min(deltaMs, 120_000)) },
      lastSeenAt: new Date(),
    },
  });
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
