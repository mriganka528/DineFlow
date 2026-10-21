import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_LOGIN_CHALLENGE_COOKIE,
  ADMIN_REMEMBERED_SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/admin-session";
import {
  generateAdminToken,
  verifyAdminLoginChallenge,
} from "@/lib/admin-token";
import {
  AdminOtpError,
  clearAdminOtps,
  verifyAdminOtp,
} from "@/lib/admin-otp";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifyLoginLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 10 });

export async function POST(request: Request) {
  try {
    const limit = verifyLoginLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { message: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    let body: { code?: unknown };

    try {
      body = (await request.json()) as { code?: unknown };
    } catch {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!/^[0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { message: "Enter the 6-digit verification code." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(ADMIN_LOGIN_CHALLENGE_COOKIE)?.value;

    if (!challengeToken) {
      return NextResponse.json(
        { message: "Your sign-in session has expired. Please sign in again." },
        { status: 401 },
      );
    }

    let challenge;

    try {
      challenge = verifyAdminLoginChallenge(challengeToken);
    } catch {
      return NextResponse.json(
        { message: "Your sign-in session has expired. Please sign in again." },
        { status: 401 },
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: challenge.adminId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { message: "This admin account is not available." },
        { status: 403 },
      );
    }

    await verifyAdminOtp({
      adminId: admin.id,
      email: challenge.email,
      purpose: "LOGIN",
      otp: code,
    });

    await clearAdminOtps(admin.id, "LOGIN");

    const maxAge = challenge.remember
      ? ADMIN_REMEMBERED_SESSION_MAX_AGE
      : ADMIN_SESSION_MAX_AGE;
    const token = generateAdminToken(admin, maxAge);
    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    response.cookies.set({
      name: ADMIN_LOGIN_CHALLENGE_COOKIE,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    return response;
  } catch (error) {
    if (error instanceof AdminOtpError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    console.error("Error verifying admin sign-in code:", error);
    return NextResponse.json(
      { message: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
