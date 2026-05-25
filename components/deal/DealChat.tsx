'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/lib/cn';
import type { Citation } from './PDFViewer';

// ----------- Types -----------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  confidence?: 'low' | 'contradiction' | 'normal';
  toolCalls?: string[];
  isStreaming?: boolean;
}

interface DealChatProps {
  dealId: string;
  documentId?: string | null;
  onCitationClick?: (citationIndex: number, citations: Citation[]) => void;
}

// ----------- Citation chip -----------

interface CitationChipProps {
  page: number;
  index: number;
  onClick: () => void;
  active?: boolean;
}

function CitationChip({ page, index, onClick, active }: CitationChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5 align-middle transition-colors',
        active
          ? 'bg-accent text-white'
          : 'bg-accent/15 text-accent hover:bg-accent/25'
      )}
      aria-label={`Go to page ${page}`}
    >
      p.{page}
    </button>
  );
}

// ----------- Confidence badge -----------

function ConfidenceBadge({ level }: { level: 'low' | 'contradiction' }) {
  if (level === 'low') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-warn/10 text-warn border border-warn/20">
        <span className="w-1.5 h-1.5 rounded-full bg-warn" />
        LOW CONFIDENCE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-err/10 text-err border border-err/20">
      <span className="w-1.5 h-1.5 rounded-full bg-err" />
      CONTRADICTION
    </span>
  );
}

// ----------- Tool call display -----------

function ToolCallAccordion({ tools }: { tools: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border border-white/[0.07] rounded-lg overflow-hidden text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-3 py-2 text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors"
      >
        <svg
          className={cn('w-3 h-3 transition-transform', open && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-mono">{tools.length} tool{tools.length !== 1 ? 's' : ''} called</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1">
          {tools.map((t, i) => (
            <div key={i} className="font-mono text-white/40 flex items-center gap-2">
              <span className="text-accent/50">›</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------- Message renderer -----------

interface MessageProps {
  message: ChatMessage;
  activeCitationIndex?: number | null;
  onCitationClick: (idx: number) => void;
}

function Message({ message, activeCitationIndex, onCitationClick }: MessageProps) {
  const isUser = message.role === 'user';

  // Parse content: replace [p.N] markers with citation chips
  const renderContent = () => {
    if (!message.citations || message.citations.length === 0) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>;
    }

    const parts = message.content.split(/(\[p\.\d+\])/g);
    return (
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {parts.map((part, i) => {
          const match = part.match(/\[p\.(\d+)\]/);
          if (match) {
            const page = parseInt(match[1], 10);
            const citIdx = message.citations!.findIndex((c) => c.page === page);
            if (citIdx >= 0) {
              return (
                <CitationChip
                  key={i}
                  page={page}
                  index={citIdx}
                  active={activeCitationIndex === citIdx}
                  onClick={() => onCitationClick(citIdx)}
                />
              );
            }
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[82%] rounded-xl px-4 py-3 space-y-2',
          isUser
            ? 'bg-accent text-white rounded-br-sm'
            : 'bg-[#18181b] text-white/90 rounded-bl-sm border border-white/[0.07]'
        )}
      >
        {message.confidence && message.confidence !== 'normal' && (
          <ConfidenceBadge level={message.confidence} />
        )}
        {renderContent()}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-white/40 animate-pulse rounded-sm ml-0.5" />
        )}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallAccordion tools={message.toolCalls} />
        )}
      </div>
    </div>
  );
}

// ----------- DealChat component -----------

export function DealChat({ dealId, documentId, onCitationClick }: DealChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleCitationClick = useCallback(
    (msgCitations: Citation[], citIdx: number) => {
      setActiveCitations(msgCitations);
      setActiveCitationIndex(citIdx);
      onCitationClick?.(citIdx, msgCitations);
    },
    [onCitationClick]
  );

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text.trim(),
          documentId: documentId || dealId,
          dealId,
          messages: messages
            .filter((m) => !m.isStreaming)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      let sources: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SOURCES prefix on first chunk
        if (fullContent === '' && chunk.startsWith('SOURCES:')) {
          const newlineIdx = chunk.indexOf('\n\n');
          if (newlineIdx >= 0) {
            const sourceLine = chunk.slice('SOURCES:'.length, newlineIdx);
            try {
              const parsed = JSON.parse(sourceLine);
              sources = parsed.map((s: any) => ({
                page: s.page_number,
                text: s.snippet,
              }));
            } catch {
              // ignore parse error
            }
            fullContent += chunk.slice(newlineIdx + 2);
          } else {
            fullContent += chunk;
          }
        } else {
          fullContent += chunk;
        }

        // Detect confidence flags
        let confidence: ChatMessage['confidence'] = 'normal';
        if (fullContent.includes('[LOW CONFIDENCE]')) confidence = 'low';
        if (fullContent.includes('[CONTRADICTION]')) confidence = 'contradiction';

        // Update streaming message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: fullContent.replace(/\[(LOW CONFIDENCE|CONTRADICTION)\]/g, '').trim(), citations: sources, confidence, isStreaming: true }
              : m
          )
        );
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        )
      );

      if (sources.length > 0) {
        setActiveCitations(sources);
        setActiveCitationIndex(0);
        onCitationClick?.(0, sources);
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `Error: ${err.message || 'Something went wrong'}`,
                isStreaming: false,
                confidence: 'contradiction',
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const suggestedQuestions = [
    'What is the investment thesis?',
    'Who are the key founders?',
    'What is the go-to-market strategy?',
    'What are the main risks?',
  ];

  return (
    <div className="flex flex-col h-full bg-[#111113]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.07] shrink-0">
        <h2 className="text-sm font-medium text-white/70">Deal Q&A</h2>
        <p className="text-xs text-white/30 font-mono mt-0.5">Ask questions about this pitch deck</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {!documentId ? (
          <div className="space-y-4">
            <p className="text-xs text-white/30 text-center">
              No PDF loaded — upload a pitch deck to analyze this deal
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-white/30 text-center">No questions yet — start analyzing below</p>
            <div className="space-y-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-3 py-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] text-xs text-white/60 hover:text-white/80 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : () : (
          messages.map((msg) => (
            <Message
              key={msg.id}
              message={msg}
              activeCitationIndex={msg.citations === activeCitations ? activeCitationIndex : null}
              onCitationClick={(idx) => handleCitationClick(msg.citations || [], idx)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/[0.07] p-3">
        <div className="flex items-end gap-2 bg-[#18181b] rounded-xl border border-white/[0.07] px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this deal..."
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-white placeholder:text-white/25 max-h-32 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-8 h-8 rounded-lg bg-accent hover:bg-accent/90 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="text-[10px] text-white/20 mt-1.5 px-1">
          Enter to send · Shift+Enter for new line · Citations shown as [p.N]
        </p>
      </form>
    </div>
  );
}
