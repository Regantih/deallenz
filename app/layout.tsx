import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'DealLens · Marketlogic Investors',
  description:
    'Agent-driven deal analysis for venture investors. Intake, research, and IC memos in minutes.',
};

/**
 * Root layout for the Next.js app shell.
 *
 * The existing static .html files (app.html, deal.html, deals.html, etc.) live
 * outside the /app directory and continue to be served as static assets.
 * This Next.js layout is for the React UI routes and API routes.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head />
      <body className="bg-[#09090b] text-[#fafafa] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
