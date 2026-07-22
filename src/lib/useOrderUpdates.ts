"use client";

import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

type OrderEvent = {
  type: string;
  orderId?: string;
  orderNumber?: number;
  status?: string;
  paymentStatus?: string;
};

const STATUS_LABELS: Record<string, string> = {
  ACCEPTED: "accepted",
  PREPARING: "being prepared",
  READY: "ready for pickup",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

export function useOrderUpdates(onUpdate?: (event: OrderEvent) => void) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/orders/stream");

      es.onmessage = (event) => {
        try {
          const data: OrderEvent = JSON.parse(event.data);
          if (data.type === "status_update" && data.orderNumber && data.status) {
            const label = STATUS_LABELS[data.status] ?? data.status.toLowerCase().replace(/_/g, " ");
            toast(`Order #${data.orderNumber} is ${label}`, { icon: "📦" });
          }
          onUpdateRef.current?.(data);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, []);
}
