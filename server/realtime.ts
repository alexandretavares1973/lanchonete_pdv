import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

export type RealtimeEntity =
  | "order"
  | "session"
  | "product"
  | "menu"
  | "customer"
  | "responsible"
  | "historical-session"
  | "simulation";

export type RealtimeAction =
  | "created"
  | "updated"
  | "deleted"
  | "opened"
  | "closed"
  | "refunded"
  | "linked"
  | "started"
  | "completed";

export type RealtimeEvent = {
  type: "realtime";
  entity: RealtimeEntity;
  action: RealtimeAction;
  ids?: Record<string, number | number[]>;
  timestamp: string;
};

type RealtimeHandshake = {
  type: "connected";
  timestamp: string;
};

let realtimeServer: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

function send(socket: WebSocket, payload: RealtimeEvent | RealtimeHandshake) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function attachRealtimeServer(server: Server) {
  if (realtimeServer) return;

  realtimeServer = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (requestUrl.pathname !== "/ws") {
      // Other upgrade paths belong to Vite or the hosting runtime.
      return;
    }

    realtimeServer?.handleUpgrade(request, socket, head, (client) => {
      realtimeServer?.emit("connection", client, request);
    });
  });

  realtimeServer.on("connection", (socket) => {
    clients.add(socket);
    send(socket, { type: "connected", timestamp: new Date().toISOString() });

    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
    socket.on("message", () => {
      // The channel is server-push only. Client messages are ignored deliberately.
    });
  });
}

export function publishRealtimeEvent(
  event: Omit<RealtimeEvent, "type" | "timestamp"> & Partial<Pick<RealtimeEvent, "timestamp">>,
) {
  const payload: RealtimeEvent = {
    type: "realtime",
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  for (const client of Array.from(clients)) {
    send(client, payload);
  }

  return clients.size;
}

export function getRealtimeClientCount() {
  return clients.size;
}
