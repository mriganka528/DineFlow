import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_REMEMBERED_SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/admin-session";
import {
  generateAdminToken,
} from "@/lib/admin-token";

export const runtime = "nodejs";

type LoginBody = {
  email?: unknown;
  password?: unknown;
  remember?: unknown;
};

export async function POST(request: Request) {
  let body: LoginBody;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });

  const isPasswordValid = admin
    ? await bcrypt.compare(password, admin.passwordHash)
    : false;

  if (!admin || !admin.isActive || !isPasswordValid) {
    return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
  }

  const maxAge = remember ? ADMIN_REMEMBERED_SESSION_MAX_AGE : ADMIN_SESSION_MAX_AGE;
  const token = generateAdminToken(admin, maxAge);
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge,
  });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  });

  return response;
}
