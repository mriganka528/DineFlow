import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminChangeEmailSendSchema } from "@/schemas/adminSchema";
import { AdminOtpError, createAndSendAdminOtp } from "@/lib/admin-otp";
import { requireAdminSession } from "@/lib/admin-token";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const changeEmailLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

export async function POST(request: Request) {
  try {
    const limit = changeEmailLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }

    let session;

    try {
      session = await requireAdminSession();
    } catch {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
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

    const result = adminChangeEmailSendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { newEmail, currentPassword } = result.data;

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (newEmail === admin.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, message: "This is already your current email address." },
        { status: 400 },
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: "This email address is already in use by another admin." },
        { status: 409 },
      );
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, admin.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Your current password is incorrect." },
        { status: 400 },
      );
    }

    await createAndSendAdminOtp({
      adminId: admin.id,
      email: newEmail,
      purpose: "EMAIL_CHANGE",
      recipientName: admin.firstName,
    });

    return NextResponse.json({
      success: true,
      message: `A verification code has been sent to ${newEmail}.`,
    });
  } catch (error) {
    if (error instanceof AdminOtpError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("Error sending admin email change code:", error);
    return NextResponse.json(
      { success: false, message: "Could not send the verification code. Please try again." },
      { status: 500 },
    );
  }
}
