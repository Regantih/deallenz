#!/usr/bin/env node

/**
 * DealLens Acceptance Test Suite
 * 
 * Run: node tests/acceptance.js
 * 
 * This script makes REAL HTTP requests to the running dev server
 * and verifies REAL response payloads. It does not mock anything.
 * 
 * Every test prints PASS or FAIL with actual vs expected on failure.
 * Exit code 0 = all pass. Exit code 1 = any failure.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const BASE = 'http://localhost:3000';
const ENV_PATH = path.join(__dirname, '..', '.env.local');

// ── Helpers ──────────────────────────────────────────────

function loadEnv() {
  const raw = fs.readFileSync(ENV_PATH, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const ENV = loadEnv();

const supabaseAdmin = createClient(
  ENV.NEXT_PUBLIC_SUPABASE_URL || ENV.SUPABASE_URL,
  ENV.SUPABASE_SECRET_KEY || ENV.SUPABASE_SERVICE_ROLE_KEY,
);

let passed = 0;
let failed = 0;
const failures = [];

function pass(name) {
  passed++;
  console.log(`  ✅ PASS: ${name}`);
}

function fail(name, expected, actual) {
  failed++;
  const msg = `  ❌ FAIL: ${name}\n     Expected: ${expected}\n     Actual:   ${actual}`;
  console.log(msg);
  failures.push({ name, expected, actual });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Test 1: Health Check ─────────────────────────────────

async function test1_health() {
  console.log('\n── Test 1: Health Check ──');
  try {
    const r = await fetch(`${BASE}/api/health`);
    if (r.status !== 200) {
      fail('HTTP status', '200', r.status);
      return;
    }
    const data = await r.json();
    if (data.supabase !== 'ok') fail('supabase field', 'ok', data.supabase);
    else pass('supabase = ok');

    if (data.anthropic !== 'ok') fail('anthropic field', 'ok', data.anthropic);
    else pass('anthropic = ok');
  } catch (e) {
    fail('Server reachable', 'HTTP 200', e.message);
  }
}

// ── Test 2: PDF Upload Returns Text ──────────────────────

let uploadedDocumentId = null;
let uploadedText = '';

async function test2_upload() {
  console.log('\n── Test 2: PDF Upload Returns Text ──');
  
  // Find a PDF in ~/Downloads
  const downloadsDir = path.join(require('os').homedir(), 'Downloads');
  let pdfPath = null;
  
  try {
    const files = fs.readdirSync(downloadsDir);
    const pdf = files.find(f => f.toLowerCase().endsWith('.pdf'));
    if (pdf) pdfPath = path.join(downloadsDir, pdf);
  } catch {}
  
  if (!pdfPath) {
    // Create a minimal test PDF
    pdfPath = path.join(__dirname, 'test.pdf');
    // Try to find any PDF on the system
    const altPaths = [
      '/home/neuralspark/Downloads/Emerald AI Investment Memo (V2) (2).pdf',
      '/home/neuralspark/deallens/test.pdf',
    ];
    for (const p of altPaths) {
      if (fs.existsSync(p)) { pdfPath = p; break; }
    }
  }
  
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    fail('PDF file exists', 'a .pdf file in ~/Downloads/', 'No PDF found');
    return;
  }
  
  console.log(`  Using PDF: ${pdfPath}`);
  
  try {
    const fileBuffer = fs.readFileSync(pdfPath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', blob, path.basename(pdfPath));
    
    const r = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      body: form,
      headers: { 'x-bypass-auth': 'true' },
    });
    
    if (r.status !== 200) {
      const errBody = await r.text();
      fail('Upload HTTP status', '200', `${r.status}: ${errBody.slice(0, 200)}`);
      return;
    }
    
    const data = await r.json();
    
    if (!data.ok && !data.success) {
      fail('Upload success', 'ok: true', JSON.stringify(data).slice(0, 200));
      return;
    }
    pass('Upload returns 200 OK');
    
    if (!data.pagesCount || data.pagesCount < 1) {
      fail('pagesCount', '> 0', data.pagesCount);
    } else {
      pass(`pagesCount = ${data.pagesCount}`);
    }
    
    if (!data.text || data.text.length < 100) {
      fail('text field returned', 'string length > 100', 
        data.text === undefined ? 'undefined' : 
        data.text === null ? 'null' : 
        `string length ${(data.text || '').length}`);
    } else {
      pass(`text returned (${data.text.length} chars)`);
      uploadedText = data.text;
    }
    
    if (!data.documentId) {
      fail('documentId', 'UUID string', data.documentId);
    } else {
      pass(`documentId = ${data.documentId}`);
      uploadedDocumentId = data.documentId;
    }
  } catch (e) {
    fail('Upload request', 'successful response', e.message);
  }
}

// ── Test 3: Anthropic API Model Works ────────────────────

async function test3_anthropic() {
  console.log('\n── Test 3: Anthropic API Model Works ──');
  
  const apiKey = ENV.ANTHROPIC_API_KEY;
  if (!apiKey) {
    fail('ANTHROPIC_API_KEY', 'present in .env.local', 'missing');
    return;
  }
  
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 50,
        messages: [{ role: 'user', content: 'Reply with exactly one word: PING' }],
      }),
    });
    
    if (r.status === 404) {
      const err = await r.json();
      fail('Model exists', 'claude-sonnet-4-5-20250929 accessible', 
        `404: ${err.error?.message || 'model not found'}`);
      return;
    }
    
    if (r.status !== 200) {
      const err = await r.text();
      fail('Anthropic API call', '200', `${r.status}: ${err.slice(0, 200)}`);
      return;
    }
    
    const data = await r.json();
    const text = data.content?.[0]?.text || '';
    if (text.toUpperCase().includes('PING')) {
      pass(`Model responded: "${text.trim()}"`);
    } else {
      fail('Model response', 'contains PING', text.slice(0, 100));
    }
  } catch (e) {
    fail('Anthropic API reachable', 'successful response', e.message);
  }
}

// ── Test 4: Deal Creation ────────────────────────────────

let createdDealId = null;

async function test4_deal_creation() {
  console.log('\n── Test 4: Deal Creation ──');
  
  try {
    const r = await fetch(`${BASE}/api/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-auth': 'true',
      },
      body: JSON.stringify({
        name: 'Acceptance Test Corp',
        stage: 'seed',
        sector: 'saas',
        thesis: 'Automated acceptance testing for VC platforms',
        ask: 5000000,
        arr: 100000,
      }),
    });
    
    if (r.status !== 200 && r.status !== 201) {
      const errBody = await r.text();
      fail('Deal creation HTTP', '200/201', `${r.status}: ${errBody.slice(0, 200)}`);
      return;
    }
    
    const data = await r.json();
    
    if (!data.ok && !data.deal_id && !data.id) {
      fail('Deal creation response', 'ok: true or deal_id present', JSON.stringify(data).slice(0, 200));
      return;
    }
    
    createdDealId = data.deal_id || data.id;
    pass(`Deal created: ${createdDealId}`);
    
    // Verify in DB
    const { data: dbDeal } = await supabaseAdmin
      .from('deals')
      .select('*')
      .eq('id', createdDealId)
      .single();
    
    if (!dbDeal) {
      fail('Deal in database', 'found', 'not found');
    } else {
      pass(`Deal verified in database: ${dbDeal.name}`);
    }
  } catch (e) {
    fail('Deal creation', 'successful', e.message);
  }
}

// ── Test 5: Swarm Run Completes ──────────────────────────

async function test5_swarm_run() {
  console.log('\n── Test 5: Swarm Run Completes ──');
  
  // Use the Innerwell deal if we don't have a created one with files
  let dealId = createdDealId;
  
  // Find a deal that has linked files (needed for pitch deck text)
  const { data: dealsWithFiles } = await supabaseAdmin
    .from('deal_files')
    .select('deal_id')
    .limit(1);
  
  if (dealsWithFiles && dealsWithFiles.length > 0) {
    dealId = dealsWithFiles[0].deal_id;
    console.log(`  Using deal with files: ${dealId}`);
  } else if (!dealId) {
    fail('Deal for swarm test', 'a deal_id with linked files', 'no deals with files found');
    return;
  }
  
  try {
    const r = await fetch(`${BASE}/api/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bypass-auth': 'true',
      },
      body: JSON.stringify({ deal_id: dealId }),
    });
    
    if (r.status !== 200) {
      const errBody = await r.text();
      fail('Swarm trigger HTTP', '200', `${r.status}: ${errBody.slice(0, 300)}`);
      return;
    }
    
    const data = await r.json();
    if (!data.ok) {
      fail('Swarm trigger response', 'ok: true', JSON.stringify(data).slice(0, 200));
      return;
    }
    
    const runId = data.run_id;
    pass(`Swarm triggered: run_id=${runId}`);
    
    // Poll for completion
    const maxWait = 180000; // 3 minutes
    const pollInterval = 5000;
    const startTime = Date.now();
    let finalStatus = null;
    let swarmOutput = null;
    
    console.log('  Polling for completion (max 3 min)...');
    
    while (Date.now() - startTime < maxWait) {
      await sleep(pollInterval);
      
      const { data: run } = await supabaseAdmin
        .from('deal_runs')
        .select('status, swarm_output')
        .eq('id', runId)
        .single();
      
      if (!run) continue;
      
      process.stdout.write(`  Status: ${run.status} (${Math.round((Date.now() - startTime) / 1000)}s)\r`);
      
      if (run.status === 'done') {
        finalStatus = 'done';
        swarmOutput = run.swarm_output;
        break;
      }
      
      if (run.status === 'failed') {
        finalStatus = 'failed';
        break;
      }
    }
    
    console.log(''); // newline after \r
    
    if (finalStatus === 'failed') {
      fail('Swarm completion', 'status: done', 'status: failed');
      return;
    }
    
    if (finalStatus !== 'done') {
      fail('Swarm completion', 'done within 3 min', `timeout (last status: ${finalStatus})`);
      return;
    }
    
    pass('Swarm completed with status: done');
    
    // Verify chapters
    if (!swarmOutput) {
      fail('swarm_output', 'JSONB with chapters', 'null');
      return;
    }
    
    const chapters = swarmOutput.chapters || swarmOutput;
    
    if (!Array.isArray(chapters)) {
      // Check if it's an object with numbered keys
      const chapterArray = Object.values(chapters).filter(c => c && typeof c === 'object');
      if (chapterArray.length < 10) {
        fail('Chapter count', '14 chapters', `${chapterArray.length} chapters`);
      } else {
        pass(`${chapterArray.length} chapters found`);
      }
    } else {
      if (chapters.length < 10) {
        fail('Chapter count', '~14 chapters', `${chapters.length} chapters`);
      } else {
        pass(`${chapters.length} chapters found`);
      }
    }
    
    // Check for code fence contamination
    const allBodies = JSON.stringify(swarmOutput);
    if (allBodies.includes('```json')) {
      fail('Code fence stripping', 'no ```json in chapter bodies', 'found ```json in output');
    } else {
      pass('No code fence contamination');
    }
    
  } catch (e) {
    fail('Swarm run', 'completed successfully', e.message);
  }
}

// ── Test 6: No Hardcoded Deprecated Models ───────────────

async function test6_no_deprecated_models() {
  console.log('\n── Test 6: No Deprecated Model Names ──');
  
  const { execSync } = require('child_process');
  const projectRoot = path.join(__dirname, '..');
  
  const patterns = [
    'claude-3-5-sonnet',
    'claude-3-5-haiku', 
    'claude-sonnet-4-2025051',
  ];
  
  let foundAny = false;
  
  for (const pattern of patterns) {
    try {
      const result = execSync(
        `grep -r "${pattern}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.html" . | grep -v node_modules | grep -v \\.next | grep -v \\.git | grep -v "tests/acceptance" | grep -v scratch | head -5`,
        { cwd: projectRoot, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      
      if (result) {
        fail(`No "${pattern}"`, 'zero matches', result.split('\n')[0]);
        foundAny = true;
      }
    } catch {
      // grep returns exit code 1 when no matches — that's what we want
    }
  }
  
  if (!foundAny) {
    pass('No deprecated model names in codebase');
  }
}

// ── Test 7: Environment Config ───────────────────────────

async function test7_env_config() {
  console.log('\n── Test 7: Environment Configuration ──');
  
  if (ENV.USE_LOCAL_LLM === 'false') {
    pass('USE_LOCAL_LLM=false');
  } else {
    fail('USE_LOCAL_LLM', 'false', ENV.USE_LOCAL_LLM || 'not set (defaults to true!)');
  }
  
  if (ENV.USE_LOCAL_EMBEDDINGS === 'false') {
    pass('USE_LOCAL_EMBEDDINGS=false');
  } else {
    fail('USE_LOCAL_EMBEDDINGS', 'false', ENV.USE_LOCAL_EMBEDDINGS || 'not set');
  }
  
  if (ENV.USE_MOCKS === 'false' || !ENV.USE_MOCKS) {
    pass('USE_MOCKS is false or unset');
  } else {
    fail('USE_MOCKS', 'false', ENV.USE_MOCKS);
  }
  
  if (ENV.ANTHROPIC_API_KEY && ENV.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    pass('ANTHROPIC_API_KEY present');
  } else {
    fail('ANTHROPIC_API_KEY', 'sk-ant-... key', ENV.ANTHROPIC_API_KEY ? 'invalid format' : 'missing');
  }
  
  // Check that lib/llm.ts doesn't default USE_LOCAL_LLM to true
  const llmPath = path.join(__dirname, '..', 'lib', 'llm.ts');
  if (fs.existsSync(llmPath)) {
    const llmCode = fs.readFileSync(llmPath, 'utf-8');
    if (llmCode.includes("!== 'false'") && llmCode.includes('USE_LOCAL_LLM')) {
      fail('LLM default', 'USE_LOCAL_LLM defaults to false', 
        'Code uses !== "false" which defaults to true when env var is missing');
    } else {
      pass('LLM local default is safe');
    }
  }
}

// ── Test 8: File Sync Check ──────────────────────────────

async function test8_file_sync() {
  console.log('\n── Test 8: Root/Public HTML Sync ──');
  
  const projectRoot = path.join(__dirname, '..');
  const pairs = [
    ['submit.html', 'public/submit.html'],
    ['deals.html', 'public/deals.html'],
    ['deal.html', 'public/deal.html'],
  ];
  
  for (const [root, pub] of pairs) {
    const rootPath = path.join(projectRoot, root);
    const pubPath = path.join(projectRoot, pub);
    
    if (!fs.existsSync(rootPath) || !fs.existsSync(pubPath)) {
      fail(`${root} sync`, 'both files exist', 'one or both missing');
      continue;
    }
    
    const rootContent = fs.readFileSync(rootPath, 'utf-8');
    const pubContent = fs.readFileSync(pubPath, 'utf-8');
    
    if (rootContent === pubContent) {
      pass(`${root} === ${pub}`);
    } else {
      fail(`${root} sync`, 'identical content', `files differ (root: ${rootContent.length} chars, public: ${pubContent.length} chars)`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   DealLens Acceptance Test Suite v1.0    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Server: ${BASE}`);
  console.log(`Supabase: ${ENV.NEXT_PUBLIC_SUPABASE_URL || ENV.SUPABASE_URL}`);
  
  // Quick server check
  try {
    await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
  } catch {
    console.error('\n❌ FATAL: Dev server not responding at localhost:3000');
    console.error('   Start it with: rm -rf .next && npm run dev -- -H 0.0.0.0');
    process.exit(1);
  }
  
  await test1_health();
  await test2_upload();
  await test3_anthropic();
  await test4_deal_creation();
  // Test 5 (swarm) is slow — run it last among the functional tests
  await test6_no_deprecated_models();
  await test7_env_config();
  await test8_file_sync();
  
  // Only run the slow swarm test if all fast tests passed
  if (failed === 0) {
    console.log('\n── All fast tests passed. Running swarm integration test... ──');
    await test5_swarm_run();
  } else {
    console.log('\n⚠️  Skipping swarm test (Test 5) — fix the failures above first.');
  }
  
  // Summary
  console.log('\n══════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  
  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) {
      console.log(`    • ${f.name}`);
      console.log(`      Expected: ${f.expected}`);
      console.log(`      Actual:   ${f.actual}`);
    }
  }
  
  console.log('══════════════════════════════════════════');
  
  if (failed > 0) {
    console.log('\n❌ ACCEPTANCE TESTS FAILED — Do not claim the app is working.');
    process.exit(1);
  } else {
    console.log('\n✅ ALL ACCEPTANCE TESTS PASSED.');
    process.exit(0);
  }
}

main().catch(e => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
