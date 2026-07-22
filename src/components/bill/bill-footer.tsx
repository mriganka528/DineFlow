import { BadgeCheck, Banknote, Clock3, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillData } from "./types";

const PAYMENT_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PAID: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200",
  PREPARING: "bg-indigo-100 text-indigo-800 border-indigo-200",
  READY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  COMPLETED: "bg-green-200 text-green-900 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

/**
 * Invoice footer: payment details, order status badge and thank-you note.
 * The bill is always shown regardless of payment state — a PENDING payment
 * simply renders a PENDING badge.
 */
export function BillFooter({ bill }: { bill: BillData }) {
  const { payment } = bill;
  const isPaid = payment.status === "PAID";

  return (
    <div>
      <div className="my-4 border-t border-dashed border-zinc-300" />

      {/* Payment info */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-zinc-500">
            {payment.method === "CASH" ? (
              <Banknote className="size-3.5" />
            ) : (
              <CreditCard className="size-3.5" />
            )}
            Payment Method
          </span>
          <span className="font-medium text-zinc-800">
            {payment.method === "CASH" ? "Cash" : "Online"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Payment Status</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
              PAYMENT_BADGE[payment.status] ?? PAYMENT_BADGE.PENDING,
            )}
          >
            {isPaid ? (
              <BadgeCheck className="size-3" />
            ) : (
              <Clock3 className="size-3" />
            )}
            {payment.status}
          </span>
        </div>
        {isPaid && payment.paidAt && (
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Paid At</span>
            <span className="font-medium text-zinc-800">
              {new Date(payment.paidAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        {payment.transactionId && (
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 text-zinc-500">Transaction ID</span>
            <span className="truncate font-mono text-[10px] text-zinc-700">
              {payment.transactionId}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Order Status</span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold",
              STATUS_BADGE[bill.orderStatus] ?? STATUS_BADGE.PENDING,
            )}
          >
            {bill.orderStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-zinc-300" />

      <p className="text-center text-[11px] text-zinc-400">
        Thank you for dining with {bill.restaurant.name}!
        <br />
        This is a computer generated invoice.
      </p>
      <p className="mt-2 text-center text-[10px] font-medium text-zinc-300">
        Powered by DineFlow
      </p>
    </div>
  );
}
