import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/actions/settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import DashboardClient from "./components/DashboardClient";

export default async function DashboardPage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const [
    settings,
    totalOrders,
    todayOrders,
    totalRevenue,
    todayRevenue,
    ordersByStatus,
    recentOrders,
    topFoods,
    dailyOrders,
  ] = await Promise.all([
    getRestaurantSettings(),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "PAID" } }),
    prisma.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: todayStart }, paymentStatus: "PAID" },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        orderType: true,
        paymentMethod: true,
        paymentStatus: true,
        customer: { select: { name: true, phone: true } },
      },
    }),
    prisma.orderItem.groupBy({
      by: ["foodId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }).then(async (items) => {
      const foodIds = items.map((i) => i.foodId).filter((id): id is string => id !== null);
      const foods = await prisma.food.findMany({
        where: { id: { in: foodIds } },
        select: { id: true, name: true },
      });
      const foodMap = new Map(foods.map((f) => [f.id, f.name]));
      return items.map((i) => ({
        name: i.foodId ? foodMap.get(i.foodId) ?? "Unknown" : "Uncategorized",
        quantity: i._sum.quantity ?? 0,
      }));
    }),
    prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "Order"
      WHERE "createdAt" >= ${weekStart}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `.then((rows) =>
      rows.map((r) => ({
        date: new Date(r.date).toLocaleDateString("en-IN", { weekday: "short" }),
        orders: Number(r.count),
      })),
    ),
  ]);

  const statusDistribution = ordersByStatus.map((s) => ({
    name: s.status.replace(/_/g, " "),
    value: s._count.id,
  }));

  return (
    <DashboardClient
      currency={settings?.currency ?? DEFAULT_CURRENCY}
      metrics={{
        totalOrders,
        todayOrders,
        totalRevenue: totalRevenue._sum.total ?? 0,
        todayRevenue: todayRevenue._sum.total ?? 0,
      }}
      statusDistribution={statusDistribution}
      recentOrders={recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
        customerName: o.customer.name ?? o.customer.phone,
        orderType: o.orderType,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
      }))}
      topFoods={topFoods}
      dailyOrders={dailyOrders}
      restaurantName={settings?.restaurantName}
      logoUrl={settings?.logoUrl}
    />
  );
}
