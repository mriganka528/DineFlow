import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminForgotPasswordSchema } from "@/schemas/adminSchema";
import { AdminOtpError, createAndSendAdminOtp } from "@/lib/admin-otp";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const sendResetLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export async function POST(request: Request) {
  try {
    const limit = sendResetLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
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

    const result = adminForgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { email } = result.data;

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, email: true, firstName: true, isActive: true },
    });

    // A wrong email must be surfaced clearly so the admin knows no code was sent.
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
        {
          success: false,
          message: "This admin account is disabled. Please contact the restaurant owner.",
          code: "ADMIN_INACTIVE",
        },
        { status: 403 },
      );
    }

    await createAndSendAdminOtp({
      adminId: admin.id,
      email: admin.email,
      purpose: "PASSWORD_RESET",
      recipientName: admin.firstName,
    });

    return NextResponse.json({
      success: true,
      message: "A verification code has been sent to your registered email address.",
    });
  } catch (error) {
    if (error instanceof AdminOtpError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("Error sending admin password reset code:", error);
    return NextResponse.json(
      { success: false, message: "Could not send the verification code. Please try again." },
      { status: 500 },
    );
  }
}
