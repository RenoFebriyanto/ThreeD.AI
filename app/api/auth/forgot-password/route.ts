// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

function genericResponse() {
  // Always the same shape/message whether or not the email is registered —
  // prevents leaking which emails exist in the system.
  return NextResponse.json({
    ok: true,
    message: "Jika email terdaftar, kami sudah mengirim link reset password.",
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Reuses the VerificationToken table NextAuth ships with (otherwise
    // unused here since no Email provider is configured) — namespaced with
    // a "pwreset:" prefix so it can't collide with other token kinds later.
    const identifier = `pwreset:${email}`;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({ data: { identifier, token, expires } });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

    await sendPasswordResetEmail(email, resetUrl);
  }

  return genericResponse();
}
