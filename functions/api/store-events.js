const EVENTS = new Set(['page_view', 'add_to_cart', 'begin_checkout', 'checkout_ready', 'checkout_error']);

function reply(status) {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  const origin = new URL(request.url).origin;
  if (request.headers.get('Origin') !== origin) return reply(403);
  if (request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return reply(204);
  if (!env.TORQUEBOX_DB) return reply(204);
  const type = request.headers.get('Content-Type') || '';
  if (!type.toLowerCase().startsWith('application/json')) return reply(415);
  const declared = request.headers.get('Content-Length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 256)) return reply(413);
  try {
    // Read a bounded body even when Content-Length is absent.
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const decoder = new TextDecoder();
    let size = 0;
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256) { await reader.cancel(); return reply(413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    let body;
    try { body = JSON.parse(text); } catch { return reply(400); }
    if (!body || Array.isArray(body) || !EVENTS.has(body.event)
      || !['mobile', 'desktop'].includes(body.device)
      || Object.keys(body).some(key => !['event', 'device'].includes(key))) return reply(400);
    const rawCountry = String(request.cf?.country || 'ZZ').toUpperCase();
    const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : 'ZZ';
    const day = new Date().toISOString().slice(0, 10);
    await env.TORQUEBOX_DB.prepare(`CREATE TABLE IF NOT EXISTS store_event_counts (
      day TEXT NOT NULL, event TEXT NOT NULL, country TEXT NOT NULL,
      device TEXT NOT NULL, event_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day, event, country, device)
    )`).run();
    await env.TORQUEBOX_DB.prepare(`INSERT INTO store_event_counts
      (day, event, country, device, event_count) VALUES (?, ?, ?, ?, 1)
      ON CONFLICT (day, event, country, device)
      DO UPDATE SET event_count = event_count + 1`).bind(day, body.event, country, body.device).run();
    return reply(204);
  } catch {
    // Counter availability must never block a visitor or reveal internal details.
    return reply(204);
  }
}

export function onRequest() {
  return reply(405);
}
