'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';

// ----------- Types -----------

interface ExtractedMeta {
  company: string;
  sector: string;
  stage: string;
  raise: string;
}

type UploadState = 'idle' | 'processing' | 'done' | 'submitting';

// ----------- MetadataChips -----------

interface MetadataChipsProps {
  meta: ExtractedMeta;
  onChange: (meta: ExtractedMeta) => void;
}

function MetadataChips({ meta, onChange }: MetadataChipsProps) {
  const fields: Array<{ key: keyof ExtractedMeta; label: string; placeholder: string }> = [
    { key: 'company', label: 'Company', placeholder: 'Company name' },
    { key: 'sector', label: 'Sector', placeholder: 'e.g. SaaS, FinTech' },
    { key: 'stage', label: 'Stage', placeholder: 'e.g. Seed, Series A' },
    { key: 'raise', label: 'Raise', placeholder: 'e.g. $3M' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {fields.map(({ key, label, placeholder }) => (
        <div
          key={key}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-sm"
        >
          <span className="text-accent/60 text-xs font-mono uppercase tracking-wider">{label}</span>
          <input
            type="text"
            value={meta[key]}
            onChange={(e) => onChange({ ...meta, [key]: e.target.value })}
            placeholder={placeholder}
            className="bg-transparent border-none outline-none text-white text-sm w-28 placeholder:text-white/30"
          />
        </div>
      ))}
    </div>
  );
}

// ----------- UploadZone -----------

interface UploadZoneProps {
  state: UploadState;
  progress: number;
  meta: ExtractedMeta | null;
  onFileDrop: (file: File) => void;
  onMetaChange: (meta: ExtractedMeta) => void;
}

function UploadZone({ state, progress, meta, onFileDrop, onMetaChange }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') {
        onFileDrop(file);
      }
    },
    [onFileDrop]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileDrop(file);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => state === 'idle' && inputRef.current?.click()}
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
        state === 'idle'
          ? isDragging
            ? 'border-accent/70 bg-accent/10 cursor-copy scale-[1.01]'
            : 'border-white/10 hover:border-white/20 bg-surface cursor-pointer hover:bg-surface-2'
          : 'border-white/10 bg-surface cursor-default',
        'min-h-48 flex flex-col items-center justify-center p-8'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="transition-opacity duration-200">
        {state === 'idle' && (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
              <svg className="w-6 h-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Drop pitch deck PDF</p>
              <p className="text-xs text-white/30 mt-1">or click to browse</p>
            </div>
            <p className="text-xs text-white/20 font-mono">PDF up to 50MB</p>
          </div>
        )}

        {state === 'processing' && (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
            <p className="text-sm text-white/70">Extracting text from PDF...</p>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-400"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/30 font-mono">{Math.round(progress)}%</p>
          </div>
        )}

        {(state === 'done' || state === 'submitting') && meta && (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-ok/20 border border-ok/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-white/60">Metadata extracted — confirm below</p>
            <MetadataChips meta={meta} onChange={onMetaChange} />
          </div>
        )}
      </div>
    </div>
  );
}

// ----------- Submit Button -----------

interface SubmitButtonProps {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

function SubmitButton({ disabled, loading, onClick }: SubmitButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'w-full py-3 px-6 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2',
        disabled || loading
          ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
          : 'bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/25 hover:scale-[1.01] active:scale-[0.99]'
      )}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Starting analysis...</span>
        </>
      ) : (
        <>
          <span>Start Analysis</span>
          <span className="text-white/60">→</span>
        </>
      )}
    </button>
  );
}

// ----------- Page -----------

export default function SubmitPage() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [meta, setMeta] = useState<ExtractedMeta | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = async (file: File) => {
    setUploadState('processing');
    setProgress(10);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 8, 85));
      }, 400);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(95);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setProgress(100);

      // Extract basic metadata from response or text
      const text: string = data.text || '';
      setExtractedText(text);
      setDocumentId(data.documentId || null);

      // Simple heuristic extraction for chips
      const companyMatch = text.match(/^([A-Z][a-zA-Z\s]{2,30})\s*(?:Inc|LLC|Corp|AI|Technologies)?/m);
      const raiseMatch = text.match(/\$\s*(\d+\.?\d*)\s*(M|million|B|billion)/i);
      const stageMatch = text.match(/\b(pre-seed|seed|series\s+[a-d]|growth|late stage)\b/i);
      const sectorTerms = ['SaaS', 'FinTech', 'HealthTech', 'EdTech', 'AI', 'ML', 'CleanTech', 'PropTech', 'Crypto', 'Web3', 'DevTools', 'Cybersecurity', 'MarketTech'];
      const sectorMatch = sectorTerms.find((s) => text.toLowerCase().includes(s.toLowerCase()));

      setMeta({
        company: data.company || companyMatch?.[1]?.trim() || '',
        sector: sectorMatch || data.sector || '',
        stage: stageMatch?.[0]?.trim() || data.stage || '',
        raise: raiseMatch ? `$${raiseMatch[1]}${raiseMatch[2].toUpperCase()}` : data.raise || '',
      });

      setUploadState('done');
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploadState('idle');
      setProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!meta || !documentId) return;
    setUploadState('submitting');
    setError(null);

    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: meta.company,
          sector: meta.sector,
          stage: meta.stage.toLowerCase().replace(/\s+/g, '-'),
          thesis: `${meta.company} — ${meta.sector} ${meta.stage} raising ${meta.raise}`,
          ask: meta.raise,
          deck: documentId,
          text: extractedText,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create deal' }));
        throw new Error(err.error || 'Failed to create deal');
      }

      const data = await res.json();
      router.push(`/deal/${data.deal_id || data.id}`);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
      setUploadState('done');
    }
  };

  const isSubmittable = uploadState === 'done' && meta && meta.company.length > 0;

  return (
    <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            New Deal
          </h1>
          <p className="text-sm text-white/40">
            Upload a pitch deck PDF to start AI-powered analysis
          </p>
        </div>

        {/* Upload zone */}
        <UploadZone
          state={uploadState}
          progress={progress}
          meta={meta}
          onFileDrop={handleFileDrop}
          onMetaChange={setMeta}
        />

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-err/10 border border-err/20 text-sm text-err transition-opacity duration-200">
            {error}
          </div>
        )}

        {/* Submit */}
        <SubmitButton
          disabled={!isSubmittable}
          loading={uploadState === 'submitting'}
          onClick={handleSubmit}
        />

        {/* Footer hint */}
        <p className="text-center text-xs text-white/20">
          Analysis takes 90–120 seconds · 14-chapter IC memo generated automatically
        </p>
      </div>
    </main>
  );
}
