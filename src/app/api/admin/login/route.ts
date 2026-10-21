import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_LOGIN_CHALLENGE_COOKIE,
  ADMIN_LOGIN_CHALLENGE_MAX_AGE,
} from "@/lib/admin-session";
import { generateAdminLoginChallenge } from "@/lib/admin-token";
import { AdminOtpError, createAndSendAdminOtp } from "@/lib/admin-otp";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

type LoginBody = {
  email?: unknown;
  password?: unknown;
  remember?: unknown;
};

const loginLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });

export async function POST(request: Request) {
  try {
    const limit = loginLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { message: "Too many sign-in attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

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
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
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

    await createAndSendAdminOtp({
      adminId: admin.id,
      email: admin.email,
      purpose: "LOGIN",
      recipientName: admin.firstName,
    });

    // The password step is complete, but no session is created until the
    // emailed one-time code is verified. A short-lived signed challenge keeps
    // the pending sign-in tied to this browser.
    const challenge = generateAdminLoginChallenge(admin, remember);
    const response = NextResponse.json({
      ok: true,
      requiresOtp: true,
      email: admin.email,
      message: "A verification code has been sent to your registered email address.",
    });

    response.cookies.set({
      name: ADMIN_LOGIN_CHALLENGE_COOKIE,
      value: challenge,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_LOGIN_CHALLENGE_MAX_AGE,
    });

    return response;
  } catch (error) {
    if (error instanceof AdminOtpError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }

    console.error("Error starting admin sign-in:", error);
    return NextResponse.json(
      { message: "Could not send the verification code. Please try again." },
      { status: 500 },
    );
  }
}
