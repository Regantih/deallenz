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

    // 1. Generate embedding using unified embeddings helper (supports local embeddings server)
    let queryEmbedding: number[];
    try {
      queryEmbedding = await embed(query);
    } catch (embErr: any) {
      console.error('Failed to generate query embedding:', embErr);
      return NextResponse.json(
        { error: 'EMBEDDING_GENERATION_FAILED', detail: embErr.message || 'Failed to generate query embedding.' },
        { status: 500 }
      );
    }

    // 3. Query Supabase for top 4 relevant pages
    const { data: matchedPages, error: matchErr } = await supabaseServer.rpc(
      'match_page_embeddings',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.2, // Low threshold to get relevant pages
        match_count: 4,
        filter_document_id: documentId,
      }
    );

    if (matchErr) {
      console.error('Match embeddings RPC error:', matchErr);
      return NextResponse.json({ error: `Similarity search error: ${matchErr.message}` }, { status: 500 });
    }

    if (!matchedPages || matchedPages.length === 0) {
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
      similarity: page.similarity,
      snippet: page.content.slice(0, 150) + '...',
    }));

    // Sort sources by page number for clean representation
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
