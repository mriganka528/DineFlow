import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_REMEMBERED_SESSION_MAX_AGE,
} from "@/lib/admin-session";
import { Role } from "@prisma/client";

type AdminTokenInput = {
  id: string;
  email: string;
  role: Role;
};

type AdminTokenPayload = {
  adminId: string;
  email: string;
  role: Role;
};

export {
  ADMIN_REMEMBERED_SESSION_MAX_AGE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required to generate admin sessions");
  }

  return secret;
}

export function generateAdminToken(admin: AdminTokenInput, expiresIn = ADMIN_SESSION_MAX_AGE) {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    },
    getJwtSecret(),
    {
      audience: "foodbot-admin",
      expiresIn,
      issuer: "foodbot",
      subject: admin.id,
    },
  );
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      audience: "foodbot-admin",
      issuer: "foodbot",
    }) as AdminTokenPayload;
    return payload;
  } catch (error) {
    throw new Error("Invalid admin token");
  }
}

// Server-side helper to get and verify admin session
export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

// Server-side helper that throws if no valid session
export async function requireAdminSession(): Promise<AdminTokenPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
