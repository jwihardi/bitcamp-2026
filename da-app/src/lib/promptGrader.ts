import type { AgentRole } from './types'

// ---- Token counter ----

export function countTokens(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length
}

// ---- Heuristic grader ----

function lengthScore(tokenCount: number): number {
  if (tokenCount < 5)   return 0
  if (tokenCount <= 20) return 15 + (tokenCount - 5) * 1
  if (tokenCount <= 80) return 30
  if (tokenCount <= 200) return 30 - (tokenCount - 80) * 0.15
  return Math.max(0, 12 - (tokenCount - 200) * 0.05)
}

const ROLE_KEYWORDS: Record<AgentRole, string[]> = {
  sales: [
    'revenue', 'close', 'prospect', 'pipeline', 'quota', 'outreach',
    'convert', 'deal', 'customer', 'arr', 'upsell', 'demo', 'follow up',
  ],
  marketing: [
    'audience', 'brand', 'campaign', 'content', 'engagement', 'funnel',
    'growth', 'acquisition', 'retention', 'channel', 'conversion', 'viral',
  ],
  engineering: [
    'implement', 'build', 'ship', 'deploy', 'test', 'debug', 'refactor',
    'architecture', 'api', 'performance', 'feature', 'pr', 'ticket',
  ],
  finance: [
    'burn', 'runway', 'budget', 'forecast', 'expense', 'reduce',
    'efficiency', 'cash', 'cost', 'margin', 'spend', 'optimize',
  ],
}

function roleKeywordScore(prompt: string, role: AgentRole): number {
  const lower = prompt.toLowerCase()
  const hits = ROLE_KEYWORDS[role].filter(kw => lower.includes(kw)).length
  if (hits === 0) return 0
  if (hits === 1) return 10
  if (hits === 2) return 17
  if (hits === 3) return 22
  return Math.min(40, 22 + (hits - 3) * 3)
}

const SPECIFICITY_SIGNALS: RegExp[] = [
  /\d+/,
  /by (monday|friday|eod|eow|next week)/i,
  /goal[:is]/i,
  /target[:is]/i,
  /focus on/i,
  /prioritize/i,
  /avoid/i,
  /must (not|include|exclude)/i,
  /output (should|must|will)/i,
]

const VAGUE_SIGNALS: RegExp[] = [
  /do your best/i,
  /try to/i,
  /maybe/i,
  /whatever you think/i,
  /general(ly)?/i,
  /just/i,
]

function specificityScore(prompt: string): number {
  const specificHits = SPECIFICITY_SIGNALS.filter(r => r.test(prompt)).length
  const vagueHits = VAGUE_SIGNALS.filter(r => r.test(prompt)).length
  const raw = specificHits * 5 - vagueHits * 4
  return Math.max(0, Math.min(20, raw))
}

export function computeHeuristicScore(prompt: string, role: AgentRole): number {
  const tokenCount = countTokens(prompt)
  const score =
    lengthScore(tokenCount) +
    roleKeywordScore(prompt, role) +
    specificityScore(prompt)
  return Math.round(Math.max(0, Math.min(100, score)))
}

// ---- Claude API grader ----

export type GradeResult = {
  score: number
  explanation: string
}

export async function gradeWithClaude(prompt: string, role: AgentRole): Promise<GradeResult> {
  const response = await fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, role }),
  })

  if (!response.ok) {
    throw new Error(`Grade request failed: ${response.status}`)
  }

  const data = await response.json()
  return { score: data.score, explanation: data.explanation }
}
