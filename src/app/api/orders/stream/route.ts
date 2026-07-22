import { prisma } from "@/lib/prisma";
import { getCustomerId } from "@/lib/auth";

type SSEClient = {
  customerId: string;
  controller: ReadableStreamDefaultController;
};

const clients: SSEClient[] = [];

export function notifyCustomer(customerId: string, data: Record<string, unknown>) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.customerId === customerId) {
      try {
        client.controller.enqueue(new TextEncoder().encode(message));
      } catch {
        // client disconnected
      }
    }
  }
}

export function notifyAllCustomers(data: Record<string, unknown>) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // client disconnected
    }
  }
}

export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = { customerId, controller };
      clients.push(client);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      const recentOrders = prisma.order.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, orderNumber: true, status: true, paymentStatus: true },
      });

      recentOrders.then((orders) => {
        try {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: "init", orders })}\n\n`),
          );
        } catch {
          // ignore
        }
      });

      return () => {
        clearInterval(keepAlive);
        const index = clients.indexOf(client);
        if (index !== -1) clients.splice(index, 1);
      };
    },
    cancel() {
      // cleanup handled by start's return
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
