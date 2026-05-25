'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { PDFViewer, type Citation } from '@/components/deal/PDFViewer';
import { DealChat } from '@/components/deal/DealChat';
import { cn } from '@/lib/cn';

interface DealData {
  id: string;
  name: string;
  stage?: string;
  status?: string;
  files?: Array<{ id: string; storage_path?: string; document_id?: string }>;
  run?: {
    id: string;
    status: string;
    swarm_output?: any;
  } | null;
}

interface DealQAPageProps {
  params: Promise<{ id: string }>;
}

// Mobile tab type
type MobileTab = 'pdf' | 'chat';

export default function DealQAPage({ params }: DealQAPageProps) {
  const { id } = use(params);
  const [deal, setDeal] = useState<DealData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Split-pane state
  const [splitPercent, setSplitPercent] = useState(55);
  const [isDragging, setIsDragging] = useState(false);

  // Citation state shared between PDF viewer and chat
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);

  // Mobile tabs
  const [mobileTab, setMobileTab] = useState<MobileTab>('pdf');

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const res = await fetch(`/deals/${id}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DealData = await res.json();
        setDeal(data);

        // Get PDF URL from deal files
        const firstFile = data.files?.[0];
        if (firstFile?.storage_path) {
          // Try to get a signed URL
          const signedRes = await fetch(`/api/deals/${id}/pdf-url`);
          if (signedRes.ok) {
            const { url } = await signedRes.json();
            setPdfUrl(url);
          }
        }
        if (firstFile?.document_id) {
          setDocumentId(firstFile.document_id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDeal();
  }, [id]);

  // Split-pane drag handlers
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startPercent = splitPercent;
    const containerWidth = document.body.clientWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const newPercent = startPercent + (dx / containerWidth) * 100;
      setSplitPercent(Math.max(25, Math.min(75, newPercent)));
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [splitPercent]);

  const handleCitationClick = useCallback(
    (citationIndex: number, citations: Citation[]) => {
      setActiveCitations(citations);
      setActiveCitationIndex(citationIndex);
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)] bg-[#09090b]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-white/40">Loading deal...</p>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-48px)] bg-[#09090b]">
        <div className="text-center space-y-2">
          <p className="text-sm text-err">{error || 'Deal not found'}</p>
          <a href="/deals" className="text-xs text-accent hover:underline">
            Back to deals
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-[#09090b] overflow-hidden">
      {/* Deal header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/deals"
            className="text-white/30 hover:text-white/60 transition-colors shrink-0"
            aria-label="Back to deals"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white truncate">{deal.name}</h1>
            <p className="text-xs text-white/30 font-mono">
              {deal.stage && <span className="capitalize">{deal.stage}</span>}
              {deal.status && (
                <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-white/5 text-white/40">
                  {deal.status}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deal.run?.status === 'done' && (
            <a
              href={`/deal/${id}/memo`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent hover:bg-accent/25 transition-colors"
            >
              View Memo
            </a>
          )}
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="flex sm:hidden border-b border-white/[0.07] shrink-0">
        <button
          onClick={() => setMobileTab('pdf')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            mobileTab === 'pdf'
              ? 'text-white border-b-2 border-accent'
              : 'text-white/40 hover:text-white/60'
          )}
        >
          PDF
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            mobileTab === 'chat'
              ? 'text-white border-b-2 border-accent'
              : 'text-white/40 hover:text-white/60'
          )}
        >
          Chat
        </button>
      </div>

      {/* Split pane — desktop */}
      <div className="hidden sm:flex flex-1 overflow-hidden">
        {/* PDF pane */}
        <div style={{ width: `${splitPercent}%` }} className="flex flex-col overflow-hidden">
          <PDFViewer
            pdfUrl={pdfUrl || ''}
            citations={activeCitations}
            activeCitation={activeCitationIndex}
          />
        </div>

        {/* Draggable divider */}
        <div
          onMouseDown={handleDividerMouseDown}
          className={cn(
            'w-1 shrink-0 cursor-col-resize hover:bg-accent/40 transition-colors relative group',
            isDragging ? 'bg-accent/40' : 'bg-white/[0.07]'
          )}
        >
          <div className="absolute inset-y-0 -left-1.5 -right-1.5 group-hover:bg-accent/10 transition-colors rounded" />
        </div>

        {/* Chat pane */}
        <div className="flex-1 overflow-hidden">
          <DealChat
            dealId={id}
            documentId={documentId}
            onCitationClick={handleCitationClick}
          />
        </div>
      </div>

      {/* Mobile: show one pane at a time */}
      <div className="sm:hidden flex-1 overflow-hidden">
        {mobileTab === 'pdf' ? (
          <PDFViewer
            pdfUrl={pdfUrl || ''}
            citations={activeCitations}
            activeCitation={activeCitationIndex}
          />
        ) : (
          <DealChat
            dealId={id}
            documentId={documentId}
            onCitationClick={handleCitationClick}
          />
        )}
      </div>
    </div>
  );
}
