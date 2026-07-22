"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  Eye,
  Hash,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  User,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { formatMoney } from "@/lib/currency";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BillActions, type BillRestaurant } from "@/components/bill";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  gst: number;
  food: { id: string; name: string };
};

type Address = {
  id: string;
  label: string | null;
  houseNo: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
};

type Order = {
  id: string;
  orderNumber: number;
  orderType: "DINE_IN" | "DELIVERY";
  tableNumber: number | null;
  paymentMethod: string;
  paymentStatus: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  status: string;
  subtotal: number;
  gstAmount: number;
  serviceCharge: number;
  total: number;
  createdAt: string;
  customer: { id: string; name: string | null; phone: string };
  address: Address | null;
  orderItems: OrderItem[];
};

const ORDER_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-indigo-100 text-indigo-800",
  READY: "bg-emerald-100 text-emerald-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-200 text-green-900",
  CANCELLED: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
};

function getNextStatuses(current: string): string[] {
  const flow: Record<string, string[]> = {
    PENDING: ["ACCEPTED", "CANCELLED"],
    ACCEPTED: ["PREPARING", "CANCELLED"],
    PREPARING: ["READY", "CANCELLED"],
    READY: ["OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"],
    OUT_FOR_DELIVERY: ["DELIVERED"],
    DELIVERED: ["COMPLETED"],
  };
  return flow[current] ?? [];
}

export default function OrdersClient({ currency, restaurant }: { currency: string; restaurant: BillRestaurant }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [busyAction, setBusyAction] = useState<{
    type: "orderStatus" | "paymentStatus";
    orderId: string;
    value: string;
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);
      params.set("page", page.toString());
      params.set("limit", "20");

      const { data } = await api.get(`/api/admin/orders?${params}`);
      setOrders(data.orders);
      setTotal(data.total);
    } catch {
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, page]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    setBusyAction({ type: "orderStatus", orderId, value: status });
    try {
      const { data } = await api.patch("/api/admin/orders", { orderId, status });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o)),
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order);
      }
      toast.success(`Order updated to ${status}`);
    } catch {
      toast.error("Failed to update order");
    } finally {
      setBusyAction((current) =>
        current?.type === "orderStatus" && current.orderId === orderId ? null : current,
      );
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    setBusyAction({ type: "paymentStatus", orderId, value: paymentStatus });
    try {
      const { data } = await api.patch("/api/admin/orders", { orderId, paymentStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? data.order : o)),
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(data.order);
      }
      toast.success(`Payment status updated to ${paymentStatus}`);
    } catch {
      toast.error("Failed to update payment status");
    } finally {
      setBusyAction((current) =>
        current?.type === "paymentStatus" && current.orderId === orderId ? null : current,
      );
    }
  };

  // SSE: listen for live order updates
  useEffect(() => {
    const es = new EventSource("/api/admin/orders/stream");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_order") {
          fetchOrders();
        } else if (data.type === "order_update" && data.order) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === data.order.id
                ? { ...o, status: data.order.status, paymentStatus: data.order.paymentStatus }
                : o,
            ),
          );
          setSelectedOrder((prev) => {
            if (!prev || prev.id !== data.order.id) return prev;
            return { ...prev, status: data.order.status, paymentStatus: data.order.paymentStatus };
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        // reconnect handled by re-render
      }, 5000);
    };

    return () => es.close();
  }, [fetchOrders]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {total} order{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, name, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Order Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Payments</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Payment</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const nextStatuses = getNextStatuses(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium">
                        #{order.orderNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {order.customer.name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {order.customer.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs">
                          {order.orderType === "DINE_IN" ? (
                            <>
                              <UtensilsCrossed className="size-3" />
                              Dine in
                              {order.tableNumber && ` #${order.tableNumber}`}
                            </>
                          ) : (
                            <>
                              <MapPin className="size-3" />
                              Delivery
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? ""}`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 ">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 mb-1 text-xs font-medium ${PAYMENT_COLORS[order.paymentStatus] ?? ""}`}
                        >
                          {order.paymentStatus}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {order.paymentMethod}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(order.total, currency)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {nextStatuses.length > 0 && (
                            <Select
                              value=""
                              onValueChange={(v) =>
                                updateOrderStatus(order.id, v)
                              }
                              disabled={busyAction?.type === "orderStatus" && busyAction.orderId === order.id}
                            >
                              <SelectTrigger className="h-8 w-auto gap-1 rounded-md border bg-gray-100 px-2 text-xs [&>svg:last-child]:hidden">
                                {busyAction?.type === "orderStatus" && busyAction.orderId === order.id ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <span className="flex justify-center items-center text-gray-800 dark:text-gray-200 gap-1.5 ">
                                    Update
                                    <ChevronDown className="size-3.5 text-muted-foreground" />
                                  </span>


                                )}
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4} align="end">
                                {nextStatuses.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s === "CANCELLED"
                                      ? "Cancel"
                                      : `Mark ${s.replace(/_/g, " ")}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <AlertDialog
        open={selectedOrder !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
      >
        <AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Hash className="size-5" />
              Order #{selectedOrder?.orderNumber}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Placed on{" "}
              {selectedOrder &&
                new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}
                >
                  {selectedOrder.status.replace(/_/g, " ")}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${PAYMENT_COLORS[selectedOrder.paymentStatus]}`}
                >
                  {selectedOrder.paymentStatus}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {selectedOrder.paymentMethod}
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {selectedOrder.orderType === "DINE_IN"
                    ? `Dine in${selectedOrder.tableNumber ? ` - Table #${selectedOrder.tableNumber}` : ""}`
                    : "Delivery"}
                </span>
              </div>

              {/* Customer */}
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Customer
                </p>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedOrder.customer.name || "Anonymous"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <span>{selectedOrder.customer.phone}</span>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.address && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Delivery Address
                  </p>
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">
                      {[
                        selectedOrder.address.houseNo,
                        selectedOrder.address.street,
                        selectedOrder.address.area,
                        selectedOrder.address.city,
                        selectedOrder.address.state,
                        selectedOrder.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              )}

              {/* Razorpay details */}
              {selectedOrder.razorpayPaymentId && (
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Payment Details
                  </p>
                  <p className="text-xs font-mono">
                    Payment ID: {selectedOrder.razorpayPaymentId}
                  </p>
                  {selectedOrder.paidAt && (
                    <p className="text-xs text-muted-foreground">
                      Paid at: {new Date(selectedOrder.paidAt).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              )}

              {/* Order Items */}
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Items
                </p>
                <div className="space-y-2">
                  {selectedOrder.orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="size-3.5 text-muted-foreground" />
                        <span>{item.food.name}</span>
                        <span className="text-muted-foreground">
                          x{item.quantity}
                        </span>
                      </div>
                      <span className="font-medium">
                        {formatMoney(item.price * item.quantity, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(selectedOrder.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST</span>
                  <span>{formatMoney(selectedOrder.gstAmount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span>{formatMoney(selectedOrder.serviceCharge, currency)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Total</span>
                  <span>{formatMoney(selectedOrder.total, currency)}</span>
                </div>
              </div>

              {/* Invoice */}
              <div className="rounded-lg border p-3 space-y-2 ">
                <p className="text-xs font-medium text-muted-foreground">
                  Invoice
                </p>
                <BillActions
                  bill={{
                    invoiceNumber: selectedOrder.orderNumber,
                    createdAt: selectedOrder.createdAt,
                    orderType: selectedOrder.orderType,
                    tableNumber: selectedOrder.tableNumber,
                    deliveryAddress: selectedOrder.address
                      ? [
                          selectedOrder.address.houseNo,
                          selectedOrder.address.street,
                          selectedOrder.address.area,
                          selectedOrder.address.city,
                          selectedOrder.address.state,
                          selectedOrder.address.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")
                      : null,
                    orderStatus: selectedOrder.status,
                    restaurant,
                    customer: {
                      name: selectedOrder.customer.name,
                      phone: selectedOrder.customer.phone,
                    },
                    payment: {
                      method: selectedOrder.paymentMethod,
                      status: selectedOrder.paymentStatus,
                      paidAt: selectedOrder.paidAt,
                      transactionId: selectedOrder.razorpayPaymentId,
                    },
                    items: selectedOrder.orderItems.map((item) => ({
                      id: item.id,
                      name: item.food.name,
                      quantity: item.quantity,
                      price: item.price,
                      gst: item.gst,
                    })),
                    subtotal: selectedOrder.subtotal,
                    gstAmount: selectedOrder.gstAmount,
                    serviceCharge: selectedOrder.serviceCharge,
                    total: selectedOrder.total,
                  }}
                />
              </div>

              {/* Quick Actions */}
              {getNextStatuses(selectedOrder.status).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {getNextStatuses(selectedOrder.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "CANCELLED" ? "destructive" : "default"}
                      disabled={
                        (busyAction?.type === "orderStatus" &&
                          busyAction.orderId === selectedOrder.id &&
                          busyAction.value === s) ||
                        selectedOrder.status === s
                      }
                      onClick={() =>
                        updateOrderStatus(selectedOrder.id, s)
                      }
                    >
                      {busyAction?.type === "orderStatus" && busyAction.orderId === selectedOrder.id && busyAction.value === s && (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      )}
                      {s === "CANCELLED"
                        ? "Cancel Order"
                        : `Mark ${s.replace(/_/g, " ")}`}
                    </Button>
                  ))}
                </div>
              )}

              {/* Payment Status Control */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Update Payment Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_STATUSES.map((ps) => (
                    <Button
                      key={ps}
                      size="sm"
                      variant={selectedOrder.paymentStatus === ps ? "default" : "outline"}
                      disabled={
                        (busyAction?.type === "paymentStatus" &&
                          busyAction.orderId === selectedOrder.id &&
                          busyAction.value === ps) ||
                        selectedOrder.paymentStatus === ps
                      }
                      onClick={() => updatePaymentStatus(selectedOrder.id, ps)}
                    >
                      {busyAction?.type === "paymentStatus" && busyAction.orderId === selectedOrder.id && busyAction.value === ps && (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      )}
                      {ps}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
