import type { ReactNode } from 'react';

/**
 * Auth layout — centred card, consistent brand header.
 * Applied to: /login, /signup
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f5f1e8',
      }}
    >
      {/* Brand header */}
      <header style={{ marginBottom: '40px', textAlign: 'center' }}>
        <a
          href="/"
          style={{
            fontSize: '26px',
            fontWeight: 700,
            textDecoration: 'none',
            color: '#1a1a1a',
            letterSpacing: '-0.01em',
          }}
        >
          DealLens
        </a>
        <div
          style={{
            fontSize: '11px',
            color: '#6b6358',
            marginTop: '5px',
            fontFamily: "'Courier New', monospace",
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Marketlogic Investors LLC
        </div>
      </header>

      {/* Auth card */}
      <main
        style={{
          background: '#fbf8f0',
          border: '1px solid #d8d2c2',
          borderRadius: '12px',
          padding: '36px 40px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {children}
      </main>

      <footer
        style={{
          marginTop: '32px',
          fontSize: '12px',
          color: '#6b6358',
          fontFamily: "'Courier New', monospace",
        }}
      >
        &copy; {new Date().getFullYear()} Marketlogic Investors LLC
      </footer>
    </div>
  );
}
