import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { getCustomerId } from "@/lib/auth";
import { notifyCustomer } from "@/app/api/orders/stream/route";
import { notifyAdmins } from "@/app/api/admin/orders/stream/route";

export async function POST(request: Request) {
  const customerId = await getCustomerId();
  if (!customerId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const razorpayOrderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const razorpayPaymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const razorpaySignature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json(
      { success: false, message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId, customerId },
  });

  if (!order) {
    return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
  }

  const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  if (!isValid) {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED" },
    });
    return NextResponse.json({ success: false, message: "Payment verification failed" }, { status: 400 });
  }

  // Successful payment: update order, auto-accept if configured, clear cart
  const restaurant = await prisma.restaurant.findFirst({ select: { autoAcceptOrders: true } });
  const autoAccept = restaurant?.autoAcceptOrders ?? false;

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        razorpayPaymentId,
        paymentStatus: "PAID",
        paidAt: new Date(),
        ...(autoAccept ? { status: "ACCEPTED" } : {}),
      },
    }),
    prisma.cartItem.deleteMany({
      where: { cart: { customerId } },
    }),
  ]);

  notifyCustomer(customerId, {
    type: "status_update",
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    status: updatedOrder.status,
    paymentStatus: updatedOrder.paymentStatus,
  });

  notifyAdmins({
    type: "order_update",
    order: {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    },
  });

  return NextResponse.json({
    success: true,
    order: {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      paymentStatus: updatedOrder.paymentStatus,
      status: updatedOrder.status,
      total: updatedOrder.total,
    },
  });
}
