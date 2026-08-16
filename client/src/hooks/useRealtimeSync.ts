import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export type RealtimeConnectionStatus = "disabled" | "connecting" | "connected" | "disconnected";

type RealtimeEvent = {
  type: "realtime";
  entity: "order" | "session" | "product" | "menu" | "customer" | "responsible" | "historical-session" | "simulation";
  action: string;
  ids?: Record<string, number | number[]>;
  timestamp: string;
};

function invalidateAllSharedQueries(utils: ReturnType<typeof trpc.useUtils>) {
  return Promise.all([
    utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
    utils.pdv.cashier.getOpenSession.invalidate(),
    utils.pdv.products.list.invalidate(),
    utils.pdv.menu.list.invalidate(),
    utils.pdv.menu.getItems.invalidate(),
    utils.pdv.customers.list.invalidate(),
    utils.pdv.cashierResponsibles.list.invalidate(),
  ]);
}

function invalidateAffectedQueries(utils: ReturnType<typeof trpc.useUtils>, event: RealtimeEvent) {
  const invalidate = async (...tasks: Array<Promise<unknown>>) => {
    await Promise.all(tasks);
  };

  switch (event.entity) {
    case "order":
      return invalidate(
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
        utils.pdv.products.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
        utils.pdv.customers.list.invalidate(),
      );
    case "session":
      return invalidate(
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
        utils.pdv.cashier.getOpenSession.invalidate(),
      );
    case "product":
      return invalidate(
        utils.pdv.products.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
      );
    case "menu":
      return invalidate(
        utils.pdv.menu.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
      );
    case "customer":
      return utils.pdv.customers.list.invalidate();
    case "responsible":
      return utils.pdv.cashierResponsibles.list.invalidate();
    case "historical-session":
      return utils.pdv.cashier.getAllSessionsWithOrders.invalidate();
    case "simulation":
      return invalidate(
        utils.pdv.cashier.getAllSessionsWithOrders.invalidate(),
        utils.pdv.products.list.invalidate(),
        utils.pdv.menu.getItems.invalidate(),
      );
    default:
      return Promise.resolve();
  }
}

export function useRealtimeSync({ enabled = true }: { enabled?: boolean } = {}) {
  const utils = trpc.useUtils();
  const [status, setStatus] = useState<RealtimeConnectionStatus>(enabled ? "connecting" : "disabled");

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof WebSocket === "undefined") {
      setStatus("disabled");
      return;
    }

    let disposed = false;
    let retryTimer: number | undefined;
    let retryAttempt = 0;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (disposed) return;
      setStatus(retryAttempt === 0 ? "connecting" : "disconnected");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

      socket.onopen = () => {
        retryAttempt = 0;
        setStatus("connected");
        void invalidateAllSharedQueries(utils);
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as RealtimeEvent | { type: "connected" };
          if (event.type === "realtime") {
            void invalidateAffectedQueries(utils, event);
          }
        } catch (error) {
          console.warn("[Realtime] Evento WebSocket inválido ignorado", error);
        }
      };

      socket.onerror = () => {
        setStatus("disconnected");
      };

      socket.onclose = () => {
        if (disposed) return;
        setStatus("disconnected");
        const delay = Math.min(1000 * 2 ** retryAttempt, 15000);
        retryAttempt += 1;
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void invalidateAllSharedQueries(utils);
        if (!socket || socket.readyState === WebSocket.CLOSED) connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    connect();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, [enabled, utils]);

  return status;
}
