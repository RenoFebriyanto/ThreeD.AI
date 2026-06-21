// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 }
    );
  }

  const { email, token, password } = parsed.data;
  const identifier = `pwreset:${email}`;

  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json(
      { error: "Link reset tidak valid atau sudah kedaluwarsa. Minta link baru." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Link reset tidak valid." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { password: hashed } }),
    // Single-use — delete the token once it's been consumed.
    prisma.verificationToken.delete({ where: { identifier_token: { identifier, token } } }),
  ]);

  return NextResponse.json({ ok: true });
}
