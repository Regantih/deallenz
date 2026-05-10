/**
 * app/pricing/page.tsx
 *
 * Public pricing page — no authentication required.
 * Route: /pricing
 *
 * Tiers:
 *   Free Trial  — 3 deals / month, $5 LLM budget cap, all analysis features.
 *   Pro          — Unlimited deals, no LLM cap, priority model routing, email support.
 *
 * CTAs:
 *   Free Trial  → /signup                (start immediately)
 *   Pro         → /signup?plan=pro       (creates account, Stripe checkout wired once key is set)
 *
 * No fake data. Stripe not yet wired — CTA leads to signup so the conversion
 * funnel is real end-to-end; billing will activate once STRIPE_SECRET_KEY is set.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing · DealLens',
  description:
    'DealLens pricing: free trial for solo angels and scouts, Pro plan for active investors.',
};

// ─── design tokens (inline, matching root layout) ────────────────────────────
const CREAM = '#f5f1e8';
const CARD_BG = '#fbf8f0';
const BORDER = '#d8d2c2';
const MUTED = '#6b6358';
const GREEN = '#4a7c59';
const DARK = '#1a1a1a';
const MONO = "'Courier New', monospace";
const SERIF = "Georgia, 'Times New Roman', serif";

// ─── plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '$0',
    cadence: 'forever',
    highlight: false,
    features: [
      '3 deals per month',
      '$5 LLM budget cap (auto-stops at limit)',
      'Full agent swarm (Researcher → Analyst → Writer)',
      '14-chapter IC memo',
      'File upload — PDF, PPTX, DOCX, XLSX (up to 50 MB)',
      'Data-room link ingestion (Google Drive, Dropbox)',
      'Cost ledger — per-deal $ visibility',
      'Magic-link + GitHub OAuth sign-in',
    ],
    cta: 'Start free trial',
    href: '/signup',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    cadence: 'per month',
    highlight: true,
    features: [
      'Unlimited deals',
      'No LLM cap — owner-level budget control',
      'Priority model routing (Sonnet default, Opus available)',
      'All Free Trial features',
      'Email support',
      'Early access to new agents',
    ],
    cta: 'Subscribe to Pro',
    href: '/signup?plan=pro',
  },
] as const;

// ─── component ────────────────────────────────────────────────────────────────
export default function PricingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: CREAM,
        fontFamily: SERIF,
        color: DARK,
        lineHeight: 1.55,
      }}
    >
      {/* ── nav ── */}
      <header
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: CARD_BG,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px',
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            textDecoration: 'none',
            color: DARK,
            letterSpacing: '-0.01em',
          }}
        >
          DealLens
        </Link>
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link
            href="/login"
            style={{
              fontSize: '14px',
              color: MUTED,
              textDecoration: 'none',
              fontFamily: MONO,
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              fontSize: '13px',
              fontFamily: MONO,
              background: GREEN,
              color: '#fff',
              padding: '7px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
            }}
          >
            Start free
          </Link>
        </nav>
      </header>

      {/* ── hero ── */}
      <section
        style={{
          textAlign: 'center',
          padding: '72px 24px 48px',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            fontFamily: MONO,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: GREEN,
            marginBottom: '16px',
          }}
        >
          Simple, transparent pricing
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            margin: '0 0 16px',
          }}
        >
          Deal analysis that pays for itself
        </h1>
        <p style={{ fontSize: '17px', color: MUTED, margin: 0 }}>
          Start free. Upgrade when you need unlimited runway.
        </p>
      </section>

      {/* ── plan cards ── */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          justifyContent: 'center',
          maxWidth: '880px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            style={{
              background: CARD_BG,
              border: plan.highlight
                ? `2px solid ${GREEN}`
                : `1px solid ${BORDER}`,
              borderRadius: '12px',
              padding: '36px 32px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: plan.highlight
                ? `0 4px 24px rgba(74,124,89,0.12)`
                : '0 2px 8px rgba(0,0,0,0.05)',
              position: 'relative',
              flex: '1 1 300px',
            }}
          >
            {plan.highlight && (
              <div
                style={{
                  position: 'absolute',
                  top: '-13px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: GREEN,
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: MONO,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '4px 14px',
                  borderRadius: '20px',
                }}
              >
                Most popular
              </div>
            )}

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                margin: '0 0 8px',
              }}
            >
              {plan.name}
            </h2>

            <div style={{ marginBottom: '28px' }}>
              <span
                style={{
                  fontSize: '42px',
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                }}
              >
                {plan.price}
              </span>
              <span
                style={{
                  fontSize: '14px',
                  color: MUTED,
                  marginLeft: '6px',
                  fontFamily: MONO,
                }}
              >
                {plan.cadence}
              </span>
            </div>

            <ul
              style={{
                listStyle: 'none',
                margin: '0 0 32px',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {plan.features.map((f) => (
                <li
                  key={f}
                  style={{
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <span
                    style={{
                      color: GREEN,
                      fontSize: '16px',
                      lineHeight: 1.3,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              style={{
                display: 'block',
                textAlign: 'center',
                background: plan.highlight ? GREEN : 'transparent',
                color: plan.highlight ? '#fff' : GREEN,
                border: `2px solid ${GREEN}`,
                borderRadius: '8px',
                padding: '12px 24px',
                textDecoration: 'none',
                fontFamily: MONO,
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>

      {/* ── FAQ ── */}
      <section
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '0 24px 80px',
        }}
      >
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '28px',
            textAlign: 'center',
          }}
        >
          Frequently asked questions
        </h2>

        {([
          [
            'What counts as a deal?',
            'Each new company submission — whether via file upload or data-room link — counts as one deal against your monthly quota.',
          ],
          [
            'What happens when I hit the $5 LLM cap on the free tier?',
            'The agent swarm stops and returns whatever analysis it has completed. No charges are made beyond the cap. You can view partial results and upgrade to Pro for the full run.',
          ],
          [
            'Can I upgrade mid-month?',
            'Yes. Upgrading to Pro immediately removes the deal and LLM caps for the remainder of the billing period.',
          ],
          [
            'Is my deal data private?',
            'Yes. All uploads and memos are scoped to your account via row-level security. No data is shared with other users or used to train models.',
          ],
          [
            'Which LLMs are used?',
            'DealLens routes tasks through an MVI model router. Research and classification tasks use claude-haiku-4-5. Analysis, writing, and critique use claude-sonnet-4-20250514. Pro users can request Opus on demand.',
          ],
        ] as [string, string][]).map(([q, a]) => (
          <details
            key={q}
            style={{
              borderBottom: `1px solid ${BORDER}`,
              padding: '16px 0',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                userSelect: 'none',
              }}
            >
              {q}
              <span style={{ color: MUTED, fontSize: '18px', fontWeight: 300 }}>
                +
              </span>
            </summary>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: '14px',
                color: MUTED,
                lineHeight: 1.65,
              }}
            >
              {a}
            </p>
          </details>
        ))}
      </section>

      {/* ── footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${BORDER}`,
          background: CARD_BG,
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: MUTED,
          fontFamily: MONO,
        }}
      >
        <p style={{ margin: '0 0 8px' }}>
          &copy; {new Date().getFullYear()} Marketlogic Investors LLC
        </p>
        <p style={{ margin: 0 }}>
          <a
            href="https://github.com/Regantih/deallenz/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: GREEN, textDecoration: 'none' }}
          >
            Terms of Service &amp; License
          </a>
          {' · '}
          <Link href="/login" style={{ color: MUTED, textDecoration: 'none' }}>
            Sign in
          </Link>
          {' · '}
          <Link href="/signup" style={{ color: MUTED, textDecoration: 'none' }}>
            Sign up
          </Link>
        </p>
      </footer>
    </div>
  );
}
