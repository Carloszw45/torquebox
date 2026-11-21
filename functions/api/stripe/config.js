import { configuredForTests, json } from '../../_lib/stripe.js';

export function onRequestGet({ env }) {
  if (!configuredForTests(env)) return json({ error: 'Test checkout is not configured.' }, 503);
  // Publishable test keys are intended for use in browsers; secret keys never leave the worker.
  return json({ publishableKey: env.STRIPE_PUBLISHABLE_KEY, mode: 'test' });
}
