import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import SignupForm from './SignupForm';

export const metadata: Metadata = { title: 'Create account · DealLens' };

/**
 * /signup — Server Component
 *
 * Redirects already-authenticated users to the pipeline.
 * Renders SignupForm for new users.
 */
export default async function SignupPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect('/deals.html');

  return <SignupForm />;
}
