import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/hooks/monitor')({
  server: { handlers: { POST: async ({ request }) => {
    const { rejectUnauthorizedHook } = await import('@/lib/hooks.server');
    const denied = await rejectUnauthorizedHook(request);
    if (denied) return denied;
    const { runBoundedMonitor } = await import('@/lib/monitor.server');
    try { return Response.json(await runBoundedMonitor()); }
    catch { return Response.json({ ok: false, error: 'Monitoring unavailable' }, { status: 503 }); }
  } } },
});