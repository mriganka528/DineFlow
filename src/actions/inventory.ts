import { prisma } from "@/lib/prisma";
import type { Food } from "@prisma/client";

export async function getCategories() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                name: "asc",
            },
        });

        return categories;
    } catch (error) {
        console.error("Error loading categories:", error);
        return [];
    }
}


export async function getFoodItems(): Promise<Food[]> {
  try {
    const foods = await prisma.food.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: true,
      },
    });

    return foods.map((food) => ({
      id: food.id,
      name: food.name,
      description: food.description,
      price: food.price,
      gst: food.gst,
      available: food.available,
      categoryId: food.categoryId,
      categoryName: food.categoryName ?? food.category?.name ?? "",
      imageUrl: food.imageUrl,
      imagePublicId: food.imagePublicId,
      createdAt: food.createdAt,
      updatedAt: food.updatedAt,
    }));
  } catch (error) {
    console.error("Error fetching food items:", error);
    return [];
  }
}