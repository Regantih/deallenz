'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { cn } from '@/lib/cn';

// Configure pdf.js worker — served from /public to avoid webpack ESM bundling issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface Citation {
  page: number;
  text: string;
  boundingBox?: { top: number; left: number; width: number; height: number };
}

interface PDFViewerProps {
  pdfUrl: string;
  citations?: Citation[];
  activeCitation?: number | null;
  onPageChange?: (page: number) => void;
}

export function PDFViewer({
  pdfUrl,
  citations = [],
  activeCitation,
  onPageChange,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const pageRef = useRef<HTMLDivElement>(null);

  // Jump to cited page when activeCitation changes
  useEffect(() => {
    if (activeCitation == null) return;
    const citation = citations[activeCitation];
    if (!citation) return;
    setCurrentPage(citation.page);
    onPageChange?.(citation.page);
  }, [activeCitation, citations, onPageChange]);

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, numPages || 1));
      setCurrentPage(clamped);
      onPageChange?.(clamped);
    },
    [numPages, onPageChange]
  );

  const activeCitationData =
    activeCitation != null ? citations[activeCitation] ?? null : null;
  const showHighlight =
    activeCitationData != null && activeCitationData.page === currentPage;

  // Highlight matching text in the text layer after page renders
  useEffect(() => {
    if (!showHighlight || !activeCitationData || !pageRef.current) return;

    // Short delay so react-pdf finishes injecting the text layer
    const timer = setTimeout(() => {
      const textLayer = pageRef.current?.querySelector(
        '.react-pdf__Page__textContent'
      );
      if (!textLayer) return;

      // Clear previous highlights
      textLayer.querySelectorAll('.dl-citation-highlight').forEach((el) => {
        el.classList.remove('dl-citation-highlight');
      });

      // Find text layer spans that contain the first ~60 chars of the citation
      const needle = activeCitationData.text.slice(0, 60).toLowerCase();
      const spans = Array.from(textLayer.querySelectorAll('span'));
      let buffer = '';
      const candidates: Element[] = [];

      for (const span of spans) {
        const chunk = (span.textContent ?? '').toLowerCase();
        buffer += chunk;
        candidates.push(span);

        if (buffer.includes(needle)) {
          candidates.forEach((s) => s.classList.add('dl-citation-highlight'));
          break;
        }
        // Sliding window — don't keep too much context
        if (buffer.length > needle.length * 4) {
          buffer = buffer.slice(-needle.length * 2);
          candidates.splice(0, Math.max(0, candidates.length - 4));
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [showHighlight, activeCitationData, currentPage]);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.07] shrink-0 flex-wrap">
        {/* Page nav */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-xs text-white/40 font-mono tabular-nums">
          {currentPage}
          {numPages > 0 && <span className="text-white/20"> / {numPages}</span>}
        </span>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={numPages > 0 && currentPage >= numPages}
          className="p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}
            className="px-1.5 py-0.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors text-xs font-mono leading-none"
          >
            −
          </button>
          <span className="text-xs text-white/20 font-mono w-9 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))}
            className="px-1.5 py-0.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors text-xs font-mono leading-none"
          >
            +
          </button>
        </div>

        {/* Citation jump chips */}
        {citations.length > 0 && (
          <div className="flex items-center gap-1 ml-auto flex-wrap">
            <span className="text-[10px] text-white/20 font-mono">src</span>
            {citations.slice(0, 7).map((c, i) => (
              <button
                key={i}
                onClick={() => goToPage(c.page)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono transition-colors',
                  activeCitation === i
                    ? 'bg-[#6366f1] text-white'
                    : 'bg-[#6366f1]/10 text-[#6366f1]/70 hover:bg-[#6366f1]/20'
                )}
              >
                p.{c.page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PDF canvas */}
      <div className="relative flex-1 overflow-auto flex justify-center py-4 px-2">
        {pdfUrl ? (
          <div ref={pageRef} className="relative">
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={
                <div className="flex items-center justify-center w-[600px] h-64 text-white/20 text-sm">
                  <span className="animate-pulse">Loading…</span>
                </div>
              }
              error={
                <div className="flex items-center justify-center w-[600px] h-64 text-red-400/60 text-sm">
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer
                renderAnnotationLayer={false}
                className="shadow-2xl"
              />
            </Document>

            {/* Bounding-box overlay (when AI provides coordinates) */}
            {showHighlight && activeCitationData?.boundingBox && (
              <div
                className="absolute pointer-events-none rounded transition-all duration-300"
                style={{
                  top: `${activeCitationData.boundingBox.top}%`,
                  left: `${activeCitationData.boundingBox.left}%`,
                  width: `${activeCitationData.boundingBox.width}%`,
                  height: `${activeCitationData.boundingBox.height}%`,
                  background: 'rgba(99,102,241,0.2)',
                  border: '2px solid rgba(99,102,241,0.6)',
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-white/20 text-sm">
            No PDF loaded
          </div>
        )}
      </div>

      {/* Active citation text strip */}
      {showHighlight && activeCitationData && (
        <div className="px-4 py-3 border-t border-white/[0.07] bg-[#6366f1]/5 shrink-0">
          <p className="text-[10px] text-[#6366f1]/60 font-mono mb-1 uppercase tracking-wider">
            Source · Page {activeCitationData.page}
          </p>
          <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
            {activeCitationData.text}
          </p>
        </div>
      )}
    </div>
  );
}
