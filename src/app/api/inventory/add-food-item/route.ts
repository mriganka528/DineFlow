import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/schemas/inventorySchema";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = itemSchema.safeParse(body);

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

    const { name, price, categoryId, available, imageUrl, imagePublicId } = validationResult.data;

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: "Category not found",
        },
        { status: 404 }
      );
    }

    const food = await prisma.food.create({
      data: {
        name,
        price,
        available,
        categoryId,
        imageUrl: imageUrl || null,
        imagePublicId: imagePublicId || null,
      },
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("Error creating food item:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create food item",
      },
      { status: 500 }
    );
  }
}