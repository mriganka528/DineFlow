"use client";

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
import { ArrowRight, Coins, ShoppingBag, Sparkles, Users } from "lucide-react";
import { formatMoney, getCurrencySymbol } from "@/lib/currency";
import { AnalyticsFilters } from "./AnalyticsFilters";
import type { AnalyticsRangeKey } from "../range";

type AnalyticsProps = {
  currency: string;
  rangeKey: AnalyticsRangeKey;
  rangeLabel: string;
  from: string;
  to: string;
  revenueByDay: Array<{ date: string; revenue: number }>;
  ordersByPaymentMethod: Array<{ name: string; value: number }>;
  ordersByType: Array<{ name: string; value: number }>;
  topCategories: Array<{ name: string; quantity: number }>;
  avgOrderValue: number;
  totalCustomers: number;
  totalOrders: number;
};

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function AnalyticsClient({
  currency,
  rangeKey,
  rangeLabel,
  from,
  to,
  revenueByDay,
  ordersByPaymentMethod,
  ordersByType,
  topCategories,
  avgOrderValue,
  totalCustomers,
  totalOrders,
}: AnalyticsProps) {
  const totalRevenue = revenueByDay.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="rounded-2xl border border-border/60 bg-linear-to-br from-background via-card to-muted/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          Performance overview
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business insights for {rangeLabel.toLowerCase()} with a cleaner, more focused view.</p>
      </div>

      <AnalyticsFilters rangeKey={rangeKey} from={from} to={to} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Avg Order Value" value={formatMoney(avgOrderValue, currency, { decimals: 0 })} icon={<span className="text-sm font-semibold">{getCurrencySymbol(currency)}</span>} accent="from-emerald-500/20 to-emerald-600/20 border-emerald-400/70" />
        <SummaryCard title="Total Orders" value={totalOrders.toString()} icon={<ShoppingBag className="size-5" />} accent="from-blue-500/20 to-cyan-500/20 border-cyan-400/70" />
        <SummaryCard title="New Customers" value={totalCustomers.toString()} icon={<Users className="size-5" />} accent="from-pink-500/20 to-fuchsia-500/20 border-pink-400/70" />
        <SummaryCard title="Revenue" value={formatMoney(totalRevenue, currency, { decimals: 0 })} icon={<Coins className="size-5" />} accent="from-green-500/20 to-emerald-600/20 border-emerald-400/70" />
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold">Revenue Trend · {rangeLabel}</h2>
            <p className="text-sm text-muted-foreground">A clearer view of your sales momentum over time.</p>
          </div>
          <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Trending up</div>
        </div>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 256 }}>
            <AreaChart data={revenueByDay}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} />
              <YAxis axisLine={false} tickLine={false} fontSize={11} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} formatter={(value) => [formatMoney(Number(value), currency, { decimals: 0 }), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Payment Methods" subtitle="How customers are paying">
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 300, height: 192 }}>
              <PieChart>
                <Pie data={ordersByPaymentMethod} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {ordersByPaymentMethod.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ordersByPaymentMethod.length > 0 ? ordersByPaymentMethod.map((item, index) => (
              <span key={item.name} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                {item.name} ({item.value})
              </span>
            )) : <span className="text-sm text-muted-foreground">No payment data yet.</span>}
          </div>
        </ChartCard>

        <ChartCard title="Order Types" subtitle="How orders are being placed">
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 300, height: 192 }}>
              <PieChart>
                <Pie data={ordersByType} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {ordersByType.map((_, index) => (
                    <Cell key={index} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ordersByType.length > 0 ? ordersByType.map((item, index) => (
              <span key={item.name} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                {item.name} ({item.value})
              </span>
            )) : <span className="text-sm text-muted-foreground">No order-type data yet.</span>}
          </div>
        </ChartCard>

        <ChartCard title="Top Categories" subtitle="Best performing menu groups">
          <div className="h-48 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 300, height: 192 }}>
              <BarChart data={topCategories}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                <YAxis axisLine={false} tickLine={false} fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
                <Bar dataKey="quantity" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {topCategories.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No category performance data yet.</p>}
        </ChartCard>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, accent }: { title: string; value: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 p-5 shadow-[0_16px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className={`absolute inset-0 bg-linear-to-br ${accent} -z-10 rounded-2xl`} />
      <div className="absolute inset-0 bg-card/70 -z-10 rounded-2xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        <div className={`flex size-10 items-center justify-center rounded-xl border border-background/60 bg-background/70 ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">Updated for the selected range</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
