import { createServerFn } from "@tanstack/react-start";
import { requireGate } from "./gate-middleware";

export const fetchEvents = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    try {
      const { eventsOverview } = await import("./events.server");
      return await eventsOverview();
    } catch {
      return { events: [], latest: null };
    }
  });
