import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

const CUSTOMER_SESSION_COOKIE = "foodbot.customer.session";

type AdminJwtPayload = {
  adminId?: unknown;
  email?: unknown;
  role?: unknown;
  aud?: unknown;
  iss?: unknown;
  exp?: unknown;
};

const ADMIN_LOGIN_PATH = "/admin/login";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return handleLandingPage(request);
  }

  if (pathname.startsWith("/auth")) {
    return handleAuthRoute(request);
  }

  if (pathname.startsWith("/menu")) {
    return handleMenuRoute(request);
  }

  if (pathname.startsWith("/admin")) {
    return handleAdminRoute(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/menu/:path*", "/auth/:path*", "/"],
};

function handleLandingPage(request: NextRequest) {
  const session = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (session) {
    return NextResponse.redirect(new URL("/menu", request.url));
  }
  return NextResponse.redirect(new URL("/auth", request.url));
}

function handleAuthRoute(request: NextRequest) {
  const session = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (session) {
    return NextResponse.redirect(new URL("/menu", request.url));
  }
  return NextResponse.next();
}

function handleMenuRoute(request: NextRequest) {
  const session = request.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (!session) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

async function handleAdminRoute(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (pathname === ADMIN_LOGIN_PATH) {
    if (token && (await verifyAdminJwt(token))) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return redirectToLogin(request);
  }

  const isValid = await verifyAdminJwt(token);

  if (!isValid) {
    const response = redirectToLogin(request);
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: "",
      path: "/admin",
      maxAge: 0,
    });
    return response;
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);

  if (request.nextUrl.pathname !== "/admin") {
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  }

  return NextResponse.redirect(loginUrl);
}

async function verifyAdminJwt(token: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = parseJwtPart<{ alg?: unknown; typ?: unknown }>(encodedHeader);
  const payload = parseJwtPart<AdminJwtPayload>(encodedPayload);

  if (!header || !payload || header.alg !== "HS256") {
    return false;
  }

  if (
    payload.aud !== "foodbot-admin" ||
    payload.iss !== "foodbot" ||
    typeof payload.adminId !== "string" ||
    typeof payload.email !== "string" ||
    (payload.role !== "OWNER" && payload.role !== "ADMIN") ||
    typeof payload.exp !== "number" ||
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    return crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
  } catch {
    return false;
  }
}

function parseJwtPart<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
  } catch {
    return null;
  }
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
