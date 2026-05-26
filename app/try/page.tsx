'use client';

import { useState } from 'react';

export default function TryPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    if (url) fd.append('url', url);
    if (text) fd.append('text', text);
    if (name) fd.append('name', name);

    try {
      const res = await fetch('/api/try', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.ok) setError(json.detail || json.error || 'Failed');
      else setResult(json);
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '4rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>DealLens — Try it</h1>
      <p style={{ color: '#555', marginTop: 8 }}>
        Drop a pitch deck (PDF), paste a data-room link, or add notes. The 5-agent swarm runs on real Claude Sonnet + Haiku and returns a 14-chapter memo. No login.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: 'grid', gap: 16 }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Deal name (optional)</div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Files (PDF, decks, images, CSV…)</div>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 13, color: '#555' }}>
              {files.length} file(s) selected
            </div>
          )}
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>URL (optional)</div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes / pasted text (optional)</div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Thesis, founder background, anything you want the agents to consider…"
            style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: loading ? '#888' : '#111',
            color: '#fff',
            border: 0,
            borderRadius: 8,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Running 5-agent swarm… (~90s)' : 'Analyze'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 24, padding: 12, background: '#fee', border: '1px solid #f99', borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {result && (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Memo ready</h2>
          <p>
            <a href={result.memo_url} style={{ color: '#06f' }}>Open full memo →</a>
          </p>
          <p style={{ fontSize: 13, color: '#555' }}>
            Cost: ${result.cost_ledger?.total_usd?.toFixed(4)} · tokens in:{' '}
            {result.cost_ledger?.total_tokens_in} · tokens out:{' '}
            {result.cost_ledger?.total_tokens_out}
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 16,
              background: '#fafafa',
              border: '1px solid #eee',
              borderRadius: 8,
              maxHeight: 480,
              overflow: 'auto',
              fontSize: 12,
            }}
          >
            {JSON.stringify(result.swarm_output, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
