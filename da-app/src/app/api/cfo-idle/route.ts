// /api/cfo-idle — AI CFO advisor for the idle game.
// Accepts idle-game state (tokens/userbase/agents) instead of the Vibe Combinator
// schema used by /api/cfo, then builds an idle-aware prompt and calls TerpAI.

import { callTerpAI, extractJsonObject, jsonError } from '@/lib/terpai'

const VALID_HEALTHS = ['healthy', 'warning', 'critical'] as const
type CfoHealth = (typeof VALID_HEALTHS)[number]

type CfoIdleAgent = {
  name: string
  type: string
  count: number
  promptQuality: number
  model: string
  prompt: string
  evaluationExplanation: string | null
}

type CfoIdlePayload = {
  stage: string
  tokens: number
  userbase: number
  revenuePerSec: number
  operatingCostPerSec: number
  netIncomePerSec: number
  serviceQuality: number
  gameSpeed: number
  agents: CfoIdleAgent[]
}

type CachedReport = {
  report: {
    health: CfoHealth
    verdict: string
    advice: string[]
    lesson: { topic: string; body: string }
    promptCoaching: {
      agentName: string
      quality: number
      summary: string
      tips: string[]
    }[]
  }
  expiresAt: number
}

const CFO_CACHE_TTL_MS = 45_000
const cfoCache = new Map<string, CachedReport>()
const MAX_PROMPT_WORDS = 80

function truncatePrompt(prompt: string): string {
  const words = prompt.trim().split(/\s+/).filter(Boolean)
  if (words.length <= MAX_PROMPT_WORDS) return prompt.trim()
  return `${words.slice(0, MAX_PROMPT_WORDS).join(' ')} …`
}

function buildPrompt(p: CfoIdlePayload, compact = false): string {
  const agentLines =
    p.agents.length === 0
      ? '  - No agents purchased yet.'
      : p.agents
          .map(
            (a) =>
              `  - ${a.name} ×${a.count} (prompt quality: ${a.promptQuality}%, model: ${a.model})${
                a.evaluationExplanation ? `\n    Last eval: ${a.evaluationExplanation}` : ''
              }${a.prompt ? `\n    Prompt: "${a.prompt}"` : '\n    Prompt: [none written]'}`,
          )
          .join('\n')

  const hasPromptsToCoach = p.agents.some((a) => a.prompt || a.promptQuality < 70)

  return `You are the AI CFO in an idle startup simulation game called "AI Agent Empire". \
Give strategic advice on growing users, managing token costs, and advancing funding stages. \
Teach real startup finance concepts through the lens of the game.

Company state:
- Funding stage: ${p.stage}
- Cash: $${p.tokens.toLocaleString()}
- Users: ${p.userbase.toLocaleString()}
- Revenue/s: $${p.revenuePerSec.toFixed(2)}
- Token costs/s: $${p.operatingCostPerSec.toFixed(2)}
- Net income/s: $${p.netIncomePerSec.toFixed(2)}
- Service quality: ${p.serviceQuality}%
- Game speed: ${p.gameSpeed}x

Active agents:
${agentLines}

${hasPromptsToCoach ? 'Also give prompt coaching for up to 3 weakest prompts. Explain plainly whether the prompt is good, weak, or missing, why, and exactly how to improve it. If a prompt is already solid, say what is working and one concrete upgrade. Keep coaching grounded in the actual prompt text shown.' : ''}

Respond ONLY with valid JSON. No markdown. No code fences.${compact ? ' Keep strings short. Keep coaching summaries under 90 characters. Keep each coaching tip under 80 characters.' : ''}
{
  "health": "<healthy|warning|critical>",
  "verdict": "<one sentence on overall company health>",
  "advice": [
    "<first priority action>",
    "<second priority action>",
    "<optional third action>"
  ],
  "lesson": {
    "topic": "<short label e.g. 'Burn Rate', 'Token Efficiency', 'Growth Hacking'>",
    "body": "<2-3 sentences teaching a startup concept tied to the player's current situation>"
  },
  "promptCoaching": [
    {
      "agentName": "<agent name>",
      "quality": <0-100 prompt quality>,
      "summary": "<say if prompt is good, weak, or missing and why>",
      "tips": [
        "<specific improvement #1>",
        "<specific improvement #2>"
      ]
    }
  ]
}`
}

function validatePayload(body: unknown): CfoIdlePayload {
  if (typeof body !== 'object' || body === null) throw new Error('Invalid payload.')
  const b = body as Record<string, unknown>
  if (typeof b.stage !== 'string') throw new Error('Missing stage.')
  if (typeof b.tokens !== 'number') throw new Error('Missing tokens.')
  if (typeof b.userbase !== 'number') throw new Error('Missing userbase.')
  if (typeof b.revenuePerSec !== 'number') throw new Error('Missing revenuePerSec.')
  if (typeof b.operatingCostPerSec !== 'number') throw new Error('Missing operatingCostPerSec.')
  if (typeof b.netIncomePerSec !== 'number') throw new Error('Missing netIncomePerSec.')
  if (typeof b.serviceQuality !== 'number') throw new Error('Missing serviceQuality.')
  if (typeof b.gameSpeed !== 'number') throw new Error('Missing gameSpeed.')
  if (!Array.isArray(b.agents)) throw new Error('Missing agents array.')

  const agents: CfoIdleAgent[] = b.agents.map((a: unknown) => {
    if (typeof a !== 'object' || a === null) throw new Error('Invalid agent entry.')
    const ag = a as Record<string, unknown>
    return {
      name: typeof ag.name === 'string' ? ag.name : 'Unknown',
      type: typeof ag.type === 'string' ? ag.type : 'unknown',
      count: typeof ag.count === 'number' ? Math.max(0, Math.floor(ag.count)) : 0,
      promptQuality: typeof ag.promptQuality === 'number' ? Math.round(ag.promptQuality) : 50,
      model: typeof ag.model === 'string' ? ag.model : 'Nimbus-1',
      prompt: typeof ag.prompt === 'string' ? truncatePrompt(ag.prompt) : '',
      evaluationExplanation:
        typeof ag.evaluationExplanation === 'string' && ag.evaluationExplanation.trim().length > 0
          ? ag.evaluationExplanation
          : null,
    }
  })

  return {
    stage: b.stage,
    tokens: Math.max(0, Math.floor(b.tokens)),
    userbase: Math.max(0, Math.floor(b.userbase)),
    revenuePerSec: Math.max(0, b.revenuePerSec),
    operatingCostPerSec: Math.max(0, b.operatingCostPerSec),
    netIncomePerSec: b.netIncomePerSec,
    serviceQuality: Math.min(100, Math.max(0, Math.round(b.serviceQuality))),
    gameSpeed: b.gameSpeed,
    agents,
  }
}

function parseReport(text: string): CachedReport['report'] {
  const parsed = JSON.parse(extractJsonObject(text)) as Record<string, unknown>

  if (typeof parsed.health !== 'string' || !VALID_HEALTHS.includes(parsed.health as CfoHealth)) {
    throw new Error('Invalid health value.')
  }
  if (typeof parsed.verdict !== 'string' || !parsed.verdict.trim()) {
    throw new Error('Invalid verdict.')
  }
  if (!Array.isArray(parsed.advice) || parsed.advice.length === 0) {
    throw new Error('Invalid advice array.')
  }
  if (
    typeof parsed.lesson !== 'object' ||
    parsed.lesson === null ||
    typeof (parsed.lesson as Record<string, unknown>).topic !== 'string' ||
    typeof (parsed.lesson as Record<string, unknown>).body !== 'string'
  ) {
    throw new Error('Invalid lesson.')
  }

  const lesson = parsed.lesson as { topic: string; body: string }
  const advice = (parsed.advice as unknown[])
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, 3)

  const promptCoaching = Array.isArray(parsed.promptCoaching)
    ? (parsed.promptCoaching as unknown[])
        .flatMap((item) => {
          if (typeof item !== 'object' || item === null) return []
          const entry = item as Record<string, unknown>
          if (typeof entry.agentName !== 'string') return []
          if (typeof entry.summary !== 'string' || !entry.summary.trim()) return []
          const tips = Array.isArray(entry.tips)
            ? entry.tips
                .filter((tip): tip is string => typeof tip === 'string' && tip.trim().length > 0)
                .slice(0, 3)
            : []
          if (tips.length === 0) return []
          return [{
            agentName: entry.agentName,
            quality:
              typeof entry.quality === 'number'
                ? Math.max(0, Math.min(100, Math.round(entry.quality)))
                : 0,
            summary: entry.summary,
            tips,
          }]
        })
        .slice(0, 3)
    : []

  return {
    health: parsed.health as CfoHealth,
    verdict: parsed.verdict,
    advice,
    lesson: { topic: lesson.topic, body: lesson.body },
    promptCoaching,
  }
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  let payload: CfoIdlePayload
  try {
    payload = validatePayload(body)
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Invalid payload.', 400)
  }

  const cacheKey = JSON.stringify(payload)
  const cached = cfoCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json(cached.report)
  }

  let result = await callTerpAI(
    [{ role: 'user', content: buildPrompt(payload, true) }],
    320,
  )

  if (!result.ok) {
    return Response.json(result.body, { status: result.status })
  }

  try {
    const report = parseReport(result.text)
    cfoCache.set(cacheKey, { report, expiresAt: Date.now() + CFO_CACHE_TTL_MS })
    return Response.json(report)
  } catch {
    // Retry once with compact prompt on truncation
    if (!result.text.trim().endsWith('}')) {
      result = await callTerpAI(
        [{ role: 'user', content: buildPrompt(payload, true) }],
        320,
      )
      if (result.ok) {
        try {
          const report = parseReport(result.text)
          cfoCache.set(cacheKey, { report, expiresAt: Date.now() + CFO_CACHE_TTL_MS })
          return Response.json(report)
        } catch {
          // fall through
        }
      }
    }
    return jsonError('CFO response was invalid.', 502)
  }
}
