import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";

export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.address.findMany({
    where: { customerId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { label, houseNo, street, area, city, state, pincode, landmark, isDefault } = body ?? {};

  if (!houseNo || !street || !area || !city || !state || !pincode) {
    return NextResponse.json(
      { success: false, message: "houseNo, street, area, city, state, and pincode are required" },
      { status: 400 },
    );
  }

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    const isFirstAddress = (await tx.address.count({ where: { customerId } })) === 0;

    return tx.address.create({
      data: {
        customerId,
        label: label || null,
        houseNo,
        street,
        area,
        city,
        state,
        pincode,
        landmark: landmark || null,
        isDefault: isDefault || isFirstAddress,
      },
    });
  });

  return NextResponse.json({ success: true, address });
}

export async function PATCH(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const addressId = typeof body?.id === "string" ? body.id : "";

  if (!addressId) {
    return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
  }

  const existing = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
  }

  const { label, houseNo, street, area, city, state, pincode, landmark, isDefault } = body;

  const address = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...(label !== undefined && { label: label || null }),
        ...(houseNo && { houseNo }),
        ...(street && { street }),
        ...(area && { area }),
        ...(city && { city }),
        ...(state && { state }),
        ...(pincode && { pincode }),
        ...(landmark !== undefined && { landmark: landmark || null }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });
  });

  return NextResponse.json({ success: true, address });
}

export async function DELETE(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const addressId = typeof body?.id === "string" ? body.id : "";

  if (!addressId) {
    return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });
  }

  const existing = await prisma.address.findFirst({
    where: { id: addressId, customerId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: "Address not found" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id: addressId } });

  if (existing.isDefault) {
    const nextDefault = await prisma.address.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    if (nextDefault) {
      await prisma.address.update({
        where: { id: nextDefault.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ success: true });
}
