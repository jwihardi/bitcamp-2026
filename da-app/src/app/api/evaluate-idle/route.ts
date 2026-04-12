// Idle-game variant of /api/evaluate. Uses the idle-clicker agent types
// directly (chatbot, image, code, data, research, orchestrator) instead of
// remapping them through the vibe-combinator sales/marketing/engineering/finance
// enum. Keeps the canonical /api/evaluate untouched.

import { callGemini, extractJsonObject, jsonError } from '@/lib/gemini'

export type IdleAgentType =
  | 'chatbot'
  | 'image'
  | 'code'
  | 'data'
  | 'research'
  | 'orchestrator'

const VALID_AGENT_TYPES: IdleAgentType[] = [
  'chatbot',
  'image',
  'code',
  'data',
  'research',
  'orchestrator',
]

const AGENT_DESCRIPTIONS: Record<IdleAgentType, string> = {
  chatbot:
    'answers user questions in real time and drives conversational engagement — the workhorse of early-stage user retention',
  image:
    'generates marketing creative, thumbnails, and visual content to grow reach and pull new users into the funnel',
  code:
    'ships product features and fixes bugs — its output translates directly into new capability shipped per tick',
  data:
    'analyzes user behavior and cohorts to extract insight, surface monetization opportunities, and reduce waste',
  research:
    'explores new markets, competitor gaps, and product-research topics to unlock new user segments',
  orchestrator:
    'coordinates multiple agents, routes tasks, and keeps the whole agent fleet operating efficiently at scale',
}

const AGENT_OUTPUT_UNIT: Record<IdleAgentType, string> = {
  chatbot: 'user engagement value in dollars',
  image: 'marketing reach value in dollars',
  code: 'feature-shipping value in dollars',
  data: 'insight/optimization value in dollars',
  research: 'new-market discovery value in dollars',
  orchestrator: 'fleet-efficiency value in dollars',
}

const AGENT_DISPLAY_NAME: Record<IdleAgentType, string> = {
  chatbot: 'Chatbot Agent',
  image: 'Image Generator',
  code: 'Code Assistant',
  data: 'Data Analyst',
  research: 'Research Agent',
  orchestrator: 'ML Orchestrator',
}

const MAX_PROMPT_WORDS = 200

function logEvaluateIdleDebug(event: string, payload: unknown) {
  console.info(`[api/evaluate-idle] ${event}`, payload)
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
  agentType: IdleAgentType,
  stage: string,
  users: number,
  revenue: number,
  agentCount: number,
): string {
  const { text, truncated, wordCount } = truncatePrompt(prompt)
  const promptBlock = truncated
    ? `${text}\n(truncated — full prompt is ${wordCount} words)`
    : text

  const displayName = AGENT_DISPLAY_NAME[agentType]

  return `You are evaluating a prompt written for an AI agent in an idle-clicker startup simulation called AI Agent Empire.

This agent is a **${displayName}**. A ${displayName} ${AGENT_DESCRIPTIONS[agentType]}.

The company is currently at the "${stage}" stage with ${users} users, $${revenue.toLocaleString()} total revenue, and ${agentCount} agents deployed.

The player wrote this prompt for their ${displayName}:
<prompt>
${promptBlock}
</prompt>

Judge how effective this prompt is for a ${displayName} specifically — not a generic agent. A great chatbot prompt is different from a great image generator prompt.

Respond with ONLY valid JSON. No markdown. No code fences. Keep it concise.
Keep the explanation under 18 words.
{
  "score": <0-100, how effective this prompt is for a ${displayName}>,
  "estimatedTokensPerTick": <integer, estimate how many LLM tokens this prompt would consume per invocation — consider prompt length, instruction complexity, and expected output size>,
  "estimatedRevenuePerTick": <integer, estimated dollar output per tick for this agent given the prompt quality — ${AGENT_OUTPUT_UNIT[agentType]}>,
  "tokenEfficiency": <float rounded to 2 decimals, ratio of estimatedRevenuePerTick to estimatedTokensPerTick — higher is better>,
  "explanation": "<one sentence on what makes this prompt good or bad for a ${displayName}, max 25 words>"
}`
}

async function requestEvaluation(
  prompt: string,
  agentType: IdleAgentType,
  stage: string,
  users: number,
  revenue: number,
  agentCount: number,
) {
  return callGemini(
    [
      {
        role: 'user',
        content: buildEvaluatePrompt(prompt, agentType, stage, users, revenue, agentCount),
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
    agentType?: unknown
    stageContext?: unknown
  }
  try {
    body = (await request.json()) as {
      prompt?: unknown
      agentType?: unknown
      stageContext?: unknown
    }
  } catch {
    return jsonError('Invalid JSON body.', 400)
  }

  const { prompt, agentType, stageContext } = body
  if (
    typeof prompt !== 'string' ||
    typeof agentType !== 'string' ||
    !VALID_AGENT_TYPES.includes(agentType as IdleAgentType)
  ) {
    return jsonError('Invalid evaluation payload.', 400)
  }

  if (prompt.length > 4000) {
    return jsonError('Prompt too long (max 4000 characters).', 400)
  }

  if (typeof stageContext !== 'object' || stageContext === null) {
    return jsonError('Missing stageContext.', 400)
  }

  const { stage, users, revenue, agentCount } = stageContext as {
    stage?: unknown
    users?: unknown
    revenue?: unknown
    agentCount?: unknown
  }

  if (
    typeof stage !== 'string' ||
    typeof users !== 'number' ||
    typeof revenue !== 'number' ||
    typeof agentCount !== 'number'
  ) {
    return jsonError('Invalid stageContext shape.', 400)
  }

  logEvaluateIdleDebug('payload', {
    agentType,
    prompt,
    stageContext: { stage, users, revenue, agentCount },
  })

  const normalizedAgent = agentType as IdleAgentType
  const normalizedUsers = Math.max(0, Math.floor(users))
  const normalizedRevenue = Math.max(0, Math.floor(revenue))
  const normalizedAgentCount = Math.max(0, Math.floor(agentCount))

  const result = await requestEvaluation(
    prompt,
    normalizedAgent,
    stage,
    normalizedUsers,
    normalizedRevenue,
    normalizedAgentCount,
  )

  if (!result.ok) {
    logEvaluateIdleDebug('provider_error', result.body)
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

    logEvaluateIdleDebug('evaluation', evaluation)
    return Response.json(evaluation)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Evaluation failed unexpectedly.'
    logEvaluateIdleDebug('parse_error', { message, rawText: result.text })
    return jsonError(message, 502)
  }
}
