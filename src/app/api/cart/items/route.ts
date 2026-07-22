import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";

export async function POST(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const foodId = typeof body?.foodId === "string" ? body.foodId : "";
  const quantity = typeof body?.quantity === "number" ? body.quantity : 1;

  if (!foodId) {
    return NextResponse.json({ success: false, message: "foodId is required" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({ where: { customerId } });

  if (!cart) {
    return NextResponse.json({ success: false, message: "No cart found" }, { status: 404 });
  }

  const item = await prisma.cartItem.upsert({
    where: { cartId_foodId: { cartId: cart.id, foodId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, foodId, quantity },
    include: { food: { select: { id: true, name: true, price: true, gst: true, available: true } } },
  });

  return NextResponse.json({
    id: item.id,
    foodId: item.foodId,
    quantity: item.quantity,
    food: item.food,
  });
}

export async function PATCH(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const foodId = typeof body?.foodId === "string" ? body.foodId : "";
  const quantity = typeof body?.quantity === "number" ? body.quantity : 0;

  if (!foodId) {
    return NextResponse.json({ success: false, message: "foodId is required" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({ where: { customerId } });

  if (!cart) {
    return NextResponse.json({ success: false, message: "No cart found" }, { status: 404 });
  }

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id, foodId },
    });
    return NextResponse.json({ success: true, removed: true });
  }

  const item = await prisma.cartItem.upsert({
    where: { cartId_foodId: { cartId: cart.id, foodId } },
    update: { quantity },
    create: { cartId: cart.id, foodId, quantity },
    include: { food: { select: { id: true, name: true, price: true, gst: true, available: true } } },
  });

  return NextResponse.json({
    id: item.id,
    foodId: item.foodId,
    quantity: item.quantity,
    food: item.food,
  });
}

export async function DELETE(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const foodId = typeof body?.foodId === "string" ? body.foodId : "";

  if (!foodId) {
    return NextResponse.json({ success: false, message: "foodId is required" }, { status: 400 });
  }

  const cart = await prisma.cart.findUnique({ where: { customerId } });

  if (!cart) {
    return NextResponse.json({ success: false, message: "No cart found" }, { status: 404 });
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, foodId },
  });

  return NextResponse.json({ success: true });
}
