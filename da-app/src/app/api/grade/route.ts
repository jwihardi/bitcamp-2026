import type { AgentRole } from '@/lib/types'

type AnthropicContentBlock = {
  type: string
  text?: string
}

function buildGradePrompt(prompt: string, role: AgentRole): string {
  return `You are grading an AI agent prompt for a ${role} agent in a startup simulation game.

The player wrote this prompt:
<prompt>
${prompt}
</prompt>

Score this prompt from 0 to 100 based on:
- Conciseness (shorter and specific beats long and vague)
- Role relevance (does it actually help a ${role} agent?)
- Clarity of goal or constraint
- Absence of filler language

Respond ONLY with a JSON object, no markdown, no preamble:
{"score": <number 0-100>, "explanation": "<one sentence, max 20 words>"}`
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI grader returned malformed JSON.')
  }

  return raw.slice(start, end + 1)
}

function toClampedScore(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('AI grader returned an invalid score.')
  }

  return Math.round(Math.max(0, Math.min(100, value)))
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'Missing ANTHROPIC_API_KEY for AI grading.' },
      { status: 503 },
    )
  }

  let body: { prompt?: unknown; role?: unknown }
  try {
    body = (await request.json()) as { prompt?: unknown; role?: unknown }
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { prompt, role } = body
  if (
    typeof prompt !== 'string' ||
    typeof role !== 'string' ||
    !['sales', 'marketing', 'engineering', 'finance'].includes(role)
  ) {
    return Response.json({ error: 'Invalid grading payload.' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: buildGradePrompt(prompt, role as AgentRole),
          },
        ],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      return Response.json(
        { error: `Anthropic grade request failed: ${response.status}${detail ? ` ${detail}` : ''}` },
        { status: 502 },
      )
    }

    const data = (await response.json()) as {
      content?: AnthropicContentBlock[]
    }
    const text = data.content?.find((block) => block.type === 'text')?.text?.trim()

    if (!text) {
      throw new Error('AI grader returned an empty response.')
    }

    const parsed = JSON.parse(extractJsonObject(text)) as {
      score?: unknown
      explanation?: unknown
    }

    if (typeof parsed.explanation !== 'string') {
      throw new Error('AI grader returned an invalid explanation.')
    }

    return Response.json({
      score: toClampedScore(parsed.score),
      explanation: parsed.explanation,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI grading failed unexpectedly.'
    return Response.json({ error: message }, { status: 502 })
  }
}
