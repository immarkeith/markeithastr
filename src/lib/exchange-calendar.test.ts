import { afterEach, expect, mock, test } from 'bun:test';
import { scheduledPassStatus } from './exchange-calendar.server';
const originalFetch = globalThis.fetch;
const originalId = process.env['ALPACA_LIVE_KEY_ID'];
const originalSecret = process.env['ALPACA_LIVE_SECRET_KEY'];
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalId === undefined) delete process.env['ALPACA_LIVE_KEY_ID']; else process.env['ALPACA_LIVE_KEY_ID'] = originalId;
  if (originalSecret === undefined) delete process.env['ALPACA_LIVE_SECRET_KEY']; else process.env['ALPACA_LIVE_SECRET_KEY'] = originalSecret;
});
test('X06 unexpected exchange closure skips scheduled graph work', async () => {
  process.env['ALPACA_LIVE_KEY_ID'] = 'test-only'; process.env['ALPACA_LIVE_SECRET_KEY'] = 'test-only';
  globalThis.fetch = mock(async (input: string | URL | Request) => Response.json(String(input).includes('/calendar') ? [] : { is_open: false })) as typeof fetch;
  expect(await scheduledPassStatus('lab-refresh', new Date('2026-11-25T15:00:00Z'))).toMatchObject({ due: false, available: true });
});
test('X06 unavailable exchange authority fails closed rather than inventing open hours', async () => {
  process.env['ALPACA_LIVE_KEY_ID'] = 'test-only'; process.env['ALPACA_LIVE_SECRET_KEY'] = 'test-only';
  globalThis.fetch = mock(async () => new Response('', { status: 503 })) as typeof fetch;
  expect(await scheduledPassStatus('lab-refresh', new Date('2026-11-24T15:00:00Z'))).toMatchObject({ due: false, available: false });
});
test('X06 an exchange early close wins over an ordinary weekday assumption', async () => {
  process.env['ALPACA_LIVE_KEY_ID'] = 'test-only'; process.env['ALPACA_LIVE_SECRET_KEY'] = 'test-only';
  globalThis.fetch = mock(async (input: string | URL | Request) => Response.json(String(input).includes('/calendar') ? [{ date: '2026-11-23', open: '09:30', close: '11:00' }] : { is_open: false })) as typeof fetch;
  expect(await scheduledPassStatus('lab-refresh', new Date('2026-11-23T17:00:00Z'))).toMatchObject({ due: false, available: true });
});