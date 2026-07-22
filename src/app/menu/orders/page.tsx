import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";
import { redirect } from "next/navigation";
import OrdersTracker from "./components/OrdersTracker";

export default async function CustomerOrdersPage() {
  await connection();

  const customerId = await getCustomerId();
  if (!customerId) {
    redirect("/auth");
  }

  const orders = await prisma.order.findMany({
    where: { customerId },
    include: {
      address: true,
      orderItems: {
        include: { food: { select: { id: true, name: true, price: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const restaurant = await prisma.restaurant.findFirst({
    select: { restaurantName: true, currency: true },
  });

  return (
    <OrdersTracker
      initialOrders={JSON.parse(JSON.stringify(orders))}
      restaurantName={restaurant?.restaurantName ?? "Foodbot Kitchen"}
      currency={restaurant?.currency ?? "INR"}
    />
  );
}
