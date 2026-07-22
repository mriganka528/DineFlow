import { formatMoney } from "@/lib/currency";
import type { BillItem } from "./types";

/**
 * Itemised table of the invoice. Uses historical prices stored on OrderItem —
 * never the current Food price.
 */
export function BillItems({
  items,
  currency,
}: {
  items: BillItem[];
  currency: string;
}) {
  return (
    <div>
      <div className="my-4 border-t border-dashed border-zinc-300" />
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-400">
            <th className="pb-2 text-left font-semibold">Item</th>
            <th className="pb-2 text-center font-semibold">Qty</th>
            <th className="pb-2 text-right font-semibold">Rate</th>
            <th className="pb-2 text-right font-semibold">GST</th>
            <th className="pb-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-2 font-medium text-zinc-800">
                {item.name}
              </td>
              <td className="py-2 text-center tabular-nums text-zinc-600">
                {item.quantity}
              </td>
              <td className="py-2 text-right tabular-nums text-zinc-600">
                {formatMoney(item.price, currency)}
              </td>
              <td className="py-2 text-right tabular-nums text-zinc-600">
                {item.gst}%
              </td>
              <td className="py-2 text-right font-semibold tabular-nums text-zinc-900">
                {formatMoney(item.price * item.quantity, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
