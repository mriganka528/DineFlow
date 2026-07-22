import crypto from "crypto";
import { prisma } from "./prisma";

export const CUSTOMER_SESSION_COOKIE = "foodbot.customer.session";
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function createCustomerSession(customerId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + CUSTOMER_SESSION_MAX_AGE * 1000);

  await prisma.customerSession.create({
    data: { customerId, sessionId, expiresAt },
  });

  return sessionId;
}

export async function validateCustomerSession(sessionId: string): Promise<string | null> {
  const session = await prisma.customerSession.findUnique({
    where: { sessionId },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.customerSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.customerId;
}

export async function deleteCustomerSession(sessionId: string): Promise<void> {
  await prisma.customerSession.deleteMany({ where: { sessionId } });
}

export async function deleteAllCustomerSessions(customerId: string): Promise<void> {
  await prisma.customerSession.deleteMany({ where: { customerId } });
}
