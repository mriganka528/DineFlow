import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { itemSchema } from '@/schemas/inventorySchema';
import { deleteFoodImage } from '@/lib/cloudinary';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Food item id is required',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validationResult = itemSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, price, available, categoryId, imageUrl, imagePublicId } = validationResult.data;

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          message: 'Category not found',
        },
        { status: 404 }
      );
    }

    const existing = await prisma.food.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });

    const nextImageUrl = imageUrl || null;
    const nextImagePublicId = imagePublicId || null;

    const food = await prisma.food.update({
      where: {
        id,
      },
      data: {
        name,
        price,
        available,
        categoryId,
        imageUrl: nextImageUrl,
        imagePublicId: nextImagePublicId,
      },
      include: {
        category: true,
      },
    });

    // Delete the previous Cloudinary image if it was replaced or removed.
    if (existing?.imagePublicId && existing.imagePublicId !== nextImagePublicId) {
      await deleteFoodImage(existing.imagePublicId);
    }

    return NextResponse.json(
      {
        id: food.id,
        name: food.name,
        categoryId: food.categoryId,
        category: food.category?.name ?? '',
        price: food.price,
        available: food.available,
        imageUrl: food.imageUrl,
        imagePublicId: food.imagePublicId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating food item:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to update food item',
      },
      { status: 500 }
    );
  }
}