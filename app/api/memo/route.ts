import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { streamText } from '@/lib/llm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 1. Fetch all pages sorted by page number
    const { data: pages, error: fetchErr } = await supabaseServer
      .from('document_pages')
      .select('page_number, content')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true });

    if (fetchErr) {
      console.error('Fetch pages error:', fetchErr);
      return NextResponse.json({ error: `Failed to load deck contents: ${fetchErr.message}` }, { status: 500 });
    }

    if (!pages || pages.length === 0) {
      return NextResponse.json({ error: 'No page content found for this document' }, { status: 400 });
    }

    // 2. Compile full deck text
    const fullDeckText = pages
      .map((p: any) => `=== PAGE ${p.page_number} ===\n${p.content}`)
      .join('\n\n');

    const systemPrompt = `You are a high-performing Venture Capital Principal at Marketlogic Investors LLC.
Your task is to draft a comprehensive, institutional-grade VC Investment Memo from the startup pitch deck text provided below.

The memo MUST follow standard investment committee structure, written in professional, analytical, and objective prose. Avoid marketing fluff or overhyped language. Provide critical analysis where possible.

PITCH DECK TEXT SOURCE:
${fullDeckText}

MEMO OUTLINE TO FOLLOW:
# VC INVESTMENT MEMO: [Company Name]

## 1. Executive Summary
- **Investment Thesis**: A concise 3-4 sentence explanation of why we should invest.
- **Recommendation**: Core recommendation (e.g., Proceed to full diligence, terms proposed).
- **Core Metrics**: Funding sought, Valuation cap/targets, key KPIs mentioned in the deck.

## 2. Company & Value Proposition
- Detailed explanation of what the company does, the core pain point they address, and their unique solution.

## 3. Market Opportunity & Size
- **Problem & TAM**: Estimate or list the Total Addressable Market (TAM), SAM, and SOM as described.
- **Market Tailwinds**: Why is now the perfect time to build this company?

## 4. Product, Technology & IP
- Summary of the product, proprietary tech, technology stacks, or intellectual property mentioned.
- Assessment of their competitive moat or technological advantage.

## 5. Business Model & Go-to-Market (GTM)
- Monetization strategy: How do they generate revenue?
- Customer acquisition strategy, sales channels, or early traction/pilot proof points.

## 6. Founders & Team
- Review the core team members, their backgrounds, relevant expertise, and executive roles.
- Assessment of team-market fit.

## 7. Key Risks & Diligence Plan
- **Execution & Competitor Risks**: Key challenges this startup faces.
- **Diligence Next Steps**: A concrete list of 4-5 high-priority questions we must investigate during deep diligence.

Formatting: Use elegant Markdown styling. Ensure headings are clear and crisp. Do not make up metrics; state clearly if a specific metric (like exact TAM or valuation) is "Not specified in the pitch deck."`;

    // 3. Stream completion via central LLM helper
    const llmStream = await streamText({
      systemPrompt,
      userMessage: 'Generate the structured Investment Memo draft now.',
      maxTokens: 3000,
    });

    return new Response(llmStream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Global Memo API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
