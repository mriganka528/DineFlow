import { unstable_noStore as noStore } from "next/cache";
import { RestaurantSettings } from "@/app/admin/settings/types";
import { prisma } from "@/lib/prisma";
import { restaurantSettingsSchema } from "@/schemas/restaurentSchema";

export async function getRestaurantSettings(): Promise<RestaurantSettings | null> {
  noStore();
  const restaurant = await prisma.restaurant.findFirst();

  if (!restaurant) return null;

  return {
    restaurantName: restaurant.restaurantName,
    tagline: restaurant.tagline ?? "",
    phone: restaurant.phone,
    email: restaurant.email,
    address: restaurant.address,
    currency: restaurant.currency,
    gstRate: restaurant.gstRate,
    serviceCharge: restaurant.serviceCharge,
    orderMode: restaurant.orderMode,
    averagePrepTime: restaurant.averagePrepTime,
    autoAcceptOrders: restaurant.autoAcceptOrders,
    dineInEnabled: restaurant.dineInEnabled,
    deliveryEnabled: restaurant.deliveryEnabled,
    logoUrl: restaurant.logoUrl,
    logoPublicId: restaurant.logoPublicId,
  };
}

export async function saveRestaurantSettings(data: unknown) {
  const validationResult = restaurantSettingsSchema.safeParse(data);

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues[0]?.message ?? "Validation failed");
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
    logoUrl,
    logoPublicId,
  } = validationResult.data;

  const existingRestaurant = await prisma.restaurant.findFirst();

  if (existingRestaurant) {
    return prisma.restaurant.update({
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
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(logoPublicId !== undefined && { logoPublicId: logoPublicId || null }),
      },
    });
  }

  return prisma.restaurant.create({
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
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(logoPublicId !== undefined && { logoPublicId: logoPublicId || null }),
    },
  });
}