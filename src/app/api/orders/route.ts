import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";

export async function GET(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("id");

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        address: true,
        orderItems: {
          include: { food: { select: { id: true, name: true, price: true } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  }

  const orders = await prisma.order.findMany({
    where: { customerId },
    include: {
      orderItems: {
        include: { food: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ orders });
}
