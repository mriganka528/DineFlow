"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  Check,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  Star,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { useOrderUpdates } from "@/lib/useOrderUpdates";
import { BillActions, type BillData } from "@/components/bill";
import api from "@/lib/api";
import toast from "react-hot-toast";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  gst: number;
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

const STATUS_STEPS = [
  { key: "PENDING", label: "Placed" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "OUT_FOR_DELIVERY", label: "On the way" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "COMPLETED", label: "Completed" },
];

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

function StatusTimeline({ status, orderType }: { status: string; orderType: string }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-red-500 text-white">
          <span className="text-sm font-bold">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-800">Order Cancelled</p>
          <p className="text-xs text-red-600">This order has been cancelled</p>
        </div>
      </div>
    );
  }

  const steps = orderType === "DINE_IN"
    ? STATUS_STEPS.filter((s) => s.key !== "OUT_FOR_DELIVERY")
    : STATUS_STEPS;

  const filteredSteps = status === "COMPLETED" || status === "DELIVERED"
    ? steps
    : steps.filter((s) => s.key !== "COMPLETED");

  const statusKeys = filteredSteps.map((s) => s.key);
  const currentIdx = statusKeys.indexOf(status);

  return (
    <div className="space-y-0">
      {filteredSteps.map((step, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isPending = i > currentIdx;
        return (
          <div key={step.key} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-all",
                  isDone && "border-emerald-500 bg-emerald-500 text-white",
                  isCurrent && "border-amber-500 bg-amber-500 text-white ring-4 ring-amber-100",
                  isPending && "border-zinc-200 bg-zinc-50 text-zinc-300",
                )}
              >
                {isDone ? (
                  <Check className="size-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </div>
              {i < filteredSteps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-6",
                    isDone ? "bg-emerald-400" : "bg-zinc-200",
                  )}
                />
              )}
            </div>
            <div className={cn("pb-6", i === filteredSteps.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium leading-8",
                  isDone && "text-emerald-700",
                  isCurrent && "text-amber-700 font-semibold",
                  isPending && "text-zinc-400",
                )}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetail({
  initialOrder,
  restaurant,
  bill,
}: {
  initialOrder: Order;
  restaurant: { name: string; prepTime: number; phone: string; address: string; currency: string };
  bill: BillData;
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const currency = restaurant.currency;

  useOrderUpdates((event) => {
    if (event.type === "status_update" && event.orderId === order.id) {
      setOrder((prev) => ({
        ...prev,
        status: event.status ?? prev.status,
        paymentStatus: event.paymentStatus ?? prev.paymentStatus,
      }));
    }
  });

  // Keep the invoice's status badges in sync with live SSE updates. All
  // monetary values remain the historical ones persisted on the order.
  const liveBill: BillData = {
    ...bill,
    orderStatus: order.status,
    payment: { ...bill.payment, status: order.paymentStatus },
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-amber-50/80 via-white to-slate-50/50 pb-12 text-foreground">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/menu/orders">
              <Button variant="ghost" size="icon" className="size-9 rounded-full">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">
                Order #{order.orderNumber}
              </h1>
              <p className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <Link href="/menu">
            <Button size="sm" variant="outline" className="rounded-full text-xs">
              Back to Menu
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 space-y-5">
        {/* Status & Payment Badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              STATUS_COLORS[order.status],
            )}
          >
            <span className="relative flex size-2">
              {order.status !== "COMPLETED" && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-40" />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
            {order.status.replace(/_/g, " ")}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              PAYMENT_COLORS[order.paymentStatus],
            )}
          >
            <CreditCard className="size-3" />
            {order.paymentStatus} ({order.paymentMethod})
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
            {order.orderType === "DINE_IN" ? (
              <>
                <UtensilsCrossed className="size-3" />
                Dine In{order.tableNumber ? ` - Table #${order.tableNumber}` : ""}
              </>
            ) : (
              <>
                <Bike className="size-3" />
                Delivery
              </>
            )}
          </span>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Order Progress</h2>
          <StatusTimeline status={order.status} orderType={order.orderType} />
        </div>

        {/* Invoice / Bill */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Invoice</h2>
            <span className="text-xs text-muted-foreground">
              #{order.orderNumber}
            </span>
          </div>
          <BillActions bill={liveBill} />
        </div>

        {/* Items */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Items Ordered</h2>
          <div className="divide-y">
            {order.orderItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-xs font-bold text-amber-700">
                    {item.quantity}x
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{item.food.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(item.price, currency)} each
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  {formatMoney(item.price * item.quantity, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Bill Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>GST</span>
              <span>{formatMoney(order.gstAmount, currency)}</span>
            </div>
            {order.serviceCharge > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Service Charge</span>
                <span>{formatMoney(order.serviceCharge, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold text-zinc-900">
              <span>Total</span>
              <span>{formatMoney(order.total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.address && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Delivery Address</h2>
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <MapPin className="size-4" />
              </div>
              <div>
                {order.address.label && (
                  <p className="text-sm font-semibold text-zinc-800">{order.address.label}</p>
                )}
                <p className="text-sm text-zinc-600">
                  {[
                    order.address.houseNo,
                    order.address.street,
                    order.address.area,
                    order.address.city,
                    order.address.state,
                    order.address.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Info */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Restaurant</h2>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Store className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">{restaurant.name}</p>
                <p className="text-xs text-muted-foreground">{restaurant.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                ~{restaurant.prepTime} min prep time
              </span>
              {restaurant.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {restaurant.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating Section */}
        {["DELIVERED", "COMPLETED"].includes(order.status) && (
          <RatingSection orderId={order.id} items={order.orderItems} />
        )}
      </div>
    </main>
  );
}

function RatingSection({ orderId, items }: { orderId: string; items: OrderItem[] }) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, { average: number; count: number }>>({});

  const loadStats = useCallback(async () => {
    const uniqueFoodIds = Array.from(new Set(items.map((i) => i.food.id)));
    const results = await Promise.all(
      uniqueFoodIds.map((foodId) =>
        api
          .get(`/api/ratings?foodId=${foodId}`)
          .then(({ data }) => [foodId, { average: data.average ?? 0, count: data.count ?? 0 }] as const)
          .catch(() => [foodId, { average: 0, count: 0 }] as const),
      ),
    );
    setStats(Object.fromEntries(results));
  }, [items]);

  useEffect(() => {
    api.get(`/api/ratings?orderId=${orderId}`).then(({ data }) => {
      if (data.ratings) {
        const existingRatings: Record<string, number> = {};
        const existingReviews: Record<string, string> = {};
        const alreadySubmitted = new Set<string>();
        for (const r of data.ratings) {
          existingRatings[r.foodId] = r.stars;
          if (r.review) existingReviews[r.foodId] = r.review;
          alreadySubmitted.add(r.foodId);
        }
        setRatings(existingRatings);
        setReviews(existingReviews);
        setSubmitted(alreadySubmitted);
      }
    }).catch(() => {});
    void loadStats();
  }, [orderId, loadStats]);

  const submitRating = async (foodId: string) => {
    const stars = ratings[foodId];
    if (!stars) return;
    setSubmitting(foodId);
    try {
      await api.post("/api/ratings", {
        foodId,
        orderId,
        stars,
        review: reviews[foodId] || null,
      });
      setSubmitted((prev) => new Set(prev).add(foodId));
      toast.success("Rating submitted!");
      void loadStats();
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900">Rate Your Food</h2>
      <div className="space-y-4">
        {items.map((item) => {
          const foodStats = stats[item.food.id];
          return (
          <div key={item.id} className="space-y-2 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-zinc-800">{item.food.name}</p>
                {foodStats && foodStats.count > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    {foodStats.average.toFixed(1)} • {foodStats.count}{" "}
                    {foodStats.count === 1 ? "Review" : "Reviews"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                    <Star className="size-3 opacity-40" />
                    Not Rated Yet
                  </span>
                )}
              </div>
              {submitted.has(item.food.id) && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <Check className="size-3" /> Rated
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setRatings((prev) => ({ ...prev, [item.food.id]: star }))
                  }
                  disabled={submitted.has(item.food.id)}
                  className="transition-transform hover:scale-110 disabled:cursor-default"
                >
                  <Star
                    className={cn(
                      "size-5",
                      (ratings[item.food.id] ?? 0) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-300",
                    )}
                  />
                </Button>
              ))}
            </div>
            {!submitted.has(item.food.id) && ratings[item.food.id] && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional review..."
                  value={reviews[item.food.id] ?? ""}
                  onChange={(e) =>
                    setReviews((prev) => ({ ...prev, [item.food.id]: e.target.value }))
                  }
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-200"
                />
                <Button
                  size="sm"
                  onClick={() => submitRating(item.food.id)}
                  disabled={submitting === item.food.id}
                  className="h-8 rounded-lg bg-amber-500 text-xs font-semibold text-zinc-900 hover:bg-amber-400"
                >
                  {submitting === item.food.id ? "..." : "Submit"}
                </Button>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
