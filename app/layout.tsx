import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'DealLens · Marketlogic Investors',
  description:
    'Agent-driven deal analysis for venture investors. Intake, research, and IC memos in minutes.',
};

/**
 * Root layout for the Next.js app shell.
 *
 * The existing static .html files (app.html, deal.html, deals.html, etc.) live
 * outside the /app directory and continue to be served by GitHub Pages or as
 * static assets.  This Next.js layout is for auth-gated routes and API routes.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body
        style={{
          margin: 0,
          background: '#f5f1e8',
          color: '#1a1a1a',
          fontFamily: "Georgia, 'Times New Roman', serif",
          lineHeight: 1.55,
        }}
      >
        {children}
      </body>
    </html>
  );
}
