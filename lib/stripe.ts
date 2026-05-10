/**
 * lib/stripe.ts
 *
 * Stripe client stub.
 *
 * WIRED IN: future PR (credentials not yet set in Vercel).
 *
 * Required env vars (not yet set):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET
 *   STRIPE_PRICE_ID
 *
 * Throws a clear error if any method is called without credentials.
 * Never returns mock data in production.
 */

const REQUIRED_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID',
] as const;

function assertStripeConfigured(): void {
  const missing = REQUIRED_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `[deallenz] Stripe is not configured. Missing env vars: ${
        missing.join(', ')
      }. Add them in Vercel → Settings → Environment Variables (see ENV.md).`
    );
  }
}

/**
 * StripeClient stub — throws on every method until credentials are wired.
 * Replace with 'stripe' npm package import once STRIPE_SECRET_KEY is set.
 */
export const stripeClient = {
  /** Create a Stripe Checkout session. */
  createCheckoutSession(_params: {
    customer_email: string;
    price_id: string;
    success_url: string;
    cancel_url: string;
  }): never {
    assertStripeConfigured();
    // unreachable — assertStripeConfigured always throws when unconfigured
    throw new Error('unreachable');
  },

  /** Construct a Stripe Webhook event from raw body + signature. */
  constructWebhookEvent(_body: string, _sig: string): never {
    assertStripeConfigured();
    throw new Error('unreachable');
  },

  /** Retrieve a Stripe customer by email. */
  getCustomerByEmail(_email: string): never {
    assertStripeConfigured();
    throw new Error('unreachable');
  },
};
