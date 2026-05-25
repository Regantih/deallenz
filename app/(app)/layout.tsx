import type { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <div className="pt-12 min-h-screen">{children}</div>
    </>
  );
}
