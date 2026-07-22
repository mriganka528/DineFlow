"use client";

import Image from "next/image";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Clock3,
  DollarSign,
  Package,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatMoney } from "@/lib/currency";

type DashboardProps = {
  currency: string;
  metrics: {
    totalOrders: number;
    todayOrders: number;
    totalRevenue: number;
    todayRevenue: number;
  };
  statusDistribution: Array<{ name: string; value: number }>;
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    total: number;
    createdAt: string;
    customerName: string;
    orderType?: string;
    paymentMethod?: string;
    paymentStatus?: string;
  }>;
  topFoods: Array<{ name: string; quantity: number }>;
  dailyOrders: Array<{ date: string; orders: number }>;
  restaurantName?: string;
  logoUrl?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  ACCEPTED: "#3b82f6",
  PREPARING: "#f97316",
  READY: "#8b5cf6",
  OUT_FOR_DELIVERY: "#06b6d4",
  DELIVERED: "#10b981",
  COMPLETED: "#16a34a",
  CANCELLED: "#ef4444",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  ACCEPTED: "border-sky-200 bg-sky-50 text-sky-700",
  PREPARING: "border-orange-200 bg-orange-50 text-orange-700",
  READY: "border-violet-200 bg-violet-50 text-violet-700",
  OUT_FOR_DELIVERY: "border-cyan-200 bg-cyan-50 text-cyan-700",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-green-200 bg-green-50 text-green-700",
  CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
};

const PAYMENT_BADGE_CLASS: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  REFUNDED: "border-slate-200 bg-slate-50 text-slate-700",
};

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#6366f1", "#10b981", "#8b5cf6", "#22c55e", "#16a34a", "#ef4444"];

function getStatusKey(status: string) {
  return status.replace(/\s+/g, "_").toUpperCase();
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPaymentLabel(value?: string) {
  return value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Pending";
}

export default function DashboardClient({
  currency,
  metrics,
  statusDistribution,
  recentOrders,
  topFoods,
  dailyOrders,
  restaurantName,
  logoUrl,
}: DashboardProps) {
  const activeOrders = statusDistribution.reduce((sum, item) => {
    const statusKey = getStatusKey(item.name);
    if (["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(statusKey)) {
      sum += item.value;
    }
    return sum;
  }, 0);

  const averageOrderValue = metrics.totalOrders > 0 ? metrics.totalRevenue / metrics.totalOrders : 0;
  const topSellingFood = topFoods[0];
  const lowestSellingFood = [...topFoods].sort((a, b) => a.quantity - b.quantity)[0];

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 sm:space-y-6 sm:px-6 md:space-y-6 md:px-8 lg:px-0">
      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-linear-to-br from-background via-card to-muted/30 p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-primary">
              <Sparkles className="size-4 shrink-0" />
              Kitchen pulse
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {restaurantName || "Dashboard"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">A clearer view of your restaurant operations and customer activity.</p>
          </div>
          {logoUrl && (
            <div className="shrink-0">
              <Image
                src={logoUrl}
                alt={restaurantName || "Restaurant logo"}
                width={60}
                height={60}
                className="rounded-full object-cover ring-2 ring-white/50 shadow-lg"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders.toString()}
          icon={<ShoppingCart className="size-5" />}
          accent="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/70"
        />
        <MetricCard
          title="Today's Orders"
          value={metrics.todayOrders.toString()}
          icon={<Package className="size-5" />}
          accent="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border-cyan-400/70"
        />
        <MetricCard
          title="Total Revenue"
          value={formatMoney(metrics.totalRevenue, currency, { decimals: 0 })}
          icon={<DollarSign className="size-5" />}
          accent="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-400/70"
        />
        <MetricCard
          title="Today's Revenue"
          value={formatMoney(metrics.todayRevenue, currency, { decimals: 0 })}
          icon={<TrendingUp className="size-5" />}
          accent="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/70"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Orders This Week</h2>
              <p className="text-sm text-muted-foreground">Trend of daily order activity.</p>
            </div>
            <div className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Live traffic</div>
          </div>
          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 400, height: 240 }}>
              <AreaChart data={dailyOrders}>
                <defs>
                  <linearGradient id="orderGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                <Area type="monotone" dataKey="orders" stroke="#f59e0b" strokeWidth={2.5} fill="url(#orderGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Order Status Distribution</h2>
              <p className="text-sm text-muted-foreground">Current workload at a glance.</p>
            </div>
            <div className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">Balanced mix</div>
          </div>
          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 400, height: 240 }}>
              <PieChart>
                <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={46} outerRadius={78} paddingAngle={2} dataKey="value">
                  {statusDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[getStatusKey(entry.name)] ?? PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusDistribution.map((entry, index) => (
              <span key={entry.name} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[getStatusKey(entry.name)] ?? PIE_COLORS[index % PIE_COLORS.length] }} />
                {entry.name} ({entry.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Quick Insights</h2>
              <p className="text-sm text-muted-foreground">Highlights from your current dashboard view.</p>
            </div>
            <div className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">Snapshot</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InsightCard title="Highest Selling Food" value={topSellingFood?.name ?? "No data"} hint={topSellingFood ? `${topSellingFood.quantity} sold` : "Add orders to see trends"} accent="from-yellow-500/20 to-amber-500/20" />
            <InsightCard title="Lowest Selling Food" value={lowestSellingFood?.name ?? "No data"} hint={lowestSellingFood ? `${lowestSellingFood.quantity} sold` : "Add orders to see trends"} accent="from-slate-500/20 to-gray-500/20" />
            <InsightCard title="Active Orders" value={activeOrders.toString()} hint="Pending, accepted, preparing, or ready" accent="from-sky-500/20 to-cyan-500/20" />
            <InsightCard title="Average Order Value" value={formatMoney(averageOrderValue, currency, { decimals: 0 })} hint="Revenue divided by total orders" accent="from-emerald-500/20 to-teal-500/20" />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Recent Orders</h2>
              <p className="text-sm text-muted-foreground">Latest customer activity, styled for quick scanning.</p>
            </div>
            <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Fresh</div>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const normalizedStatus = getStatusKey(order.status);
              return (
                <div key={order.id} className="rounded-2xl border border-border/60 bg-background/80 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">#{order.orderNumber}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_CLASS[normalizedStatus] ?? "border-border bg-muted text-muted-foreground"}`}>
                          {formatStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{order.customerName}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full border border-border/60 bg-background px-2 py-0.5">{formatPaymentLabel(order.orderType)}</span>
                        <span className={`rounded-full border px-2 py-0.5 ${PAYMENT_BADGE_CLASS[getStatusKey(order.paymentStatus ?? "PENDING")] ?? "border-border bg-muted text-muted-foreground"}`}>
                          {formatPaymentLabel(order.paymentStatus)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatMoney(order.total, currency, { decimals: 0 })}</p>
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="size-3" />
                        {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: "numeric", minute: "2-digit", hour12: true })}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-1.5">
                      {(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"] as const).map((step) => {
                        const isActive = ["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].indexOf(normalizedStatus) >= ["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].indexOf(step);
                        return (
                          <span key={step} className={`h-2 flex-1 rounded-full ${isActive ? "bg-primary" : "bg-border"}`} />
                        );
                      })}
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
            {recentOrders.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center text-sm text-muted-foreground">
                No orders have been created yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h2 className="mb-4 text-sm font-semibold">Top Selling Items</h2>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 400, height: 224 }}>
              <BarChart data={topFoods} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} allowDecimals={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={100} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                <Bar dataKey="quantity" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold">Customer & Revenue Pulse</h2>
              <p className="text-sm text-muted-foreground">A quick read on overall demand.</p>
            </div>
            <div className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">Growing</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-cyan-100 bg-linear-to-br from-cyan-50/80 to-white p-4">
              <div className="flex items-center gap-2 text-cyan-700">
                <Users className="size-4" />
                <span className="text-sm font-medium">Customers</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{metrics.totalOrders}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tracked order activity</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50/80 to-white p-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <DollarSign className="size-4" />
                <span className="text-sm font-medium">Revenue</span>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{formatMoney(metrics.todayRevenue, currency, { decimals: 0 })}</p>
              <p className="mt-1 text-sm text-muted-foreground">Today’s confirmed revenue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  accent: string
}) {
  return (
    <div className={`group relative rounded-2xl border p-5 shadow-[0_16px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-lg overflow-hidden`}>
      {/* Gradient background */}
      <div className={`absolute inset-0 ${accent} -z-10 rounded-2xl`} />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-card/70 -z-10 rounded-2xl" />
      
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        <div className={`flex size-10 items-center justify-center rounded-xl border ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">Updated in real time</p>
    </div>
  );
}

function InsightCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  accent: string;
}) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-linear-to-br ${accent} p-4`}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
