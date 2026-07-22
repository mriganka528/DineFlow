type SSEClient = {
  controller: ReadableStreamDefaultController;
};

const adminClients: SSEClient[] = [];

export function notifyAdmins(data: Record<string, unknown>) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of adminClients) {
    try {
      client.controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // client disconnected
    }
  }
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const client: SSEClient = { controller };
      adminClients.push(client);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 30000);

      try {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ type: "init" })}\n\n`),
        );
      } catch {
        // ignore
      }

      return () => {
        clearInterval(keepAlive);
        const index = adminClients.indexOf(client);
        if (index !== -1) adminClients.splice(index, 1);
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
