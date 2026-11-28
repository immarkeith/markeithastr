import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [
    { title: 'Watchlist redirect — ASTR' },
    { name: 'description', content: 'ASTR watchlist now opens the stock scoreboard.' },
    { property: 'og:title', content: 'Watchlist redirect — ASTR' },
    { property: 'og:description', content: 'Open ASTR’s current stock scoreboard.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/scoreboard", replace: true });
  },
});
