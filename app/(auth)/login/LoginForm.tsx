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
  secondaryBtn: {
    width: '100%',
    padding: '10px 16px',
    border: '1px solid #d8d2c2',
    borderRadius: '6px',
    background: '#fbf8f0',
    color: '#1a1a1a',
    fontSize: '14px',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  } as React.CSSProperties,
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  } as React.CSSProperties,
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#d8d2c2',
  } as React.CSSProperties,
  dividerText: {
    fontSize: '11px',
    fontFamily: "'Courier New', monospace",
    color: '#6b6358',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
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

  async function handleGitHubOAuth() {
    setErrorMsg('');

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Supabase is not configured.'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
    // On success, Supabase redirects the browser; no further handling needed.
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

      <div style={CARD_STYLES.divider}>
        <span style={CARD_STYLES.dividerLine} />
        <span style={CARD_STYLES.dividerText}>or</span>
        <span style={CARD_STYLES.dividerLine} />
      </div>

      <button
        type="button"
        onClick={handleGitHubOAuth}
        style={CARD_STYLES.secondaryBtn}
      >
        {/* GitHub SVG icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23A11.51 11.51 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.12 3.176.77.84 1.235 1.911 1.235 3.222 0 4.61-2.807 5.625-5.48 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.218.694.825.576C20.565 21.796 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
        Continue with GitHub
      </button>

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
