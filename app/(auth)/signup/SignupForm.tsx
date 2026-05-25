'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * SignupForm — Client Component
 *
 * DealLens uses Supabase magic-link auth. Entering your email and clicking
 * "Create account" sends an OTP (magic link) to your inbox; clicking it
 * signs you in and creates your profile row via the auth trigger.
 */
export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d8d2c2',
    borderRadius: '6px',
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: '15px',
    background: '#fff',
    color: '#1a1a1a',
    boxSizing: 'border-box',
    outline: 'none',
  };

  const primaryBtnStyle: React.CSSProperties = {
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
  };

  async function handleSignup(e: React.FormEvent) {
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
        err instanceof Error ? err.message : 'Supabase is not configured.'
      );
      return;
    }

    // signInWithOtp creates the user if they don't exist, or sends a new
    // magic link if they do.  The auth trigger creates the profile row.
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
      <h1
        style={{
          margin: '0 0 6px',
          fontSize: '22px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        Create your account
      </h1>
      <p style={{ margin: '0 0 28px', fontSize: '14px', color: '#6b6358' }}>
        Free trial: 3 deals / month, $5 LLM budget.
      </p>

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#991b1b',
            marginBottom: '16px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {status === 'sent' ? (
        <div
          style={{
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#166534',
          }}
        >
          Magic link sent to <strong>{email}</strong>. Check your inbox and
          click the link to activate your account.
        </div>
      ) : (
        <form onSubmit={handleSignup}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: '12px',
              fontFamily: "'Courier New', monospace",
              color: '#6b6358',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
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
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              ...primaryBtnStyle,
              opacity: status === 'sending' ? 0.6 : 1,
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'sending' ? 'Sending…' : 'Create account'}
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
        Already have an account?{' '}
        <a href="/login" style={{ color: '#8b6f3d', textDecoration: 'none' }}>
          Sign in
        </a>
      </p>
    </>
  );
}
