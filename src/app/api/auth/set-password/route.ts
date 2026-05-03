import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { hashPassword, passwordPolicyError } from "@/lib/auth/password";

const Body = z.object({ password: z.string().min(1) });

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const policyErr = passwordPolicyError(parsed.password);
  if (policyErr) return NextResponse.json({ error: policyErr }, { status: 400 });

  const hash = await hashPassword(parsed.password);
  await prisma.passwordCredential.upsert({
    where: { userId: user.id },
    update: { passwordHash: hash, lastChangedAt: new Date() },
    create: { userId: user.id, passwordHash: hash },
  });

  return NextResponse.json({
    ok: true,
    redirectTo: user.role === "ADMIN" ? "/admin" : "/supplier",
  });
}
