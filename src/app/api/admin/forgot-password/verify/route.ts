import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminVerifyOtpSchema } from "@/schemas/adminSchema";
import {
  AdminOtpError,
  clearAdminOtps,
  verifyAdminOtp,
} from "@/lib/admin-otp";
import {
  generateAdminToken,
} from "@/lib/admin-token";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
} from "@/lib/admin-session";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifyResetLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 10 });

export async function POST(request: Request) {
  try {
    const limit = verifyResetLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { success: false, message: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 },
      );
    }

    const result = adminVerifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { email, code } = result.data;

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "No admin account is registered with this email address.",
          code: "ADMIN_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    if (!admin.isActive) {
      return NextResponse.json(
        { success: false, message: "This admin account is disabled." },
        { status: 403 },
      );
    }

    await verifyAdminOtp({
      adminId: admin.id,
      email,
      purpose: "PASSWORD_RESET",
      otp: code,
    });

    await clearAdminOtps(admin.id, "PASSWORD_RESET");

    // The code proves ownership of the registered email, so the admin can
    // either reset the password or continue straight to the dashboard.
    const token = generateAdminToken(admin, ADMIN_SESSION_MAX_AGE);
    const response = NextResponse.json({
      success: true,
      message: "Code verified. You can reset your password or continue to the dashboard.",
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    if (error instanceof AdminOtpError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("Error verifying admin password reset code:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
