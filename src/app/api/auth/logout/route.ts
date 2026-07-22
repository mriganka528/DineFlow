import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  CUSTOMER_SESSION_COOKIE,
  deleteCustomerSession,
} from "@/lib/customer-session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;

    if (sessionId) {
      await deleteCustomerSession(sessionId);
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
