import { Mail, MapPin, Phone, ReceiptText } from "lucide-react";
/* eslint-disable @next/next/no-img-element -- invoice logo must render in print/PDF contexts without next/image optimization */
import type { BillData } from "./types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Invoice header: restaurant branding + invoice meta + customer / order info.
 */
export function BillHeader({ bill }: { bill: BillData }) {
  const { restaurant } = bill;

  return (
    <div>
      {/* Restaurant branding */}
      <div className="flex flex-col items-center gap-2 text-center">
        {restaurant.logoUrl ? (
          <img
            src={restaurant.logoUrl}
            alt={restaurant.name}
            className="size-14 rounded-full object-cover ring-1 ring-zinc-200"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <ReceiptText className="size-6" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">
            {restaurant.name}
          </h2>
          {restaurant.tagline && (
            <p className="text-xs text-zinc-500">{restaurant.tagline}</p>
          )}
        </div>
        <div className="space-y-0.5 text-[11px] leading-relaxed text-zinc-500">
          {restaurant.address && (
            <p className="flex items-center justify-center gap-1">
              <MapPin className="size-3 shrink-0" />
              {restaurant.address}
            </p>
          )}
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
            {restaurant.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3 shrink-0" />
                {restaurant.phone}
              </span>
            )}
            {restaurant.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3 shrink-0" />
                {restaurant.email}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Separator */}
      <div className="my-4 border-t border-dashed border-zinc-300" />

      {/* Invoice meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Meta label="Invoice No." value={`#${bill.invoiceNumber}`} strong />
        <Meta label="Date" value={formatDate(bill.createdAt)} />
        <Meta label="Time" value={formatTime(bill.createdAt)} />
        <Meta
          label="Order Type"
          value={bill.orderType === "DINE_IN" ? "Dine In" : "Delivery"}
        />
        {bill.orderType === "DINE_IN" && bill.tableNumber != null && (
          <Meta label="Table" value={`#${bill.tableNumber}`} />
        )}
        <Meta label="Customer" value={bill.customer.name ?? "Guest"} />
        <Meta label="Phone" value={bill.customer.phone} />
      </div>

      {bill.orderType === "DELIVERY" && bill.deliveryAddress && (
        <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
          <span className="font-semibold text-zinc-700">Deliver to: </span>
          {bill.deliveryAddress}
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span
        className={
          strong ? "font-bold text-zinc-900" : "font-medium text-zinc-800"
        }
      >
        {value}
      </span>
    </div>
  );
}
