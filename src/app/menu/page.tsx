import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getRestaurantSettings } from "@/actions/settings";
import { getCustomerId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFoodRatingStatsMap, emptyRatingStats } from "@/lib/ratings";
import MenuClient from "./components/MenuClient";
import type { MenuCategory, MenuItem, MenuSettings } from "./components/types";

export default async function MenuPage() {
  await connection();

  const customerId = await getCustomerId();
  if (!customerId) {
    redirect("/auth?redirect=/menu");
  }

  const [categories, foods, restaurantSettings, ratingStatsMap, orderCounts] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.food.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    getRestaurantSettings(),
    getFoodRatingStatsMap(),
    prisma.orderItem.groupBy({
      by: ["foodId"],
      _sum: { quantity: true },
    }),
  ]);

  const popularityMap = new Map(
    orderCounts.map((row) => [row.foodId, row._sum.quantity ?? 0]),
  );

  const liveCategories: MenuCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const liveItems: MenuItem[] = foods.map((food) => {
    const stats = ratingStatsMap.get(food.id) ?? emptyRatingStats();
    return {
      id: food.id,
      name: food.name,
      description:
        food.description?.trim() ||
        "Prepared fresh by the kitchen and ready to add to your order.",
      available: food.available,
      categoryId: food.categoryId ?? "uncategorized",
      categoryName: food.category?.name ?? "Uncategorized",
      price: food.price,
      imageUrl: food.imageUrl || null,
      tag: food.available ? "Available" : "Paused",
      prepTime: restaurantSettings?.averagePrepTime ?? 25,
      rating: stats.average,
      ratingCount: stats.count,
      ratingDistribution: stats.distribution,
      popularity: popularityMap.get(food.id) ?? 0,
      createdAt: food.createdAt.toISOString(),
    };
  });

  const hasUncategorized = liveItems.some((item) => item.categoryId === "uncategorized");
  const menuCategories = liveItems.length
    ? [
        ...liveCategories,
        ...(hasUncategorized ? [{ id: "uncategorized", name: "Uncategorized" }] : []),
      ]
    : [];

  const settings: MenuSettings = restaurantSettings
    ? {
        restaurantName: restaurantSettings.restaurantName,
        tagline: restaurantSettings.tagline,
        currency: restaurantSettings.currency,
        gstRate: restaurantSettings.gstRate,
        serviceCharge: restaurantSettings.serviceCharge,
        averagePrepTime: restaurantSettings.averagePrepTime,
        orderMode: restaurantSettings.orderMode,
        dineInEnabled: restaurantSettings.dineInEnabled,
        deliveryEnabled: restaurantSettings.deliveryEnabled,
        logoUrl: restaurantSettings.logoUrl,
      }
    : {
        restaurantName: "DineFlow",
        tagline: "Welcome to our menu",
        currency: "INR",
        gstRate: 5,
        serviceCharge: 0,
        averagePrepTime: 25,
        orderMode: "ACCEPTING",
        dineInEnabled: true,
        deliveryEnabled: true,
        logoUrl: null,
      };

  return (
    <MenuClient
      items={liveItems}
      categories={menuCategories}
      settings={settings}
    />
  );
}
