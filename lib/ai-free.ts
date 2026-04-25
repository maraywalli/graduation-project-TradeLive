/**
 * Free AI helpers powered by Pollinations.ai.
 * - No API key, no billing, no signup.
 * - Text:  https://text.pollinations.ai
 * - Image: https://image.pollinations.ai
 */

const TEXT_BASE = 'https://text.pollinations.ai';
const IMAGE_BASE = 'https://image.pollinations.ai';

export function isAIReady(): boolean {
  return true;
}

export async function generateText(opts: {
  prompt: string;
  system?: string;
  model?: string;
  maxRetries?: number;
}): Promise<string> {
  const model = opts.model || 'openai';
  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.prompt },
  ];

  const retries = opts.maxRetries ?? 1;
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${TEXT_BASE}/openai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          private: true,
          referrer: 'tradelive-pro',
        }),
      });
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
