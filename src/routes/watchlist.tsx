import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/watchlist")({
  beforeLoad: () => {
    throw redirect({ to: "/scoreboard", replace: true });
  },
});
