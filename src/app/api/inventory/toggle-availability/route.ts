import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAllCustomers } from '@/app/api/orders/stream/route';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';

    if (!id) {
      return NextResponse.json({ error: 'Food item id is required' }, { status: 400 });
    }

    const existingFood = await prisma.food.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existingFood) {
      return NextResponse.json({ error: 'Food item not found' }, { status: 404 });
    }

    const updatedFood = await prisma.food.update({
      where: { id },
      data: {
        available: !existingFood.available,
      },
      include: { category: true },
    });

    notifyAllCustomers({
      type: "food_availability",
      food: {
        id: updatedFood.id,
        available: updatedFood.available,
      },
    });

    return NextResponse.json(
      {
        id: updatedFood.id,
        name: updatedFood.name,
        categoryId: updatedFood.categoryId,
        category: updatedFood.category?.name ?? '',
        price: updatedFood.price,
        available: updatedFood.available,
        imageUrl: updatedFood.imageUrl ?? null,
        imagePublicId: updatedFood.imagePublicId ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error toggling availability:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}
