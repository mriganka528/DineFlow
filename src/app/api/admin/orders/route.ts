import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/app/api/admin/orders/stream/route";
import { requireAdminSession } from "@/lib/admin-token";
import { notifyCustomer } from "../../orders/stream/route";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const paymentStatus = searchParams.get("paymentStatus");
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where: Record<string, unknown> = {};

  if (status && status !== "ALL") {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== "ALL") {
    where.paymentStatus = paymentStatus;
  }

  if (search) {
    const orderNum = Number(search);
    if (!isNaN(orderNum)) {
      where.orderNumber = orderNum;
    } else {
      where.customer = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      };
    }
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        address: true,
        orderItems: {
          include: { food: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  const status = body?.status;
  const paymentStatus = body?.paymentStatus;

  if (!orderId) {
    return NextResponse.json({ success: false, message: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
  }

  const validStatuses = [
    "PENDING", "ACCEPTED", "PREPARING", "READY",
    "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED",
  ];
  const validPaymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"];

  const data: Record<string, unknown> = {};

  if (status && validStatuses.includes(status)) {
    data.status = status;
  }

  if (paymentStatus && validPaymentStatuses.includes(paymentStatus)) {
    data.paymentStatus = paymentStatus;
    if (paymentStatus === "PAID" && !order.paidAt) {
      data.paidAt = new Date();
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 });
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      address: true,
      orderItems: {
        include: { food: { select: { id: true, name: true } } },
      },
    },
  });

  if (data.status || data.paymentStatus) {
    notifyCustomer(updatedOrder.customerId, {
      type: "status_update",
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    });
  }

  notifyAdmins({
    type: "order_update",
    order: {
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      paymentStatus: updatedOrder.paymentStatus,
    },
  });

  return NextResponse.json({ success: true, order: updatedOrder });
}
