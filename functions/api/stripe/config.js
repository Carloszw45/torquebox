import { configuredStripeMode, json } from '../../_lib/stripe.js';

export function onRequestGet({ env, request }) {
  const mode = configuredStripeMode(env, request);
  if (!mode) {
    const hostname = new URL(request.url).hostname;
    const canDiagnose = !['torque-box.com', 'www.torque-box.com'].includes(hostname)
      && env?.STRIPE_MODE !== 'live';
    // Preview-only diagnostics: report boolean configuration checks, never credentials.
    const publishableKey = env?.STRIPE_PUBLISHABLE_KEY;
    const hasPublishableKey = typeof publishableKey === 'string' && publishableKey.length > 0;
    const checks = {
      publishableTestKey: publishableKey?.startsWith('pk_test_') === true,
      publishableKeyPresent: hasPublishableKey,
      publishableKeyValidAfterTrim: hasPublishableKey && publishableKey.trim().startsWith('pk_test_'),
      publishableKeyStartsWithWhitespace: hasPublishableKey && /^\s/.test(publishableKey),
      publishableKeyContainsLineBreak: hasPublishableKey && /[\r\n]/.test(publishableKey),
      secretTestKey: env?.STRIPE_SECRET_KEY?.startsWith('sk_test_') === true,
      testDatabase: Boolean(env?.TORQUEBOX_DB),
    };
    if (canDiagnose && new URL(request.url).searchParams.get('diagnostic') === '1') {
      return json({ error: 'Checkout is not configured.', checks }, 503);
    }
    return json({ error: 'Checkout is not configured.' }, 503);
  }
  // Publishable keys are for browsers; secret keys never leave the worker.
  return json({ publishableKey: env.STRIPE_PUBLISHABLE_KEY, mode });
}
