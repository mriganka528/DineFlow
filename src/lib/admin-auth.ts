import { cookies } from "next/headers";
import { verifyAdminToken, ADMIN_SESSION_COOKIE } from "@/lib/admin-token";
import { prisma } from "@/lib/prisma";

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verifyAdminToken(token);
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return null;
    }

    return { adminId: admin.id, email: admin.email, role: admin.role };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}