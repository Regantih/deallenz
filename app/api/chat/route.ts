import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { streamText } from '@/lib/llm';
import { embed } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { query, documentId } = await req.json();

    if (!query || !documentId) {
      return NextResponse.json({ error: 'Missing query or documentId' }, { status: 400 });
    }

    // 1. Try vector search. If embeddings are unavailable, fall back to full-text page retrieval.
    let matchedPages: { page_number: number; content: string; similarity?: number }[] = [];

    let embeddingAvailable = false;
    try {
      const queryEmbedding = await embed(query);
      embeddingAvailable = true;

      const { data, error: matchErr } = await supabaseServer.rpc(
        'match_page_embeddings',
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.2,
          match_count: 4,
          filter_document_id: documentId,
        }
      );

      if (matchErr) {
        console.warn('match_page_embeddings RPC error, falling back to full-text:', matchErr.message);
        embeddingAvailable = false;
      } else if (data && data.length > 0) {
        matchedPages = data;
      }
    } catch (embErr: any) {
      console.warn('[chat] Embedding unavailable, using full-text fallback:', embErr.message);
    }

    // Full-text fallback: fetch first 4 pages ordered by page_number
    if (!embeddingAvailable || matchedPages.length === 0) {
      const { data: fallbackPages, error: fbErr } = await supabaseServer
        .from('document_pages')
        .select('page_number, content')
        .eq('document_id', documentId)
        .order('page_number', { ascending: true })
        .limit(4);

      if (fbErr) {
        console.error('Fallback page fetch error:', fbErr);
      } else if (fallbackPages && fallbackPages.length > 0) {
        matchedPages = fallbackPages;
      }
    }

    if (matchedPages.length === 0) {
      // Return simple fallback stream if no context
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'SOURCES:[]\n\nNo relevant pages were found in the pitch deck matching your query. Please ask a different question or verify the upload.'
            )
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      });
    }

    // Prepare context list for frontend citations and Claude prompt
    const sources = matchedPages.map((page: any) => ({
      page_number: page.page_number,
      similarity: page.similarity ?? null,
      snippet: page.content.slice(0, 150) + '...',
    }));

    sources.sort((a: any, b: any) => a.page_number - b.page_number);

    // 4. Assemble Claude Context & Prompt
    const contextText = matchedPages
      .map((page: any) => `[PAGE ${page.page_number} CONTENT]:\n${page.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a world-class Venture Capital (VC) investment analyst reviewing a pitch deck for Marketlogic Investors LLC.
Your objective is to provide a highly analytical, precise, and objective answer to the user's question, drawing evidence strictly from the pitch deck page contents provided in the context below.

CONTEXT:
${contextText}

GUIDELINES:
1. Base your answer strictly on the provided context. If the information is not present or cannot be directly inferred, state clearly that it is "Not found in the deck."
2. NEVER mention any real estate analysis, property valuation, or mortgage details unless the context explicitly refers to it (the app is strictly for tech/VC investments, not real estate).
3. CITATION RULE: You MUST explicitly cite the source pages for your facts by including brackets like [Page X] or [Page Y, Z] at the exact point in the sentence where that source's information is used.
4. Keep your tone objective, professional, and clear. Use structured bullets if helpful.`;

    // 5. Invoke central LLM stream with fallback logic
    const llmStream = await streamText({
      systemPrompt,
      userMessage: query,
      maxTokens: 1500,
    });

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        // Prepend sources metadata as the first line of the stream
        const sourcesMetadata = `SOURCES:${JSON.stringify(sources)}\n\n`;
        controller.enqueue(encoder.encode(sourcesMetadata));

        // Read from the LLM stream and enqueue to customStream
        const reader = llmStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (streamErr) {
          console.error('Error reading from LLM stream:', streamErr);
        } finally {
          reader.releaseLock();
        }
        controller.close();
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Global Chat API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
