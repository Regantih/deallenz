'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

const CARD_STYLES = {
  heading: {
    margin: '0 0 6px',
    fontSize: '22px',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: '#1a1a1a',
  } as React.CSSProperties,
  subheading: {
    margin: '0 0 28px',
    fontSize: '14px',
    color: '#6b6358',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '12px',
    fontFamily: "'Courier New', monospace",
    color: '#6b6358',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginBottom: '6px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d8d2c2',
    borderRadius: '6px',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '15px',
    background: '#fff',
    color: '#1a1a1a',
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as React.CSSProperties,
  primaryBtn: {
    width: '100%',
    padding: '11px 16px',
    border: '1px solid #1a1a1a',
    borderRadius: '6px',
    background: '#1a1a1a',
    color: '#f5f1e8',
    fontSize: '14px',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '12px',
  } as React.CSSProperties,
  errorBox: {
    padding: '10px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#991b1b',
    marginBottom: '16px',
  } as React.CSSProperties,
  successBox: {
    padding: '10px 14px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#166534',
    marginBottom: '16px',
  } as React.CSSProperties,
};

interface LoginFormProps {
  errorFromUrl?: string;
}

export default function LoginForm({ errorFromUrl }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState(errorFromUrl ?? '');

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setStatus('sending');
    setErrorMsg('');

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <>
      <h1 style={CARD_STYLES.heading}>Sign in to DealLens</h1>
      <p style={CARD_STYLES.subheading}>
        Enter your email to receive a magic link.
      </p>

      {/* Error banner (from OAuth callback or form validation) */}
      {errorMsg && <div style={CARD_STYLES.errorBox}>{errorMsg}</div>}

      {/* Success banner after magic link sent */}
      {status === 'sent' && (
        <div style={CARD_STYLES.successBox}>
          Magic link sent to <strong>{email}</strong>. Check your inbox (and
          spam folder) then click the link to sign in.
        </div>
      )}

      {status !== 'sent' && (
        <form onSubmit={handleMagicLink}>
          <div style={{ marginBottom: '4px' }}>
            <label htmlFor="email" style={CARD_STYLES.label}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={CARD_STYLES.input}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              ...CARD_STYLES.primaryBtn,
              opacity: status === 'sending' ? 0.6 : 1,
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}

      <p
        style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: '#6b6358',
        }}
      >
        Don’t have an account?{' '}
        <a href="/signup" style={{ color: '#8b6f3d', textDecoration: 'none' }}>
          Sign up
        </a>
      </p>
    </>
  );
}
