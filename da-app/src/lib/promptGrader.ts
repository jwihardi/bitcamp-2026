import type { AgentRole } from './types'

// ---- Token counter ----

export function countTokens(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length
}

function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)))
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
  return clampScore(score)
}

// Bounded Levenshtein edit distance. Returns the true distance up to the
// threshold (11), after which it short-circuits — enough to decide whether to
// invalidate a cached grade without iterating over long prompts unnecessarily.
export function countPromptCharacterEdits(a: string, b: string): number {
  const THRESHOLD = 10
  if (Math.abs(a.length - b.length) > THRESHOLD) return THRESHOLD + 1

  const m = a.length
  const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  let curr = new Array<number>(n + 1)

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    let rowMin = i
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1])
      rowMin = Math.min(rowMin, curr[j])
    }
    if (rowMin > THRESHOLD) return THRESHOLD + 1
    ;[prev, curr] = [curr, prev]
  }

  return prev[n]
}

export function shouldInvalidateCachedGrade(
  nextPrompt: string,
  cachedPromptText: string,
): boolean {
  if (cachedPromptText.length === 0) return true
  return countPromptCharacterEdits(nextPrompt, cachedPromptText) > 10
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
    let detail = `Grade request failed: ${response.status}`
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) {
        detail = data.error
      }
    } catch {
      // Ignore malformed error bodies and keep the HTTP status message.
    }
    throw new Error(detail)
  }

  const data = (await response.json()) as Partial<GradeResult>

  if (typeof data.score !== 'number' || typeof data.explanation !== 'string') {
    throw new Error('Grade response was invalid.')
  }

  return { score: clampScore(data.score), explanation: data.explanation }
}
