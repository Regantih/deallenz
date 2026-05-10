'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * SignupForm — Client Component
 *
 * DealLens uses Supabase magic-link auth as its primary sign-up flow.
 * There is no password.  Entering your email and clicking "Create account"
 * sends an OTP (magic link) to your inbox; clicking it signs you in and
 * creates your profile row via the auth trigger.
 *
 * GitHub OAuth is also available as a one-click option.
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setErrorMsg(error.message);
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

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
        }}
      >
        <span style={{ flex: 1, height: 1, background: '#d8d2c2' }} />
        <span
          style={{
            fontSize: '11px',
            fontFamily: "'Courier New', monospace",
            color: '#6b6358',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          or
        </span>
        <span style={{ flex: 1, height: 1, background: '#d8d2c2' }} />
      </div>

      <button
        type="button"
        onClick={handleGitHubOAuth}
        style={{
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
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
        Already have an account?{' '}
        <a href="/login" style={{ color: '#8b6f3d', textDecoration: 'none' }}>
          Sign in
        </a>
      </p>
    </>
  );
}
