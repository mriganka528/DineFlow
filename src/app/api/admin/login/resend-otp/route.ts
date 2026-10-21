import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_LOGIN_CHALLENGE_COOKIE,
  ADMIN_LOGIN_CHALLENGE_MAX_AGE,
} from "@/lib/admin-session";
import {
  generateAdminLoginChallenge,
  verifyAdminLoginChallenge,
} from "@/lib/admin-token";
import { AdminOtpError, createAndSendAdminOtp } from "@/lib/admin-otp";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const resendLoginLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export async function POST(request: Request) {
  try {
    const limit = resendLoginLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
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
      select: { id: true, email: true, firstName: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { message: "This admin account is not available." },
        { status: 403 },
      );
    }

    await createAndSendAdminOtp({
      adminId: admin.id,
      email: admin.email,
      purpose: "LOGIN",
      recipientName: admin.firstName,
    });

    // Keep the pending sign-in alive for another full verification window.
    const refreshedChallenge = generateAdminLoginChallenge(admin, challenge.remember);
    const response = NextResponse.json({
      ok: true,
      message: "A new verification code has been sent to your registered email address.",
    });

    response.cookies.set({
      name: ADMIN_LOGIN_CHALLENGE_COOKIE,
      value: refreshedChallenge,
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

    console.error("Error resending admin sign-in code:", error);
    return NextResponse.json(
      { message: "Could not send a new verification code. Please try again." },
      { status: 500 },
    );
  }
}
