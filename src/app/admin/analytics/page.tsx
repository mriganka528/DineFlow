import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/actions/settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import AnalyticsClient from "./components/AnalyticsClient";
import { resolveAnalyticsRange, type AnalyticsRangeKey } from "./range";

type SearchParams = Promise<{ range?: string; from?: string; to?: string }>;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { key, start, end, label } = resolveAnalyticsRange(
    params.range as AnalyticsRangeKey | undefined,
    params.from,
    params.to,
  );

  const [
    settings,
    revenueByDay,
    ordersByPaymentMethod,
    ordersByType,
    topCategories,
    avgOrderValue,
    totalCustomers,
    totalOrders,
  ] = await Promise.all([
    getRestaurantSettings(),
    prisma.$queryRaw<Array<{ date: string; revenue: number }>>`
      SELECT DATE("createdAt") as date, COALESCE(SUM(total), 0)::float as revenue
      FROM "Order"
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} AND "paymentStatus" = 'PAID'
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `.then((rows) =>
      rows.map((r) => ({
        date: new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        revenue: Number(r.revenue),
      })),
    ),
    prisma.order.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }).then((rows) =>
      rows.map((r) => ({ name: r.paymentMethod, value: r._count.id })),
    ),
    prisma.order.groupBy({
      by: ["orderType"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }).then((rows) =>
      rows.map((r) => ({ name: r.orderType.replace(/_/g, " "), value: r._count.id })),
    ),
    prisma.orderItem.groupBy({
      by: ["foodId"],
      where: { order: { createdAt: { gte: start, lte: end } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }).then(async (items) => {
      const foodIds = items.map((i) => i.foodId).filter((id): id is string => id !== null);
      const foods = await prisma.food.findMany({
        where: { id: { in: foodIds } },
        select: { id: true, name: true, category: { select: { name: true } } },
      });
      const foodMap = new Map(foods.map((f) => [f.id, f]));
      const categoryTotals: Record<string, number> = {};
      for (const item of items) {
        if (item.foodId === null) {
          categoryTotals["Uncategorized"] = (categoryTotals["Uncategorized"] ?? 0) + (item._sum.quantity ?? 0);
          continue;
        }
        const food = foodMap.get(item.foodId);
        const catName = food?.category?.name ?? "Uncategorized";
        categoryTotals[catName] = (categoryTotals[catName] ?? 0) + (item._sum.quantity ?? 0);
      }
      return Object.entries(categoryTotals)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity);
    }),
    prisma.order.aggregate({
      _avg: { total: true },
      where: { paymentStatus: "PAID", createdAt: { gte: start, lte: end } },
    }),
    prisma.customer.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
  ]);

  return (
    <AnalyticsClient
      currency={settings?.currency ?? DEFAULT_CURRENCY}
      rangeKey={key}
      rangeLabel={label}
      from={params.from ?? ""}
      to={params.to ?? ""}
      revenueByDay={revenueByDay}
      ordersByPaymentMethod={ordersByPaymentMethod}
      ordersByType={ordersByType}
      topCategories={topCategories}
      avgOrderValue={avgOrderValue._avg.total ?? 0}
      totalCustomers={totalCustomers}
      totalOrders={totalOrders}
    />
  );
}
