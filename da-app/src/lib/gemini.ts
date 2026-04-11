type GeminiPart = {
  text?: string
}

type GeminiMessage = {
  role: 'user' | 'assistant'
  content: string
}

type GeminiGenerationConfig = {
  maxOutputTokens?: number
  responseMimeType?: string
  temperature?: number
  topP?: number
  topK?: number
  thinkingConfig?: {
    thinkingBudget?: number
  }
}

export type GeminiCallSuccess = { ok: true; text: string }
export type GeminiCallFailure = {
  ok: false
  status: number
  body: { error: string }
}
export type GeminiCallResult = GeminiCallSuccess | GeminiCallFailure

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-2.5-flash'

function logGeminiDebug(event: string, payload: unknown) {
  console.info(`[gemini] ${event}`, payload)
}

export function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Gemini returned malformed JSON.')
  }
  return raw.slice(start, end + 1)
}

function toGeminiRole(role: GeminiMessage['role']): 'user' | 'model' {
  return role === 'assistant' ? 'model' : 'user'
}

export async function callGemini(
  messages: GeminiMessage[],
  maxTokens = 1000,
  generationConfig?: GeminiGenerationConfig,
): Promise<GeminiCallResult> {
  logGeminiDebug('request', {
    model: DEFAULT_MODEL,
    maxTokens,
    messages,
    generationConfig,
  })

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey || apiKey === 'API_KEY') {
    return {
      ok: false,
      status: 503,
      body: { error: 'Missing GEMINI_API_KEY. Add a real key to da-app/.env.' },
    }
  }

  let response: Response
  try {
    response = await fetch(`${GEMINI_URL}/${DEFAULT_MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contents: messages.map((message) => ({
          role: toGeminiRole(message.role),
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: maxTokens,
          responseMimeType: 'application/json',
          ...generationConfig,
        },
      }),
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error'
    logGeminiDebug('network_error', { detail })
    return {
      ok: false,
      status: 502,
      body: { error: `Gemini request failed: ${detail}` },
    }
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    logGeminiDebug('http_error', { status: response.status, detail })
    return {
      ok: false,
      status: 502,
      body: {
        error: `Gemini request failed: ${response.status}${detail ? ` ${detail}` : ''}`,
      },
    }
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      finishReason?: string
      content?: {
        parts?: GeminiPart[]
      }
    }>
  }
  logGeminiDebug('candidate_meta', {
    finishReason: data.candidates?.[0]?.finishReason,
  })
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
  logGeminiDebug('raw_response', { text })
  if (!text) {
    return {
      ok: false,
      status: 502,
      body: { error: 'Gemini returned an empty response.' },
    }
  }

  return { ok: true, text }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
