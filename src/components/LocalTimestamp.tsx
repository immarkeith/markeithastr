import { useEffect, useState } from 'react';
import { formatDisplayTime } from '@/lib/device-time';

/** Render Eastern on the server, then the user's device zone after hydration. */
export function LocalTimestamp({ value }: { value: string }) {
  const [zone, setZone] = useState<string | undefined>();
  useEffect(() => {
    try { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone); }
    catch { /* Clearly labeled Eastern fallback remains visible. */ }
  }, []);
  return <time dateTime={value}>{formatDisplayTime(value, zone)}</time>;
}