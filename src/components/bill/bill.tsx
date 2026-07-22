import { forwardRef } from "react";
import { BillHeader } from "./bill-header";
import { BillItems } from "./bill-items";
import { BillSummary } from "./bill-summary";
import { BillFooter } from "./bill-footer";
import type { BillData } from "./types";

/**
 * The full invoice, POS-receipt style. Forwarded ref so react-to-print can
 * print exactly this node and nothing else.
 */
export const Bill = forwardRef<HTMLDivElement, { bill: BillData }>(
  function Bill({ bill }, ref) {
    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-md bg-white p-5 font-sans text-zinc-900 print:max-w-none print:p-8"
      >
        <BillHeader bill={bill} />
        <BillItems items={bill.items} currency={bill.restaurant.currency} />
        <BillSummary bill={bill} />
        <BillFooter bill={bill} />
      </div>
    );
  },
);
