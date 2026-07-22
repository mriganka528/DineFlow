import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";
import { getFoodRatingStats } from "@/lib/ratings";

export async function POST(request: NextRequest) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { foodId, orderId, stars, review } = body;

    if (!foodId || !orderId || !stars) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (stars < 1 || stars > 5) {
      return NextResponse.json({ message: "Stars must be between 1 and 5" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
      return NextResponse.json({ message: "Can only rate completed orders" }, { status: 400 });
    }

    // Get food details for snapshot
    const food = await prisma.food.findUnique({
      where: { id: foodId },
      select: { name: true, imageUrl: true },
    });

    const rating = await prisma.rating.upsert({
      where: {
        customerId_foodId_orderId: { customerId, foodId, orderId },
      },
      update: { stars, review: review || null },
      create: {
        customerId,
        foodId,
        orderId,
        stars,
        review: review || null,
        // Snapshot fields for historical preservation
        foodName: food?.name ?? "Unknown Item",
        foodImageUrl: food?.imageUrl ?? null,
      },
    });

    return NextResponse.json({ success: true, rating });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json({ message: "Failed to save rating" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const foodId = searchParams.get("foodId");
  const orderId = searchParams.get("orderId");
  const customerId = await getCustomerId();

  if (foodId) {
    const stats = await getFoodRatingStats(foodId);

    return NextResponse.json({
      average: stats.average,
      count: stats.count,
      distribution: stats.distribution,
    });
  }

  if (orderId && customerId) {
    const ratings = await prisma.rating.findMany({
      where: { orderId, customerId },
      select: { foodId: true, stars: true, review: true },
    });

    return NextResponse.json({ ratings });
  }

  return NextResponse.json({ message: "Provide foodId or orderId" }, { status: 400 });
}
