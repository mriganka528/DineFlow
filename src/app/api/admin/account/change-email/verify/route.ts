import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminChangeEmailVerifySchema } from "@/schemas/adminSchema";
import {
  AdminOtpError,
  clearAdminOtps,
  verifyAdminOtp,
} from "@/lib/admin-otp";
import { generateAdminToken, requireAdminSession } from "@/lib/admin-token";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE } from "@/lib/admin-session";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const verifyEmailLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 10 });

export async function POST(request: Request) {
  try {
    const limit = verifyEmailLimiter(getClientIp(request));
    if (!limit.success) {
      return NextResponse.json(
        { success: false, message: "Too many attempts. Please try again later." },
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

    const result = adminChangeEmailVerifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { newEmail, code } = result.data;

    const admin = await prisma.admin.findUnique({
      where: { id: session.adminId },
      select: { id: true, email: true, role: true, isActive: true },
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

    await verifyAdminOtp({
      adminId: admin.id,
      email: newEmail,
      purpose: "EMAIL_CHANGE",
      otp: code,
    });

    let updatedAdmin;

    try {
      updatedAdmin = await prisma.admin.update({
        where: { id: admin.id },
        data: { email: newEmail },
        select: { id: true, email: true, role: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { success: false, message: "This email address is already in use." },
          { status: 409 },
        );
      }

      throw error;
    }

    await clearAdminOtps(admin.id, "EMAIL_CHANGE");

    // Refresh the session cookie so it carries the new email address.
    const token = generateAdminToken(updatedAdmin, ADMIN_SESSION_MAX_AGE);
    const response = NextResponse.json({
      success: true,
      message: "Your admin email has been updated successfully.",
      email: updatedAdmin.email,
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

    console.error("Error verifying admin email change:", error);
    return NextResponse.json(
      { success: false, message: "Could not update your email. Please try again." },
      { status: 500 },
    );
  }
}
