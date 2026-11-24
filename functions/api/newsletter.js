import { sameOrigin } from '../_lib/stripe.js';
import { jsonResponse } from '../_lib/reviews.js';

const MAX_BYTES = 4096;

async function smallJson(request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) {
    throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw Object.assign(new Error('Please submit the subscription form.'), { status: 415 });
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing subscription.');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error('Request too large.'), { status: 413 });
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(text);
}

export function onRequestGet() {
  return new Response('Use the newsletter subscription form.', {
    status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    sameOrigin(request);
  } catch {
    return jsonResponse({ error: 'Invalid request origin.' }, 403);
  }
  let data;
  try {
    data = await smallJson(request);
  } catch (error) {
    return jsonResponse({ error: error.status ? error.message : 'Invalid subscription request.' }, error.status || 400);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse({ error: 'Invalid subscription request.' }, 400);
  }
  // A hidden field rejects automated submissions without storing their addresses.
  if (typeof data.website === 'string' && data.website.trim()) return jsonResponse({ ok: true });
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (data.consent !== true || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    return jsonResponse({ error: 'Enter a valid email address and request collection updates.' }, 400);
  }
  if (!env?.TORQUEBOX_DB) {
    return jsonResponse({ error: 'Subscriptions are temporarily unavailable. Please contact support.' }, 503);
  }
  try {
    await env.TORQUEBOX_DB.prepare(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      email TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      source TEXT NOT NULL
    )`).run();
    await env.TORQUEBOX_DB.prepare(`INSERT INTO newsletter_subscribers
      (email, created_at, consent_version, source) VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO NOTHING`).bind(email, new Date().toISOString(), '2026-11-24', 'storefront').run();
    // The same reply for new and existing addresses avoids exposing the subscriber list.
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ error: 'Your subscription could not be saved. Please try again.' }, 503);
  }
}
