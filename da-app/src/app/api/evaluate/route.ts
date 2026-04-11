import type { AgentRole, FundingRound } from '@/lib/types'
import { callGemini, extractJsonObject, jsonError } from '@/lib/gemini'

const VALID_ROLES: AgentRole[] = ['sales', 'marketing', 'engineering', 'finance']
const VALID_ROUNDS: FundingRound[] = [
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'ipo',
]

const ROLE_DESCRIPTIONS: Record<AgentRole, string> = {
  sales: 'generates ARR by closing deals and expanding accounts',
  marketing: 'grows user acquisition through campaigns and content',
  engineering: 'ships product features and maintains system reliability',
  finance: 'reduces burn rate by optimizing spend and cutting waste',
}

const REVENUE_UNIT: Record<AgentRole, string> = {
  sales: 'ARR generated',
  marketing: 'user-equivalent value in dollars',
  engineering: 'feature-shipping value in dollars',
  finance: 'burn reduction value in dollars',
}

const MAX_PROMPT_WORDS = 200

function logEvaluateDebug(event: string, payload: unknown) {
  console.info(`[api/evaluate] ${event}`, payload)
}

function truncatePrompt(prompt: string): { text: string; truncated: boolean; wordCount: number } {
  const words = prompt.trim().split(/\s+/).filter(Boolean)
  if (words.length <= MAX_PROMPT_WORDS) {
    return { text: prompt, truncated: false, wordCount: words.length }
  }
  return {
    text: words.slice(0, MAX_PROMPT_WORDS).join(' '),
    truncated: true,
    wordCount: words.length,
  }
}

function buildEvaluatePrompt(
  prompt: string,
  role: AgentRole,
  round: FundingRound,
  arr: number,
  users: number,
  features: number,
): string {
  const { text, truncated, wordCount } = truncatePrompt(prompt)
  const promptBlock = truncated
    ? `${text}\n(truncated — full prompt is ${wordCount} words)`
    : text

  return `You are evaluating an AI agent prompt in a startup simulation game.

This agent's role is **${role}**. A ${role} agent ${ROLE_DESCRIPTIONS[role]}.

The company is currently at the ${round} stage with $${arr.toLocaleString()} ARR, ${users} users, and ${features} features shipped.

The player wrote this prompt for their ${role} agent:
<prompt>
${promptBlock}
</prompt>

Respond with ONLY valid JSON. No markdown. No code fences. Keep it concise.
Keep the explanation under 18 words.
{
  "score": <0-100, how effective this prompt is for a ${role} agent>,
  "estimatedTokensPerTick": <integer, estimate how many LLM tokens this prompt would consume per invocation — consider prompt length, instruction complexity, and expected output size>,
  "estimatedRevenuePerTick": <integer, estimated dollar output per tick for this role given the prompt quality — ${REVENUE_UNIT[role]}>,
  "tokenEfficiency": <float rounded to 2 decimals, ratio of estimatedRevenuePerTick to estimatedTokensPerTick — higher is better>,
  "explanation": "<one sentence on what makes this prompt good or bad for a ${role} agent, max 25 words>"
}`
}

async function requestEvaluation(
  prompt: string,
  role: AgentRole,
  round: FundingRound,
  arr: number,
  users: number,
  features: number,
) {
  return callGemini(
    [
      {
        role: 'user',
        content: buildEvaluatePrompt(prompt, role, round, arr, users, features),
      },
    ],
    220,
    {
      temperature: 0.1,
      topP: 0.8,
      thinkingConfig: { thinkingBudget: 0 },
    },
  )
}

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('Evaluator returned an invalid score.')
  }
  return Math.round(Math.max(0, Math.min(100, value)))
}

function clampNonNegativeInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Evaluator returned an invalid ${field}.`)
  }
  return Math.max(0, Math.round(value))
}

function clampEfficiency(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('Evaluator returned an invalid tokenEfficiency.')
  }
  return Math.max(0, Number(value.toFixed(2)))
}

export async function POST(request: Request) {
  let body: {
    prompt?: unknown
    role?: unknown
    roundContext?: unknown
  }
  try {
    body = (await request.json()) as {
      prompt?: unknown
      role?: unknown
      roundContext?: unknown
    }
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  const { prompt, role, roundContext } = body
  if (
    typeof prompt !== 'string' ||
    typeof role !== 'string' ||
    !VALID_ROLES.includes(role as AgentRole)
  ) {
    return jsonError('Invalid evaluation payload.', 400)
  }

  if (prompt.length > 4000) {
    return jsonError('Prompt too long (max 4000 characters).', 400)
  }

  if (
    typeof roundContext !== 'object' ||
    roundContext === null
  ) {
    return jsonError('Missing roundContext.', 400)
  }

  const { round, arr, users, features } = roundContext as {
    round?: unknown
    arr?: unknown
    users?: unknown
    features?: unknown
  }

  if (
    typeof round !== 'string' ||
    !VALID_ROUNDS.includes(round as FundingRound) ||
    typeof arr !== 'number' ||
    typeof users !== 'number' ||
    typeof features !== 'number'
  ) {
    return jsonError('Invalid roundContext shape.', 400)
  }

  logEvaluateDebug('payload', {
    role,
    prompt,
    roundContext: {
      round,
      arr,
      users,
      features,
    },
  })

  const normalizedRole = role as AgentRole
  const normalizedRound = round as FundingRound
  const normalizedArr = Math.max(0, Math.floor(arr))
  const normalizedUsers = Math.max(0, Math.floor(users))
  const normalizedFeatures = Math.max(0, Math.floor(features))

  let result = await requestEvaluation(
    prompt,
    normalizedRole,
    normalizedRound,
    normalizedArr,
    normalizedUsers,
    normalizedFeatures,
  )

  if (!result.ok) {
    logEvaluateDebug('provider_error', result.body)
    return Response.json(result.body, { status: result.status })
  }

  try {
    const parsed = JSON.parse(extractJsonObject(result.text)) as {
      score?: unknown
      estimatedTokensPerTick?: unknown
      estimatedRevenuePerTick?: unknown
      tokenEfficiency?: unknown
      explanation?: unknown
    }

    if (typeof parsed.explanation !== 'string') {
      throw new Error('Evaluator returned an invalid explanation.')
    }

    const evaluation = {
      score: clampScore(parsed.score),
      estimatedTokensPerTick: clampNonNegativeInt(
        parsed.estimatedTokensPerTick,
        'estimatedTokensPerTick',
      ),
      estimatedRevenuePerTick: clampNonNegativeInt(
        parsed.estimatedRevenuePerTick,
        'estimatedRevenuePerTick',
      ),
      tokenEfficiency: clampEfficiency(parsed.tokenEfficiency),
      explanation: parsed.explanation,
    }

    logEvaluateDebug('evaluation', evaluation)
    return Response.json(evaluation)
  } catch (error) {
    const malformed = !result.text.trim().endsWith('}')
    if (malformed) {
      logEvaluateDebug('retrying_compact_response', { rawText: result.text })
      result = await requestEvaluation(
        prompt,
        normalizedRole,
        normalizedRound,
        normalizedArr,
        normalizedUsers,
        normalizedFeatures,
      )

      if (result.ok) {
        try {
          const parsed = JSON.parse(extractJsonObject(result.text)) as {
            score?: unknown
            estimatedTokensPerTick?: unknown
            estimatedRevenuePerTick?: unknown
            tokenEfficiency?: unknown
            explanation?: unknown
          }

          if (typeof parsed.explanation !== 'string') {
            throw new Error('Evaluator returned an invalid explanation.')
          }

          const evaluation = {
            score: clampScore(parsed.score),
            estimatedTokensPerTick: clampNonNegativeInt(
              parsed.estimatedTokensPerTick,
              'estimatedTokensPerTick',
            ),
            estimatedRevenuePerTick: clampNonNegativeInt(
              parsed.estimatedRevenuePerTick,
              'estimatedRevenuePerTick',
            ),
            tokenEfficiency: clampEfficiency(parsed.tokenEfficiency),
            explanation: parsed.explanation,
          }

          logEvaluateDebug('evaluation', evaluation)
          return Response.json(evaluation)
        } catch {
          // Fall through to the normal parse error below.
        }
      }
    }

    const message =
      error instanceof Error ? error.message : 'Evaluation failed unexpectedly.'
    logEvaluateDebug('parse_error', {
      message,
      rawText: result.ok ? result.text : undefined,
    })
    return jsonError(message, 502)
  }
}
