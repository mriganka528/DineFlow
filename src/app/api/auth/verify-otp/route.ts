import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { otpVerifySchema } from "@/schemas/customerSchema";
import { verifyOtpHash, MAX_VERIFY_ATTEMPTS, LOCKOUT_MINUTES } from "@/lib/otp";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
} from "@/lib/customer-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = otpVerifySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.issues[0]?.message ?? "Validation failed" },
        { status: 400 },
      );
    }

    const { email, otp } = result.data;
    const { name, phone, mode } = body;

    const otpRecord = await prisma.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "No verification code found. Please request a new one." },
        { status: 400 },
      );
    }

    if (otpRecord.attempts >= MAX_VERIFY_ATTEMPTS) {
      const lockoutEnd = new Date(otpRecord.createdAt.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      if (new Date() < lockoutEnd) {
        const minutesLeft = Math.ceil((lockoutEnd.getTime() - Date.now()) / 60_000);
        return NextResponse.json(
          { success: false, message: `Too many incorrect attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` },
          { status: 429 },
        );
      }
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { success: false, message: "Verification code expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (otpRecord.expiresAt < new Date()) {
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        { success: false, message: "Verification code expired. Please request a new one." },
        { status: 400 },
      );
    }

    if (!verifyOtpHash(otp, otpRecord.otpHash)) {
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = MAX_VERIFY_ATTEMPTS - otpRecord.attempts - 1;
      return NextResponse.json(
        { success: false, message: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` },
        { status: 400 },
      );
    }

    let customer;

    if (mode === "login") {
      customer = await prisma.$transaction(async (tx) => {
        const existing = await tx.customer.findUnique({ where: { email } });
        if (!existing) {
          return null;
        }

        await tx.customer.update({
          where: { email },
          data: { isVerified: true },
        });

        const hasCart = await tx.cart.findUnique({ where: { customerId: existing.id } });
        if (!hasCart) {
          await tx.cart.create({ data: { customerId: existing.id } });
        }

        return existing;
      });

      if (!customer) {
        await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
        return NextResponse.json(
          { success: false, message: "No account found. Please sign up first." },
          { status: 404 },
        );
      }
    } else if (mode === "signup") {
      const existing = await prisma.customer.findUnique({ where: { email } });
      if (existing) {
        await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
        return NextResponse.json(
          { success: false, message: "Account already exists. Please log in instead." },
          { status: 409 },
        );
      }

      customer = await prisma.$transaction(async (tx) => {
        const newCustomer = await tx.customer.create({
          data: { name, email, phone, isVerified: true },
        });
        await tx.cart.create({ data: { customerId: newCustomer.id } });
        return newCustomer;
      });
    } else {
      // Legacy mode: original create-or-update behavior
      customer = await prisma.$transaction(async (tx) => {
        const existing = await tx.customer.findUnique({ where: { email } });

        if (existing) {
          const updated = await tx.customer.update({
            where: { email },
            data: {
              name: name || existing.name,
              phone: phone || existing.phone,
              isVerified: true,
            },
          });

          const hasCart = await tx.cart.findUnique({ where: { customerId: existing.id } });
          if (!hasCart) {
            await tx.cart.create({ data: { customerId: existing.id } });
          }

          return updated;
        }

        const newCustomer = await tx.customer.create({
          data: { name, email, phone, isVerified: true },
        });
        await tx.cart.create({ data: { customerId: newCustomer.id } });
        return newCustomer;
      });
    }

    await prisma.emailOtp.delete({ where: { id: otpRecord.id } });

    const sessionId = await createCustomerSession(customer.id);

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: sessionId,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CUSTOMER_SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
