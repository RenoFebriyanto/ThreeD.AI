// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(50),
  email: z.string().email("Email tidak valid"),
  // bcrypt silently truncates inputs over 72 bytes, so we cap it here.
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const hashed = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.password) {
      return NextResponse.json(
        { error: "Email ini sudah terdaftar. Silakan masuk." },
        { status: 409 }
      );
    }

    // Account exists from Google/GitHub OAuth but has no password yet —
    // link a credentials login onto it instead of erroring out.
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hashed, name: existing.name ?? name },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  await prisma.user.create({
    data: { name, email, password: hashed },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
