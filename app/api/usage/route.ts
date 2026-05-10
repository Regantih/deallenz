/**
 * app/api/usage/route.ts
 *
 * GET /api/usage
 *
 * Returns the current user’s usage counters and limit metadata.
 *
 * Response shape:
 * {
 *   ok: true,
 *   profile_id: string,
 *   plan: 'free' | 'pro' | 'team',
 *   is_owner: boolean,      // true → no usage caps
 *   month: 'YYYY-MM-DD',    // first day of current month
 *   usage: {
 *     deals_processed: number,
 *     usd_spent: number
 *   },
 *   limits: {
 *     deals: number | null,  // null = unlimited (owner or pro plan)
 *     usd:   number | null
 *   },
 *   within_limits: boolean
 * }
 *
 * Rules:
 *   - profiles.is_owner = true  → limits.deals = null, limits.usd = null
 *   - Free plan                  → 3 deals / month, $5 USD / month
 *   - Usage counter rows are created by the server after each finalized run.
 *     This endpoint is read-only.
 */

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const FREE_DEAL_LIMIT = 3;
const FREE_USD_LIMIT = 5;

export async function GET() {
  const supabase = await getSupabaseServerClient();

  // ------------------------------------------------------------------
  // Authenticate
  // ------------------------------------------------------------------
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: 'UNAUTHENTICATED',
        detail: 'Sign in to view usage.',
      },
      { status: 401 }
    );
  }

  // ------------------------------------------------------------------
  // Load profile (plan + is_owner)
  // ------------------------------------------------------------------
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, is_owner')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        ok: false,
        error: 'PROFILE_NOT_FOUND',
        detail:
          'Your profile was not found. This can happen if the auth trigger failed on first sign-in. Contact support.',
      },
      { status: 404 }
    );
  }

  // ------------------------------------------------------------------
  // Load current month’s usage counters
  // ------------------------------------------------------------------
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: usage } = await supabase
    .from('usage_counters')
    .select('deals_processed, usd_spent')
    .eq('profile_id', user.id)
    .eq('month', monthKey)
    .maybeSingle();

  const dealsProcessed = usage?.deals_processed ?? 0;
  const usdSpent = Number(usage?.usd_spent ?? 0);

  // ------------------------------------------------------------------
  // Build response
  // ------------------------------------------------------------------
  const isOwner = profile.is_owner;
  const plan = profile.plan;

  // Owners bypass all limits.  Future: extend for 'pro' / 'team' plans.
  const limits =
    isOwner
      ? { deals: null as null, usd: null as null }
      : { deals: FREE_DEAL_LIMIT, usd: FREE_USD_LIMIT };

  const withinLimits = isOwner
    ? true
    : dealsProcessed < FREE_DEAL_LIMIT && usdSpent < FREE_USD_LIMIT;

  return NextResponse.json({
    ok: true,
    profile_id: user.id,
    plan,
    is_owner: isOwner,
    month: monthKey,
    usage: {
      deals_processed: dealsProcessed,
      usd_spent: usdSpent,
    },
    limits,
    within_limits: withinLimits,
  });
}
