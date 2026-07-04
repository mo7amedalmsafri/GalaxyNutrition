// ── Galaxy Nutrition — shared AI client (server-side only) ──────────────
//
// Free-first strategy:
//   1. Google Gemini API direct (GEMINI_API_KEY from aistudio.google.com — FREE tier)
//   2. OpenRouter free models (rate-limited, best effort)
//   3. OpenRouter paid gemini-2.5-flash-lite (last resort)
//
// Both endpoints speak the OpenAI chat-completions format, so one code path
// serves them all — including vision (image_url) and streaming.

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

interface AiOptions {
  maxTokens?:   number
  temperature?: number
}

const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-lite-latest'

// OpenRouter free models (vision-capable), tried in order
const OPENROUTER_FREE = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
]
const OPENROUTER_PAID = 'google/gemini-2.5-flash-lite'

const OPENROUTER_HEADERS = (key: string) => ({
  'Authorization': `Bearer ${key}`,
  'Content-Type':  'application/json',
  'HTTP-Referer':  'https://galaxy-nutrition.vercel.app',
  'X-Title':       'Dietak',
})

async function tryEndpoint(
  url: string, headers: Record<string, string>, model: string,
  messages: AiMessage[], opts: AiOptions, stream: boolean
): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream,
        max_tokens:  opts.maxTokens ?? 1000,
        temperature: opts.temperature ?? 0.2,
      }),
    })
    if (res.ok && (!stream || res.body)) return res
    console.error(`[ai] ${model} failed:`, res.status, (await res.text()).slice(0, 200))
    return null
  } catch (e) {
    console.error(`[ai] ${model} network error:`, e)
    return null
  }
}

/** Runs the free-first provider chain. Returns the first successful upstream Response. */
async function chain(messages: AiMessage[], opts: AiOptions, stream: boolean): Promise<Response | null> {
  const geminiKey     = process.env.GEMINI_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY

  // 1 — Google Gemini direct (free tier)
  if (geminiKey) {
    const res = await tryEndpoint(
      GEMINI_URL,
      { 'Authorization': `Bearer ${geminiKey}`, 'Content-Type': 'application/json' },
      GEMINI_MODEL, messages, opts, stream
    )
    if (res) return res
  }

  if (!openrouterKey) return null

  // 2 — OpenRouter free models
  for (const model of OPENROUTER_FREE) {
    const res = await tryEndpoint(OPENROUTER_URL, OPENROUTER_HEADERS(openrouterKey), model, messages, opts, stream)
    if (res) return res
  }

  // 3 — OpenRouter paid (last resort)
  return tryEndpoint(OPENROUTER_URL, OPENROUTER_HEADERS(openrouterKey), OPENROUTER_PAID, messages, opts, stream)
}

/** Non-streaming chat: returns the assistant's text, or null if every provider failed. */
export async function aiChat(messages: AiMessage[], opts: AiOptions = {}): Promise<string | null> {
  const res = await chain(messages, opts, false)
  if (!res) return null
  try {
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

/**
 * Streaming chat: returns the raw upstream Response (OpenAI SSE format),
 * or null if every provider failed. Caller pumps the SSE stream.
 */
export async function aiChatStream(messages: AiMessage[], opts: AiOptions = {}): Promise<Response | null> {
  return chain(messages, opts, true)
}

/** Extracts the first JSON object from a model reply (handles ```json fences and prose). */
export function extractJson<T = any>(content: string): T | null {
  const cleaned = content.replace(/```(?:json)?\n?/g, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as T
  } catch {
    return null
  }
}
