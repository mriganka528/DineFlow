"use client";

import { useRef, useState } from "react";
import { Download, Printer, ReceiptText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bill } from "./bill";
import type { BillData } from "./types";

/**
 * Invoice actions: View Bill (responsive dialog), Download PDF and Print.
 * The bill is available for any created order — payment completion is NOT
 * required.
 */
export function BillActions({ bill }: { bill: BillData }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Invoice-${bill.invoiceNumber}`,
  });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Lazy-load the PDF renderer only when the user actually downloads.
      const [{ pdf }, { BillPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./bill-pdf"),
      ]);
      const blob = await pdf(<BillPDF bill={bill} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${bill.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          className="h-9 rounded-xl text-xs font-semibold"
          onClick={() => setOpen(true)}
        >
          <ReceiptText className="size-3.5" />
          View Bill
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-xl text-xs font-semibold"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download className="size-3.5" />
          {downloading ? "..." : "Download "}
        </Button>
        <Button
          variant="outline"
          className="h-9 rounded-xl text-xs font-semibold"
          onClick={() => handlePrint()}
        >
          <Printer className="size-3.5" />
          Print Bill
        </Button>
      </div>

      {/* Hidden printable copy — react-to-print prints only this node. */}
      <div className="hidden">
        <Bill ref={printRef} bill={bill} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Invoice #{bill.invoiceNumber}</DialogTitle>
            <DialogDescription>
              Invoice for order #{bill.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:max-h-[calc(90vh-4.5rem)]">
            <Bill bill={bill} />
          </div>
          <div className="flex gap-2 border-t bg-muted/50 p-3 sm:rounded-b-2xl">
            <Button
              variant="outline"
              className="h-9 flex-1 rounded-xl text-xs font-semibold"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="size-3.5" />
              {downloading ? "Generating..." : "Download PDF"}
            </Button>
            <Button
              className="h-9 flex-1 rounded-xl text-xs font-semibold"
              onClick={() => handlePrint()}
            >
              <Printer className="size-3.5" />
              Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
