"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  CUSTOMER_SESSION_COOKIE,
  deleteCustomerSession,
} from "@/lib/customer-session";

export async function logoutCustomer() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteCustomerSession(sessionId);
  }

  cookieStore.set({
    name: CUSTOMER_SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return { success: true };
}

export async function deleteCustomerAccount() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return { success: false, error: "Not authenticated" };
  }

  const session = await prisma.customerSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  const customerId = session.customerId;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true },
  });

  if (!customer) {
    return { success: false, error: "Customer not found" };
  }

  // --- All READ queries outside the transaction ---
  const [customerOrders, cart] = await Promise.all([
    prisma.order.findMany({
      where: { customerId },
      select: { id: true },
    }),
    prisma.cart.findUnique({
      where: { customerId },
      select: { id: true },
    }),
  ]);

  const orderIds = customerOrders.map((o) => o.id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete OrderItems for customer's orders (FK: OrderItem.orderId -> Order, Restrict)
      //    Rating.orderId -> Order uses onDelete: Cascade, so ratings auto-delete with orders.
      //    But OrderItem has no cascade, so must be explicit.
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      }

      // 2. Delete customer's Orders
      //    This cascades: Rating (orderId onDelete: Cascade) — no explicit rating delete needed
      await tx.order.deleteMany({ where: { customerId } });

      // 3. Nullify customerId on ratings this customer left on OTHER customers' orders
      //    Rating.customerId is nullable with onDelete: SetNull, but SetNull only fires
      //    when the referenced Customer row is deleted. Since we explicitly delete the
      //    customer at the end, Prisma/Postgres will handle this via the FK SetNull action.
      //    No explicit update needed here.

      // 4. Delete CartItems and Cart (no cascade from Cart -> Customer)
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.delete({ where: { id: cart.id } });
      }

      // 5. Nullify addressId on orders referencing this customer's addresses
      //    Order.addressId -> Address (Restrict). Since we already deleted all of this
      //    customer's orders above, no other orders reference these addresses.
      //    Safe to delete addresses now.
      await tx.address.deleteMany({ where: { customerId } });

      // 6. Delete EmailOtps (no FK to Customer, independent)
      //    CustomerSessions have onDelete: Cascade — auto-deleted with Customer.
      //    But EmailOtp has no relation, must be explicit.
      if (customer.email) {
        await tx.emailOtp.deleteMany({ where: { email: customer.email } });
      }

      // 7. Delete the Customer
      //    Cascades: CustomerSession (onDelete: Cascade)
      //    Sets null: Rating.customerId (onDelete: SetNull)
      await tx.customer.delete({ where: { id: customerId } });
    });

    cookieStore.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });

    return { success: true };
  } catch (error) {
    console.error("[DELETE_ACCOUNT] Transaction failed:", error);
    return { success: false, error: "Failed to delete account. Please try again." };
  }
}

export async function updateCustomerProfile(data: {
  name: string;
  email: string;
  phone: string;
}) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!sessionId) {
    return { success: false, message: "Not authenticated" };
  }

  const session = await prisma.customerSession.findUnique({
    where: { sessionId },
  });

  if (!session) {
    return { success: false, message: "Session not found" };
  }

  const customerId = session.customerId;

  // Check if email is already taken by another customer
  if (data.email) {
    const existingEmail = await prisma.customer.findFirst({
      where: {
        email: data.email,
        NOT: { id: customerId },
      },
    });
    if (existingEmail) {
      return { success: false, message: "Email already in use", errors: { email: "Email already in use", phone: "" } };
    }
  }

  // Check if phone is already taken by another customer
  if (data.phone) {
    const existingPhone = await prisma.customer.findFirst({
      where: {
        phone: data.phone,
        NOT: { id: customerId },
      },
    });
    if (existingPhone) {
      return { success: false, message: "Phone number already in use", errors: { phone: "Phone number already in use", email: "" } };
    }
  }

  // Check if email or phone changed - if so, we might need OTP verification
  const currentCustomer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { email: true, phone: true, isVerified: true },
  });

  const emailChanged = currentCustomer?.email !== data.email;
  const phoneChanged = currentCustomer?.phone !== data.phone;

  // If email or phone changed, we could trigger OTP verification here
  // For now, we'll just update the profile and mark as unverified if changed
  // The existing OTP flow can be reused when they next log in

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone,
      isVerified: !emailChanged && !phoneChanged ? currentCustomer?.isVerified ?? false : false,
    },
  });

  return { success: true };
}