import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { restaurantSettingsSchema} from "@/schemas/restaurentSchema";
import { notifyAllCustomers } from "@/app/api/orders/stream/route";
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = restaurantSettingsSchema.safeParse(body);

    if (!validationResult.success) {

      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      restaurantName,
      tagline,
      phone,
      email,
      address,
      currency,
      gstRate,
      serviceCharge,
      orderMode,
      averagePrepTime,
      autoAcceptOrders,
      dineInEnabled,
      deliveryEnabled,
      logoUrl,
      logoPublicId,
    } = validationResult.data;

    const existingRestaurant = await prisma.restaurant.findFirst();

    let restaurant;

    if (existingRestaurant) {
      restaurant = await prisma.restaurant.update({
        where: {
          id: existingRestaurant.id,
        },
        data: {
          restaurantName,
          tagline,
          phone,
          email,
          address,
          currency,
          gstRate,
          serviceCharge,
          orderMode,
          averagePrepTime,
          autoAcceptOrders,
          dineInEnabled,
          deliveryEnabled,
          ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
          ...(logoPublicId !== undefined && { logoPublicId: logoPublicId || null }),
        },
      });
    } else {
      restaurant = await prisma.restaurant.create({
        data: {
          restaurantName,
          tagline,
          phone,
          email,
          address,
          currency,
          gstRate,
          serviceCharge,
          orderMode,
          averagePrepTime,
          autoAcceptOrders,
          dineInEnabled,
          deliveryEnabled,
          ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
          ...(logoPublicId !== undefined && { logoPublicId: logoPublicId || null }),
        },
      });
    }

    notifyAllCustomers({
      type: "settings_update",
      settings: {
        dineInEnabled: restaurant.dineInEnabled,
        deliveryEnabled: restaurant.deliveryEnabled,
        orderMode: restaurant.orderMode,
        currency: restaurant.currency,
      },
    });

    return NextResponse.json(restaurant, { status: 200 });
  } catch (error) {
    console.error("Error saving restaurant settings:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save restaurant settings",
      },
      { status: 500 }
    );
  }
}