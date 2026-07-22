"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BillData } from "./types";

// @react-pdf's built-in fonts (Helvetica) only cover WinAnsi glyphs, so
// currency symbols like ₹ can't be rendered. Amounts are therefore prefixed
// with the ISO currency code — no runtime font downloads required.
function money(amount: number, currency: string) {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${value.toFixed(2)}`;
}

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

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  center: { alignItems: "center" },
  restaurantName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  muted: { color: "#71717a" },
  small: { fontSize: 8, color: "#71717a" },
  dashed: {
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d8",
    borderStyle: "dashed",
    marginVertical: 10,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  metaCell: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingRight: 12,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  addressBox: {
    marginTop: 6,
    backgroundColor: "#fafafa",
    borderRadius: 4,
    padding: 6,
    fontSize: 8,
    color: "#52525b",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingBottom: 4,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f4f4f5",
    paddingVertical: 4,
  },
  colItem: { flex: 4 },
  colQty: { flex: 1, textAlign: "center" },
  colRate: { flex: 2, textAlign: "right" },
  colGst: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 2, textAlign: "right" },
  headerCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#a1a1aa",
    textTransform: "uppercase",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#18181b",
    color: "#ffffff",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 6,
  },
  badge: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  footerNote: {
    textAlign: "center",
    fontSize: 8,
    color: "#a1a1aa",
    marginTop: 4,
  },
});

/**
 * PDF rendering of the invoice — mirrors the on-screen Bill layout.
 */
export function BillPDF({ bill }: { bill: BillData }) {
  const currency = bill.restaurant.currency;
  const isPaid = bill.payment.status === "PAID";

  return (
    <Document
      title={`Invoice #${bill.invoiceNumber} - ${bill.restaurant.name}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Restaurant */}
        <View style={styles.center}>
          <Text style={styles.restaurantName}>{bill.restaurant.name}</Text>
          {bill.restaurant.tagline ? (
            <Text style={styles.small}>{bill.restaurant.tagline}</Text>
          ) : null}
          {bill.restaurant.address ? (
            <Text style={[styles.small, { marginTop: 2 }]}>
              {bill.restaurant.address}
            </Text>
          ) : null}
          <Text style={[styles.small, { marginTop: 2 }]}>
            {[bill.restaurant.phone, bill.restaurant.email]
              .filter(Boolean)
              .join("  |  ")}
          </Text>
        </View>

        <View style={styles.dashed} />

        {/* Invoice meta */}
        <View style={styles.metaGrid}>
          <MetaCell label="Invoice No." value={`#${bill.invoiceNumber}`} bold />
          <MetaCell label="Date" value={formatDate(bill.createdAt)} />
          <MetaCell label="Time" value={formatTime(bill.createdAt)} />
          <MetaCell
            label="Order Type"
            value={bill.orderType === "DINE_IN" ? "Dine In" : "Delivery"}
          />
          {bill.orderType === "DINE_IN" && bill.tableNumber != null ? (
            <MetaCell label="Table" value={`#${bill.tableNumber}`} />
          ) : null}
          <MetaCell label="Customer" value={bill.customer.name ?? "Guest"} />
          <MetaCell label="Phone" value={bill.customer.phone} />
        </View>

        {bill.orderType === "DELIVERY" && bill.deliveryAddress ? (
          <View style={styles.addressBox}>
            <Text>
              <Text style={styles.bold}>Deliver to: </Text>
              {bill.deliveryAddress}
            </Text>
          </View>
        ) : null}

        <View style={styles.dashed} />

        {/* Items */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colItem, styles.headerCell]}>Item</Text>
          <Text style={[styles.colQty, styles.headerCell]}>Qty</Text>
          <Text style={[styles.colRate, styles.headerCell]}>Rate</Text>
          <Text style={[styles.colGst, styles.headerCell]}>GST</Text>
          <Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
        </View>
        {bill.items.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.colItem}>{item.name}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colRate}>{money(item.price, currency)}</Text>
            <Text style={styles.colGst}>{item.gst}%</Text>
            <Text style={[styles.colTotal, styles.bold]}>
              {money(item.price * item.quantity, currency)}
            </Text>
          </View>
        ))}

        <View style={styles.dashed} />

        {/* Summary */}
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Subtotal</Text>
          <Text>{money(bill.subtotal, currency)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>GST</Text>
          <Text>{money(bill.gstAmount, currency)}</Text>
        </View>
        {bill.serviceCharge > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Service Charge</Text>
            <Text>{money(bill.serviceCharge, currency)}</Text>
          </View>
        ) : null}
        <View style={styles.grandTotal}>
          <Text style={[styles.bold, { fontSize: 9 }]}>GRAND TOTAL</Text>
          <Text style={[styles.bold, { fontSize: 12 }]}>
            {money(bill.total, currency)}
          </Text>
        </View>

        <View style={styles.dashed} />

        {/* Payment */}
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Payment Method</Text>
          <Text>{bill.payment.method === "CASH" ? "Cash" : "Online"}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Payment Status</Text>
          <Text
            style={[
              styles.badge,
              { color: isPaid ? "#15803d" : "#b45309" },
            ]}
          >
            {bill.payment.status}
          </Text>
        </View>
        {isPaid && bill.payment.paidAt ? (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Paid At</Text>
            <Text>
              {formatDate(bill.payment.paidAt)}{" "}
              {formatTime(bill.payment.paidAt)}
            </Text>
          </View>
        ) : null}
        {bill.payment.transactionId ? (
          <View style={styles.summaryRow}>
            <Text style={styles.muted}>Transaction ID</Text>
            <Text style={{ fontSize: 8 }}>{bill.payment.transactionId}</Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Order Status</Text>
          <Text style={styles.badge}>
            {bill.orderStatus.replace(/_/g, " ")}
          </Text>
        </View>

        <View style={styles.dashed} />

        <Text style={styles.footerNote}>
          Thank you for dining with {bill.restaurant.name}!
        </Text>
        <Text style={styles.footerNote}>
          This is a computer generated invoice.
        </Text>
        <Text style={[styles.footerNote, { marginTop: 4, fontSize: 7, color: "#d4d4d8" }]}>
          Powered by DineFlow
        </Text>
      </Page>
    </Document>
  );
}

function MetaCell({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={bold ? styles.bold : undefined}>{value}</Text>
    </View>
  );
}
