import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";

export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const cart = await prisma.cart.findUnique({
    where: { customerId },
    include: {
      items: {
        include: { food: { select: { id: true, name: true, price: true, gst: true, available: true } } },
      },
    },
  });

  return NextResponse.json({
    cart: cart
      ? {
          id: cart.id,
          items: cart.items.map((item) => ({
            id: item.id,
            foodId: item.foodId,
            quantity: item.quantity,
            food: item.food,
          })),
        }
      : null,
  });
}
