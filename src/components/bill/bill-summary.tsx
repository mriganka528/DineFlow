import { formatMoney } from "@/lib/currency";
import type { BillData } from "./types";

/**
 * Totals block: subtotal, GST, service charge and grand total. Reads the
 * amounts persisted on the Order — no recalculation.
 */
export function BillSummary({ bill }: { bill: BillData }) {
  const currency = bill.restaurant.currency;

  return (
    <div>
      <div className="my-4 border-t border-dashed border-zinc-300" />
      <div className="space-y-1.5 text-xs">
        <Row label="Subtotal" value={formatMoney(bill.subtotal, currency)} />
        <Row label="GST" value={formatMoney(bill.gstAmount, currency)} />
        {bill.serviceCharge > 0 && (
          <Row
            label="Service Charge"
            value={formatMoney(bill.serviceCharge, currency)}
          />
        )}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2.5 text-white">
        <span className="text-xs font-semibold uppercase tracking-wider">
          Grand Total
        </span>
        <span className="text-base font-bold tabular-nums">
          {formatMoney(bill.total, currency)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium tabular-nums text-zinc-800">{value}</span>
    </div>
  );
}
