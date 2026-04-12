import type {
  AgentRole,
  CFOHealth,
  FundingRound,
  GamePhase,
} from '@/lib/types'
import { callTerpAI, extractJsonObject, jsonError } from '@/lib/terpai'
import { ROUNDS } from '@/lib/constants'

const VALID_ROUNDS: FundingRound[] = [
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'ipo',
]

const VALID_PHASES: GamePhase[] = [
  'playing',
  'burn_mode',
  'game_over',
  'ipo',
  'prestige_shop',
]

const VALID_HEALTHS: CFOHealth[] = ['healthy', 'warning', 'critical']

function logCFODebug(event: string, payload: unknown) {
  console.info(`[api/cfo] ${event}`, payload)
}

type CFOAgentSummary = {
  name: string
  role: AgentRole
  score: number
  tokenCount: number
  isOffTask: boolean
  hasEval: boolean
  evalEfficiency: number | null
}

type CFOPayload = {
  round: FundingRound
  phase: GamePhase
  arr: number
  runway: number
  users: number
  features: number
  agentSlots: number
  tickInterval: number
  agents: CFOAgentSummary[]
}

function buildCFOPrompt(payload: CFOPayload, compact = false): string {
  const { round, phase, arr, runway, users, features, agentSlots, tickInterval, agents } = payload
  const currentMilestone = ROUNDS[round]

  const secondaryGoal = [
    currentMilestone.users != null ? `${currentMilestone.users} users` : null,
    currentMilestone.features != null ? `${currentMilestone.features} features` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const goalLine = `need $${currentMilestone.arr.toLocaleString()} ARR${
    secondaryGoal ? `, ${secondaryGoal}` : ''
  }`

  const agentLines = agents
    .map((a) => {
      const parts = [
        `score: ${a.score}`,
        `tokens: ${a.tokenCount}`,
        a.isOffTask ? 'OFF-TASK' : null,
        a.evalEfficiency != null ? `efficiency: ${a.evalEfficiency}` : null,
      ].filter(Boolean)
      return `- ${a.name} (${a.role}) — ${parts.join(', ')}`
    })
    .join('\n')

  const rosterBlock = agents.length === 0 ? '- No agents hired yet.' : agentLines

  return `You are the AI CFO in a startup simulation game. Give strategic advice and teach startup finance. Do not score prompts.

Company state:
- Round: ${round} (${goalLine})
- ARR: $${arr.toLocaleString()}
- Runway: $${runway.toLocaleString()}
- Users: ${users}
- Features: ${features}
- Agent slots used: ${agents.length} / ${agentSlots}
- Phase: ${phase}
- Tick interval: ${tickInterval}ms

Agents:
${rosterBlock}

Respond with ONLY valid JSON. No markdown. No code fences. Keep it concise.
${compact ? 'Use short strings. Keep advice items under 90 characters. Keep lesson body under 220 characters.' : ''}
{
  "health": "<healthy|warning|critical>",
  "verdict": "<one sentence on overall company health>",
  "advice": [
    "<first priority action — most impactful thing to do right now>",
    "<second priority action>",
    "<third priority action, or omit if only two are needed>"
  ],
  "lesson": {
    "topic": "<short label, e.g. 'Burn Rate', 'Token Efficiency', 'Lean Teams', 'CAC', 'Runway Management'>",
    "body": "<2-3 sentences teaching a real startup or token economics concept, tied to the player's current situation. Write like you're explaining to a smart friend, not a textbook.>"
  }
}`
}

async function requestCFOReport(payload: CFOPayload) {
  return callTerpAI(
    [{ role: 'user', content: buildCFOPrompt(payload, true) }],
    320,
  )
}

function validateAgentSummary(raw: unknown): CFOAgentSummary {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid agent entry.')
  }
  const r = raw as Record<string, unknown>
  if (typeof r.name !== 'string') throw new Error('Agent missing name.')
  if (
    typeof r.role !== 'string' ||
    !['sales', 'marketing', 'engineering', 'finance'].includes(r.role)
  ) {
    throw new Error('Agent has invalid role.')
  }
  return {
    name: r.name,
    role: r.role as AgentRole,
    score: typeof r.score === 'number' ? Math.round(r.score) : 0,
    tokenCount: typeof r.tokenCount === 'number' ? Math.max(0, Math.round(r.tokenCount)) : 0,
    isOffTask: Boolean(r.isOffTask),
    hasEval: Boolean(r.hasEval),
    evalEfficiency:
      typeof r.evalEfficiency === 'number' ? Number(r.evalEfficiency.toFixed(2)) : null,
  }
}

function clampAdviceList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('Advice must be an array of strings.')
  }
  const filtered = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  if (filtered.length === 0) {
    throw new Error('Advice array is empty.')
  }
  return filtered.slice(0, 3)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  if (typeof body !== 'object' || body === null) {
    return jsonError('Invalid CFO payload.', 400)
  }

  const {
    round,
    phase,
    arr,
    runway,
    users,
    features,
    agentSlots,
    tickInterval,
    agents,
  } = body as Record<string, unknown>

  if (
    typeof round !== 'string' ||
    !VALID_ROUNDS.includes(round as FundingRound) ||
    typeof phase !== 'string' ||
    !VALID_PHASES.includes(phase as GamePhase) ||
    typeof arr !== 'number' ||
    typeof runway !== 'number' ||
    typeof users !== 'number' ||
    typeof features !== 'number' ||
    typeof agentSlots !== 'number' ||
    typeof tickInterval !== 'number' ||
    !Array.isArray(agents)
  ) {
    return jsonError('CFO payload has invalid shape.', 400)
  }

  let agentSummaries: CFOAgentSummary[]
  try {
    agentSummaries = agents.map(validateAgentSummary)
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Invalid agent roster.',
      400,
    )
  }

  const payload: CFOPayload = {
    round: round as FundingRound,
    phase: phase as GamePhase,
    arr: Math.max(0, Math.floor(arr)),
    runway: Math.max(0, Math.floor(runway)),
    users: Math.max(0, Math.floor(users)),
    features: Math.max(0, Math.floor(features)),
    agentSlots: Math.max(0, Math.floor(agentSlots)),
    tickInterval: Math.max(100, Math.floor(tickInterval)),
    agents: agentSummaries,
  }

  logCFODebug('payload', payload)

  let result = await requestCFOReport(payload)

  if (!result.ok) {
    logCFODebug('provider_error', result.body)
    return Response.json(result.body, { status: result.status })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(result.text)) as {
      health?: unknown
      verdict?: unknown
      advice?: unknown
      lesson?: unknown
    }

    if (
      typeof parsed.health !== 'string' ||
      !VALID_HEALTHS.includes(parsed.health as CFOHealth)
    ) {
      throw new Error('CFO returned an invalid health value.')
    }
    if (typeof parsed.verdict !== 'string' || parsed.verdict.trim().length === 0) {
      throw new Error('CFO returned an invalid verdict.')
    }
    if (
      typeof parsed.lesson !== 'object' ||
      parsed.lesson === null ||
      typeof (parsed.lesson as Record<string, unknown>).topic !== 'string' ||
      typeof (parsed.lesson as Record<string, unknown>).body !== 'string'
    ) {
      throw new Error('CFO returned an invalid lesson.')
    }

    const lesson = parsed.lesson as { topic: string; body: string }

    const report = {
      health: parsed.health as CFOHealth,
      verdict: parsed.verdict,
      advice: clampAdviceList(parsed.advice),
      lesson: { topic: lesson.topic, body: lesson.body },
    }

    logCFODebug('report', report)
    return Response.json(report)
  } catch (error) {
    const malformed = !result.text.trim().endsWith('}')
    if (malformed) {
      logCFODebug('retrying_compact_response', { rawText: result.text })
      result = await requestCFOReport(payload)

      if (result.ok) {
        try {
          const parsed = JSON.parse(extractJsonObject(result.text)) as {
            health?: unknown
            verdict?: unknown
            advice?: unknown
            lesson?: unknown
          }

          if (
            typeof parsed.health !== 'string' ||
            !VALID_HEALTHS.includes(parsed.health as CFOHealth)
          ) {
            throw new Error('CFO returned an invalid health value.')
          }
          if (typeof parsed.verdict !== 'string' || parsed.verdict.trim().length === 0) {
            throw new Error('CFO returned an invalid verdict.')
          }
          if (
            typeof parsed.lesson !== 'object' ||
            parsed.lesson === null ||
            typeof (parsed.lesson as Record<string, unknown>).topic !== 'string' ||
            typeof (parsed.lesson as Record<string, unknown>).body !== 'string'
          ) {
            throw new Error('CFO returned an invalid lesson.')
          }

          const lesson = parsed.lesson as { topic: string; body: string }
          const report = {
            health: parsed.health as CFOHealth,
            verdict: parsed.verdict,
            advice: clampAdviceList(parsed.advice),
            lesson: { topic: lesson.topic, body: lesson.body },
          }

          logCFODebug('report', report)
          return Response.json(report)
        } catch {
          // Fall through to the normal parse error below.
        }
      }
    }

    const message = error instanceof Error ? error.message : 'CFO response was invalid.'
    logCFODebug('parse_error', {
      message,
      rawText: result.ok ? result.text : undefined,
    })
    return jsonError(message, 502)
  }
}
