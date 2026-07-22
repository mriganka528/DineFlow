import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";
import { notifyAdmins } from "@/app/api/admin/orders/stream/route";

export async function POST(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const orderType = body?.orderType === "DELIVERY" ? "DELIVERY" : "DINE_IN";
  const tableNumber = typeof body?.tableNumber === "number" ? body.tableNumber : null;
  const addressId = typeof body?.addressId === "string" ? body.addressId : null;
  const paymentMethod: "CASH" | "ONLINE" =
    body?.paymentMethod === "ONLINE" ? "ONLINE" : "CASH";

  try {
    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { customerId },
        include: {
          items: {
            include: { food: { include: { category: true } } },
          },
        },
      });

      if (!cart) {
        throw new Error("Cart not found");
      }

      if (cart.items.length === 0) {
        throw new Error("Cart is empty");
      }

      if (orderType === "DELIVERY" && addressId) {
        const address = await tx.address.findFirst({
          where: { id: addressId, customerId },
        });
        if (!address) {
          throw new Error("Address not found");
        }
      }

      const restaurant = await tx.restaurant.findFirst();
      const gstRate = restaurant?.gstRate ?? 5;
      const serviceChargeAmount = restaurant?.serviceCharge ?? 0;
      const autoAccept = restaurant?.autoAcceptOrders ?? false;

      const subtotal = cart.items.reduce(
        (sum, item) => sum + item.food.price * item.quantity,
        0,
      );
      const gstAmount = subtotal * (gstRate / 100);
      const total = subtotal + gstAmount + serviceChargeAmount;

      const lastOrder = await tx.order.findFirst({
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const orderNumber = (lastOrder?.orderNumber ?? 0) + 1;

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          orderType: orderType as "DINE_IN" | "DELIVERY",
          tableNumber: orderType === "DINE_IN" ? tableNumber : null,
          addressId: orderType === "DELIVERY" ? addressId : null,
          paymentMethod,
          paymentStatus: "PENDING",
          status: "PENDING",
          subtotal,
          gstAmount,
          serviceCharge: serviceChargeAmount,
          total,
          orderItems: {
            create: cart.items.map((item) => ({
              foodId: item.foodId,
              quantity: item.quantity,
              price: item.food.price,
              gst: item.food.gst,
              // Snapshot fields for historical preservation
              foodName: item.food.name,
              foodDescription: item.food.description ?? null,
              imageUrl: item.food.imageUrl ?? null,
              categoryName: item.food.categoryName ?? item.food.category?.name ?? null,
              foodPrice: item.food.price,
              foodGst: item.food.gst,
            })),
          },
        },
        include: { orderItems: true },
      });

      // Only clear cart for CASH payments.
      // For ONLINE, cart is cleared after payment verification.
      if (paymentMethod === "CASH") {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return newOrder;
    });

    notifyAdmins({
      type: "new_order",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
