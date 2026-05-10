import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in · DealLens' };

/**
 * /login — Server Component
 *
 * Checks the current session.  If already authenticated, redirects to the
 * pipeline page.  Otherwise renders the LoginForm client component.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const params = await searchParams;
    redirect(params.next ?? '/deals.html');
  }

  const params = await searchParams;
  return <LoginForm errorFromUrl={params.error} />;
}
