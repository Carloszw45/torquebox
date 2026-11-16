export function makeOrderToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function digestToken(token) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function tokenMatches(token, hexDigest) {
  if (!/^[a-f0-9]{64}$/i.test(token) || !/^[a-f0-9]{64}$/i.test(hexDigest)) return false;
  const actual = await digestToken(token);
  const actualBytes = Uint8Array.from(actual.match(/.{2}/g), (h) => parseInt(h, 16));
  const expectedBytes = Uint8Array.from(hexDigest.match(/.{2}/g), (h) => parseInt(h, 16));
  let difference = 0;
  for (let i = 0; i < actualBytes.length; i++) difference |= actualBytes[i] ^ expectedBytes[i];
  return difference === 0;
}

export async function saveVerifiedStatus(db, order, providerTransaction) {
  if (!providerTransaction || providerTransaction.id !== order.pixou_tx_id
    || providerTransaction.payment_method !== 'pix'
    || providerTransaction.total_amount !== order.brl_total_cents) {
    throw new Error('Payment provider returned a mismatched transaction.');
  }
  const providerStatus = providerTransaction.status;
  if (!['paid', 'expired', 'cancelled'].includes(providerStatus)) return order.status;

  const now = new Date().toISOString();
  if (providerStatus === 'paid') {
    await db.prepare(`UPDATE torque_orders SET status = 'paid', paid_at = COALESCE(paid_at, ?),
      updated_at = ? WHERE id = ?`).bind(now, now, order.id).run();
    return 'paid';
  }
  if (order.status !== 'paid') {
    await db.prepare(`UPDATE torque_orders SET status = ?, updated_at = ?
      WHERE id = ? AND status != 'paid'`).bind(providerStatus, now, order.id).run();
    return providerStatus;
  }
  return 'paid';
}
