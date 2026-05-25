'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

interface AppHeaderProps {
  dealName?: string;
}

export function AppHeader({ dealName }: AppHeaderProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/deals', label: 'Deals' },
    { href: '/submit', label: 'Submit' },
  ];

  if (dealName) {
    navLinks.push({ href: pathname, label: dealName });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-4 border-b border-white/[0.07] backdrop-blur-xl bg-black/85">
      {/* Logo */}
      <Link
        href="/deals"
        className="flex items-center gap-1.5 mr-6 shrink-0"
      >
        <span className="text-sm font-semibold tracking-tight text-white">
          DealLens
        </span>
        <span className="text-white/20 text-sm">·</span>
        <span className="text-xs text-white/40 font-medium tracking-wide">
          Marketlogic
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href + link.label}
            href={link.href}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
              pathname === link.href || (link.href !== '/deals' && link.href !== '/submit' && pathname.startsWith(link.href))
                ? 'text-white bg-white/10'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Keyboard hint */}
      <div className="hidden sm:flex items-center gap-1 text-white/20 text-xs font-mono">
        <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px]">
          ⌘K
        </span>
        <span>search</span>
      </div>
    </header>
  );
}
