// Idle-game variant of /api/evaluate. Uses the idle-clicker agent types
// directly (chatbot, image, code, data, research, orchestrator) instead of
// remapping them through the vibe-combinator sales/marketing/engineering/finance
// enum. Keeps the canonical /api/evaluate untouched.

import { callTerpAI, extractJsonObject, jsonError } from '@/lib/terpai'

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

Your job is to score how well this prompt would actually direct a ${displayName} to produce useful, specific output. Be harsh — most prompts are bad.

SCORE (0–100) — use this scale exactly:
  0   : Nonsense, gibberish, slang, profanity, or completely unrelated to the agent's role. Examples: "sigma balls", "asdfgh", "lol idk", "buy me a car".
  1–5 : Recognisable words but zero actionable direction. Examples: "make me money", "do good things", "be helpful", "generate stuff".
  6–15: Names a vague goal with no constraints, audience, format, or method. Examples: "answer questions", "make images", "write code", "analyze data".
  16–35: Has a real goal but missing critical specifics — who, what format, what constraints, what success looks like.
  36–60: Clear goal with some specifics. Missing at least one key dimension (tone, format, scope, or failure condition).
  61–80: Solid, specific, role-appropriate instructions. Covers goal, method, and at least one constraint.
  81–100: Excellent — specific goal, clear method, defined constraints, handles edge cases or specifies output format.

IMPORTANT — grandiose but vague prompts score LOW and cost HIGH tokens:
  A prompt like "build me Facebook" or "make the best AI ever" or "generate a viral app" scores 0–5 because it gives the agent no actionable direction, but it implies a massive open-ended task so estimatedTokensPerTick should be very high (2000–5000+). This is the worst outcome: expensive and useless.

TOKEN COST — estimate tokens the agent would actually consume per invocation:
  Short, focused prompts = fewer tokens (100–400).
  Long or complex prompts = more tokens (500–2000).
  Vague, open-ended, or grandiose prompts with no scope = very high tokens (2000–6000) because the agent flails without guidance.

Respond with ONLY valid JSON. No markdown. No code fences.
{
  "score": <0-100, see scale above>,
  "estimatedTokensPerTick": <integer, tokens consumed per invocation — higher for vague/complex, lower for focused>,
  "estimatedRevenuePerTick": <integer, estimated dollar output — ${AGENT_OUTPUT_UNIT[agentType]} — proportional to score, near 0 for bad prompts>,
  "tokenEfficiency": <float rounded to 2 decimals, estimatedRevenuePerTick / estimatedTokensPerTick>,
  "explanation": "<one sentence naming the exact reason this prompt is effective or ineffective, max 20 words>",
  "tips": [
    "<specific, actionable edit #1 — quote the exact word or phrase to add/change, not generic advice>",
    "<specific, actionable edit #2>"
  ],
  "keywords": ["<power word or phrase a strong ${displayName} prompt should include>", "<another>", "<another>"]
}
Tips must name concrete changes. Bad: "be more specific". Good: "add 'reply in 2 sentences max' to constrain output length".
Keywords are 2-5 words or short phrases the player should weave into their prompt to signal intent clearly to the model.`
}

async function requestEvaluation(
  prompt: string,
  agentType: IdleAgentType,
  stage: string,
  users: number,
  revenue: number,
  agentCount: number,
) {
  return callTerpAI(
    [
      {
        role: 'user',
        content: buildEvaluatePrompt(prompt, agentType, stage, users, revenue, agentCount),
      },
    ],
    220,
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
      tips?: unknown
      keywords?: unknown
    }

    if (typeof parsed.explanation !== 'string') {
      throw new Error('Evaluator returned an invalid explanation.')
    }

    const tips = Array.isArray(parsed.tips)
      ? (parsed.tips as unknown[])
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .slice(0, 3)
      : []

    const keywords = Array.isArray(parsed.keywords)
      ? (parsed.keywords as unknown[])
          .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
          .slice(0, 5)
      : []

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
      tips,
      keywords,
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
