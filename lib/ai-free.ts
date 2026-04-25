/**
 * AI helpers.
 * - Text: prefers OpenAI when `OPENAI_API_KEY` is set (reliable, low-latency).
 *         Falls back to Pollinations (free, no key) so dev/preview deploys
 *         that lack the env var still work.
 * - Image: Pollinations only (free, no key needed for product art).
 */

import OpenAI from 'openai';

const TEXT_BASE = 'https://text.pollinations.ai';
const IMAGE_BASE = 'https://image.pollinations.ai';

// Hard ceiling so a stuck upstream can never hang a serverless function.
// Vercel's hobby plan kills functions at 60s; OpenAI is well under 25s.
const TEXT_TIMEOUT_MS = 25_000;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (_openai) return _openai;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

export function isAIReady(): boolean {
  return true;
}

/**
 * Run a promise with a hard deadline. The optional `controller` is aborted on
 * timeout so the underlying network connection is actually torn down (vs.
 * dangling on the server until the OS reaps it). Both the OpenAI SDK and
 * `fetch` accept an `AbortSignal`, so this works for both call sites.
 */
function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
  controller?: AbortController,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      controller?.abort();
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export async function generateText(opts: {
  prompt: string;
  system?: string;
  model?: string;
  maxRetries?: number;
}): Promise<string> {
  // Try OpenAI first when available — much faster + more reliable than the
  // free fallback. We use gpt-4o-mini for cost (descriptions are short).
  const openai = getOpenAI();
  if (openai) {
    const ctrl = new AbortController();
    try {
      const completion = await withTimeout(
        openai.chat.completions.create(
          {
            model: 'gpt-4o-mini',
            messages: [
              ...(opts.system ? [{ role: 'system' as const, content: opts.system }] : []),
              { role: 'user' as const, content: opts.prompt },
            ],
            temperature: 0.7,
            max_tokens: 400,
          },
          { signal: ctrl.signal },
        ),
        TEXT_TIMEOUT_MS,
        '[ai] openai',
        ctrl,
      );
      const text = completion.choices?.[0]?.message?.content || '';
      if (text.trim()) return text.trim();
      // Empty response → fall through to Pollinations.
    } catch (e) {
      // Log + fall through. Don't surface the OpenAI failure if the fallback
      // succeeds — that's invisible to the user, which is the point.
      // eslint-disable-next-line no-console
      console.warn('[ai] openai failed, falling back to pollinations:', (e as Error).message);
    }
  }

  // Pollinations fallback (free, no key).
  const model = opts.model || 'openai';
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.prompt },
  ];

  const retries = opts.maxRetries ?? 1;
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    const ctrl = new AbortController();
    try {
      const res = await withTimeout(
        fetch(`${TEXT_BASE}/openai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages,
            private: true,
            referrer: 'tradelive-pro',
          }),
          signal: ctrl.signal,
        }),
        TEXT_TIMEOUT_MS,
        '[ai] pollinations',
        ctrl,
      );
      if (!res.ok) throw new Error(`AI text HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        const text =
          json?.choices?.[0]?.message?.content ??
          json?.choices?.[0]?.text ??
          json?.text ??
          '';
        return String(text).trim();
      }
      return (await res.text()).trim();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('AI text generation failed');
}

export async function generateImageBuffer(opts: {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
}): Promise<Buffer> {
  const w = opts.width || 1024;
  const h = opts.height || 1024;
  const model = opts.model || 'flux';
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);
  const url = `${IMAGE_BASE}/prompt/${encodeURIComponent(opts.prompt)}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true&enhance=true&private=true&referrer=tradelive-pro`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`AI image HTTP ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}
