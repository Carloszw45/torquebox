import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, validateCustomer } from '../functions/_lib/pix.js';
import { digestToken, makeOrderToken, saveVerifiedStatus, tokenMatches } from '../functions/_lib/orders.js';

test('um frasco inclui R$ 9,90 de frete', () => {
  assert.deepEqual(priceCart({ '1_bottle': 1 }), {
    items: [{ id: '1_bottle', name: '1 frasco (120 mL)', quantity: 1, unitBrlCents: 3990 }],
    kitCount: 1, bottleCount: 1, subtotalBrlCents: 3990,
    shippingBrlCents: 990, totalBrlCents: 4980,
  });
});

test('kits de 2 e 3 frascos têm frete grátis, cobrança em reais', () => {
  assert.equal(priceCart({ '2_bottles': 1 }).totalBrlCents, 6990);
  assert.equal(priceCart({ '3_bottles': 1 }).totalBrlCents, 9490);
  assert.equal(priceCart({ '1_bottle': 1, '2_bottles': 1 }).shippingBrlCents, 0);
  assert.equal(priceCart({ '1_bottle': 2 }).shippingBrlCents, 990);
});

test('servidor recusa valores inventados e quantidade irregular', () => {
  assert.throws(() => priceCart({ forged: 1 }), /inválidos/);
  assert.throws(() => priceCart({ '1_bottle': 1.5 }), /inválidos/);
  assert.throws(() => priceCart({ '1_bottle': 21 }), /inválidos/);
  assert.throws(() => priceCart({ '1_bottle': 20, '2_bottles': 2 }), /20 kits/);
  assert.throws(() => priceCart({}), /vazio/);
});

test('endereço de entrega exige CEP brasileiro e UF válida', () => {
  const contact = {
    name: 'Carlos Silva', email: 'carlos@example.com', phone: '',
    address: { line1: 'Rua das Flores, 123', line2: '', city: 'Contagem', state: 'MG', postalCode: '32040-000', country: 'BR' },
  };
  assert.equal(validateCustomer(contact).address.state, 'MG');
  assert.throws(() => validateCustomer({ ...contact, address: { ...contact.address, country: 'US' } }), /CEP válido/);
  assert.throws(() => validateCustomer({ ...contact, address: { ...contact.address, postalCode: '90001' } }), /CEP válido/);
});

test('status exige token privado e transação autêntica da operadora', async () => {
  const token = makeOrderToken();
  const hashed = await digestToken(token);
  assert.equal(token.length, 64);
  assert.equal(await tokenMatches(token, hashed), true);
  assert.equal(await tokenMatches('a'.repeat(64), hashed), false);

  const writes = [];
  const db = { prepare(sql) { return { bind(...args) { return { async run() { writes.push({ sql, args }); } }; } }; } };
  const order = { id: 'o1', status: 'pending', pixou_tx_id: 't1', brl_total_cents: 6990 };
  assert.equal(await saveVerifiedStatus(db, order, { id: 't1', status: 'pending', payment_method: 'pix', total_amount: 6990 }), 'pending');
  assert.equal(writes.length, 0);
  await assert.rejects(saveVerifiedStatus(db, order, { id: 't1', status: 'paid', payment_method: 'pix', total_amount: 1 }), /mismatched/);
  assert.equal(writes.length, 0);
  assert.equal(await saveVerifiedStatus(db, order, { id: 't1', status: 'paid', payment_method: 'pix', total_amount: 6990 }), 'paid');
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /SET status = 'paid'/);
});
