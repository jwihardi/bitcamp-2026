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
  }
  expiresAt: number
}

const CFO_CACHE_TTL_MS = 45_000
const cfoCache = new Map<string, CachedReport>()

function buildPrompt(p: CfoIdlePayload, compact = false): string {
  const agentLines =
    p.agents.length === 0
      ? '  - No agents purchased yet.'
      : p.agents
          .map(
            (a) =>
              `  - ${a.name} ×${a.count} (prompt quality: ${a.promptQuality}%, model: ${a.model})`,
          )
          .join('\n')

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

Respond ONLY with valid JSON. No markdown. No code fences.${compact ? ' Keep strings short.' : ''}
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
  }
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

  return {
    health: parsed.health as CfoHealth,
    verdict: parsed.verdict,
    advice,
    lesson: { topic: lesson.topic, body: lesson.body },
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
