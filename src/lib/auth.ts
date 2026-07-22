import { cookies } from "next/headers";
import {
  CUSTOMER_SESSION_COOKIE,
  validateCustomerSession,
} from "@/lib/customer-session";

export async function getCustomerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  return validateCustomerSession(sessionId);
}
