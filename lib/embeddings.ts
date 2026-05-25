import OpenAI from 'openai';

interface TimeoutOptions {
  timeoutMs: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout'));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function embed(text: string): Promise<number[]> {
  const useLocal = process.env.USE_LOCAL_EMBEDDINGS === 'true';
  const timeoutMs = parseInt(process.env.LOCAL_EMBED_TIMEOUT_MS || '5000', 10);

  if (useLocal) {
    try {
      console.log('[EMBEDDINGS] Attempting local embeddings...');
      const openaiLocal = new OpenAI({
        baseURL: process.env.LOCAL_EMBED_BASE_URL || 'http://localhost:8001/v1',
        apiKey: 'not-needed',
      });
      const response = await withTimeout(
        openaiLocal.embeddings.create({
          model: process.env.LOCAL_EMBED_MODEL || 'bge-small-en-v1.5',
          input: text,
        }),
        timeoutMs
      );
      console.log('[EMBEDDINGS] local');
      const emb = response.data?.[0]?.embedding;
      if (!emb) throw new Error('No embedding returned from local server');
      return emb;
    } catch (err) {
      console.warn('[EMBEDDINGS] Local embeddings failed, falling back to OpenAI...', err);
    }
  }

  // Fallback to OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured — embeddings unavailable');
  console.log('[EMBEDDINGS] Attempting OpenAI embeddings...');
  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  console.log('[EMBEDDINGS] openai');
  const emb = response.data?.[0]?.embedding;
  if (!emb) throw new Error('No embedding returned from OpenAI server');
  return emb;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const useLocal = process.env.USE_LOCAL_EMBEDDINGS === 'true';
  const timeoutMs = parseInt(process.env.LOCAL_EMBED_TIMEOUT_MS || '5000', 10);

  if (useLocal) {
    try {
      console.log('[EMBEDDINGS] Attempting local batch embeddings...');
      const openaiLocal = new OpenAI({
        baseURL: process.env.LOCAL_EMBED_BASE_URL || 'http://localhost:8001/v1',
        apiKey: 'not-needed',
      });
      const response = await withTimeout(
        openaiLocal.embeddings.create({
          model: process.env.LOCAL_EMBED_MODEL || 'bge-small-en-v1.5',
          input: texts,
        }),
        timeoutMs
      );
      console.log('[EMBEDDINGS] local');
      return response.data.map((d) => d.embedding);
    } catch (err) {
      console.warn('[EMBEDDINGS] Local batch embeddings failed, falling back to OpenAI...', err);
    }
  }

  // Fallback to OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured — embeddings unavailable');
  console.log('[EMBEDDINGS] Attempting OpenAI batch embeddings...');
  const openai = new OpenAI({ apiKey: openaiKey });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  console.log('[EMBEDDINGS] openai');
  return response.data.map((d) => d.embedding);
}
