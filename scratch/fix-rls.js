#!/usr/bin/env node
/**
 * fix-rls.js
 * Bug 8 fix: Supabase RLS permissions + swarm_output column
 * Uses the Supabase Management REST API.
 *
 * Run with: node scratch/fix-rls.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kipyuhjbtkyhfapinwgj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
const PROJECT_REF = 'kipyuhjbtkyhfapinwgj';

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SECRET_KEY not found in .env.local');
  process.exit(1);
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const reqOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...options.headers,
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function executeSQLViaManagementAPI(sql) {
  return httpsRequest({
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  }, { query: sql });
}

// Fallback: Use Supabase REST rpc endpoint
async function executeSQLViaRPC(sql) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
  return httpsRequest({
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  }, { sql });
}

async function main() {
  console.log('=== Bug 8: Supabase RLS Fix ===\n');

  const statements = [
    'GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated',
    'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, anon, authenticated',
    'ALTER TABLE public.deal_runs ADD COLUMN IF NOT EXISTS swarm_output JSONB',
  ];

  let atLeastOneWorked = false;

  for (const sql of statements) {
    console.log(`SQL: ${sql.slice(0, 70)}...`);

    // Try Management API first
    try {
      const res = await executeSQLViaManagementAPI(sql);
      if (res.status >= 200 && res.status < 300) {
        console.log(`  ✓ Management API (${res.status})`);
        atLeastOneWorked = true;
        continue;
      } else {
        console.log(`  ✗ Management API returned ${res.status}: ${res.body.slice(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ✗ Management API error: ${err.message}`);
    }

    // Fallback: Try RPC
    try {
      const res = await executeSQLViaRPC(sql);
      if (res.status >= 200 && res.status < 300) {
        console.log(`  ✓ RPC fallback (${res.status})`);
        atLeastOneWorked = true;
      } else {
        console.log(`  ✗ RPC returned ${res.status}: ${res.body.slice(0, 100)}`);
      }
    } catch (err) {
      console.log(`  ✗ RPC error: ${err.message}`);
    }
  }

  // Verify swarm_output column via JS SDK
  console.log('\n--- Verifying swarm_output column ---');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data, error } = await supabase
      .from('deal_runs')
      .select('swarm_output')
      .limit(0);

    if (error) {
      if (error.code === '42703') {
        console.log('COLUMN MISSING: swarm_output not in deal_runs. Please run SQL manually via Supabase Dashboard.');
        console.log('\nSQL to run:\nALTER TABLE public.deal_runs ADD COLUMN IF NOT EXISTS swarm_output JSONB;');
      } else {
        console.log(`Error checking column: ${error.message} (code: ${error.code})`);
      }
    } else {
      console.log('swarm_output column EXISTS and is accessible via service_role.');
    }
  } catch (err) {
    console.log(`Could not verify via JS SDK: ${err.message}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
