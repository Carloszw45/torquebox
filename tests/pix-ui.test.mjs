import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('customer sees USD only, generates Pix and receives confirmation without leaving the site', async (t) => {
  const server = createServer(async (req, res) => {
    const path = req.url === '/' ? 'index.html' : decodeURIComponent(req.url).replace(/^\//, '');
    if (!['index.html', 'assets/torquebox.js'].includes(path) && !/^assets\/images\/[\w.-]+$/.test(path)) {
      res.writeHead(404).end();
      return;
    }
    try {
      const data = await readFile(join(root, path));
      res.setHeader('Content-Type', path.endsWith('.js') ? 'application/javascript'
        : path.endsWith('.html') ? 'text/html' : 'image/png');
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    if (/Operation not permitted|socket\(\) failed|Failed to launch|Target page.*closed/.test(String(error))) {
      t.skip('Chromium cannot launch inside this execution sandbox; rerun in a local browser-enabled environment.');
      return;
    }
    throw error;
  }
  try {
    const page = await browser.newPage();
    let requestedCart;
    await page.route('**/api/pix/quote', async (route) => {
      requestedCart = JSON.parse(route.request().postData()).cart;
      await route.fulfill({ json: { totalUsdCents: 2995, totalBrlCents: 16289, rate: 5.4387, rateDate: '2026-11-16' } });
    });
    await page.route('**/api/pix/charge', async (route) => {
      const request = JSON.parse(route.request().postData());
      assert.deepEqual(request.cart, { '2_bottles': 1 });
      assert.equal(request.customer.address.state, 'CA');
      await route.fulfill({ json: {
        orderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', accessToken: 'a'.repeat(64),
        totalUsdCents: 2995, totalBrlCents: 16289, rate: 5.4387, rateDate: '2026-11-16',
        pixCode: '000201010212...TESTPIX',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9X5GvpMAAAAASUVORK5CYII=',
      } });
    });
    await page.route('**/api/pix/status', async (route) => {
      await route.fulfill({ json: { status: 'paid' } });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
    // External Tailwind script might be blocked in an offline test environment.
    await page.addStyleTag({ content: '.hidden{display:none!important}' });
    await page.locator('#main-atc-btn').click();
    assert.equal(await page.locator('#cart-counter').textContent(), '1');
    await page.locator('#open-pix-checkout').click();
    await page.waitForFunction(() => !document.getElementById('pix-generate').disabled);
    assert.match(await page.locator('#pix-modal').innerText(), /\$29\.95/);
    assert.doesNotMatch(await page.locator('#pix-modal').innerText(), /R\$\s*162,89|Estimated Pix total/);
    assert.deepEqual(requestedCart, { '2_bottles': 1 });
    await page.locator('input[name="name"]').fill('Alex Walker');
    await page.locator('input[name="email"]').fill('alex@example.com');
    await page.locator('input[name="line1"]').fill('123 Main Street');
    await page.locator('input[name="city"]').fill('Los Angeles');
    await page.locator('input[name="state"]').fill('CA');
    await page.locator('input[name="postalCode"]').fill('90001');
    await page.locator('#pix-generate').click();
    await page.waitForFunction(() => document.getElementById('pix-order-status').textContent.includes('Payment confirmed!'));
    assert.doesNotMatch(await page.locator('#pix-modal').innerText(), /R\$\s*162,89/);
    assert.equal(await page.locator('#cart-counter').isVisible(), false);
    assert.equal(new URL(page.url()).host, `127.0.0.1:${server.address().port}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
