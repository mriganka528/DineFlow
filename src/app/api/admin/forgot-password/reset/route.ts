import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminResetPasswordSchema } from "@/schemas/adminSchema";
import { clearAdminOtps } from "@/lib/admin-otp";
import { requireAdminSession } from "@/lib/admin-token";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const resetPasswordLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 10 });
const SALT_ROUNDS = 12;

export async function POST(request: Request) {
  try {
    const limit = resetPasswordLimiter(getClientIp(request));
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
        { success: false, message: "Your verification session has expired. Please start again." },
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

    const result = adminResetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { success: false, message: "This admin account is no longer available." },
        { status: 403 },
      );
    }

    const passwordHash = await bcrypt.hash(result.data.password, SALT_ROUNDS);

    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    await clearAdminOtps(admin.id, "PASSWORD_RESET");

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("Error resetting admin password:", error);
    return NextResponse.json(
      { success: false, message: "Could not reset your password. Please try again." },
      { status: 500 },
    );
  }
}
