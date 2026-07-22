"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  Clock,
  CreditCard,
  Package,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { useOrderUpdates } from "@/lib/useOrderUpdates";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  food: { id: string; name: string; price: number };
};

type Address = {
  houseNo: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  label: string | null;
};

type Order = {
  id: string;
  orderNumber: number;
  orderType: "DINE_IN" | "DELIVERY";
  tableNumber: number | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtotal: number;
  gstAmount: number;
  serviceCharge: number;
  total: number;
  createdAt: string;
  address: Address | null;
  orderItems: OrderItem[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200",
  PREPARING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  READY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  COMPLETED: "bg-green-200 text-green-900 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-gray-100 text-gray-800 border-gray-200",
};

const ACTIVE_STATUSES = new Set(["PENDING", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY"]);

export default function OrdersTracker({
  initialOrders,
  restaurantName,
  currency,
}: {
  initialOrders: Order[];
  restaurantName: string;
  currency: string;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  useOrderUpdates((event) => {
    if (event.type === "status_update" && event.orderId) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === event.orderId
            ? {
                ...o,
                status: event.status ?? o.status,
                paymentStatus: event.paymentStatus ?? o.paymentStatus,
              }
            : o,
        ),
      );
    }
    if (event.type === "init") {
      const initOrders = (event as unknown as { orders: { id: string; status: string; paymentStatus: string }[] }).orders;
      if (initOrders) {
        setOrders((prev) =>
          prev.map((o) => {
            const match = initOrders.find((io) => io.id === o.id);
            return match
              ? { ...o, status: match.status, paymentStatus: match.paymentStatus }
              : o;
          }),
        );
      }
    }
  });

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const pastOrders = orders.filter((o) => !ACTIVE_STATUSES.has(o.status));

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-slate-50/50 pb-12 text-foreground">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <Link href="/menu">
            <Button variant="ghost" size="icon" className="size-9 rounded-full">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">My Orders</h1>
            <p className="text-xs text-muted-foreground">{restaurantName}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {orders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/80 px-6 py-16 text-center">
            <Package className="mx-auto size-10 text-zinc-300" />
            <h3 className="mt-4 text-lg font-bold text-zinc-800">
              No orders yet
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Place your first order from the menu!
            </p>
            <Link href="/menu">
              <Button className="mt-4 rounded-full bg-amber-500 font-semibold text-zinc-900 hover:bg-amber-400">
                Browse menu
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <section>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                  </span>
                  Active Orders
                </h2>
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <OrderCard key={order.id} order={order} currency={currency} isActive />
                  ))}
                </div>
              </section>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-zinc-500">
                  Past Orders
                </h2>
                <div className="space-y-3 ">
                  {pastOrders.map((order) => (
                    <OrderCard key={order.id} order={order} currency={currency} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function OrderCard({ order, isActive, currency }: { order: Order; isActive?: boolean; currency: string }) {
  return (
    <Link href={`/menu/orders/${order.id}`} className="block">
      <div
        className={cn(
          "group overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md",
          isActive && "ring-2 ring-amber-200/60",
        )}
      >
        <div className="flex items-center justify-between gap-3 p-4">
          {/* Left: Order info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                isActive ? "bg-amber-50 text-amber-600" : "bg-zinc-100 text-zinc-500",
              )}
            >
              {order.orderType === "DINE_IN" ? (
                <Store className="size-4" />
              ) : (
                <Bike className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-zinc-900">
                  Order #{order.orderNumber}
                </p>
                {isActive && (
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                <span className="mx-1">·</span>
                <CreditCard className="size-3" />
                {order.paymentMethod}
              </div>
            </div>
          </div>

          {/* Right: Status + total + arrow */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-sm font-bold text-zinc-900">
                {formatMoney(order.total, currency)}
              </p>
              <div className="mt-1 flex items-center gap-1.5 justify-end">
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    STATUS_COLORS[order.status],
                  )}
                >
                  {order.status.replace(/_/g, " ")}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    PAYMENT_COLORS[order.paymentStatus],
                  )}
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
