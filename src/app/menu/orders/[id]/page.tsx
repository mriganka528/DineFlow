import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import OrderDetail from "./components/OrderDetail";
import type { BillData } from "@/components/bill";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await connection();

  const customerId = await getCustomerId();
  if (!customerId) {
    redirect(`/auth?redirect=/menu/orders/${id}`);
  }

  // Single optimized query for the order graph; restaurant has no relation to
  // Order so it's fetched in parallel.
  const [order, restaurant] = await Promise.all([
    prisma.order.findFirst({
      where: { id, customerId },
      include: {
        customer: { select: { name: true, phone: true } },
        address: true,
        orderItems: {
          include: { food: { select: { id: true, name: true, price: true } } },
        },
      },
    }),
    prisma.restaurant.findFirst({
      select: {
        restaurantName: true,
        tagline: true,
        logoUrl: true,
        averagePrepTime: true,
        phone: true,
        email: true,
        address: true,
        currency: true,
      },
    }),
  ]);

  if (!order) {
    notFound();
  }

  const deliveryAddress = order.address
    ? [
        order.address.houseNo,
        order.address.street,
        order.address.area,
        order.address.city,
        order.address.state,
        order.address.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  // The invoice is sourced from Order/OrderItem values persisted at checkout —
  // never recalculated from the current Food table. It exists as soon as the
  // order is created and does not depend on payment completion.
  const bill: BillData = {
    invoiceNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    orderType: order.orderType,
    tableNumber: order.tableNumber,
    deliveryAddress,
    orderStatus: order.status,
    restaurant: {
      name: restaurant?.restaurantName ?? "Dine Flow Kitchen",
      tagline: restaurant?.tagline ?? null,
      logoUrl: restaurant?.logoUrl ?? null,
      address: restaurant?.address ?? "",
      phone: restaurant?.phone ?? "",
      email: restaurant?.email ?? "",
      currency: restaurant?.currency ?? "INR",
    },
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
    },
    payment: {
      method: order.paymentMethod,
      status: order.paymentStatus,
      paidAt: order.paidAt?.toISOString() ?? null,
      transactionId: order.razorpayPaymentId,
    },
    items: order.orderItems.map((item) => ({
      id: item.id,
      name: item.foodName,
      quantity: item.quantity,
      price: item.price,
      gst: item.gst,
    })),
    subtotal: order.subtotal,
    gstAmount: order.gstAmount,
    serviceCharge: order.serviceCharge,
    total: order.total,
  };

  return (
    <OrderDetail
      initialOrder={JSON.parse(JSON.stringify(order))}
      restaurant={{
        name: restaurant?.restaurantName ?? "Dine Flow Kitchen",
        prepTime: restaurant?.averagePrepTime ?? 20,
        phone: restaurant?.phone ?? "",
        address: restaurant?.address ?? "",
        currency: restaurant?.currency ?? "INR",
      }}
      bill={bill}
    />
  );
}
