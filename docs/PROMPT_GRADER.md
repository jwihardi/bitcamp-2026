# PROMPT_GRADER.md — Vibe Combinator

The prompt grader turns a raw text prompt into a quality score (0–100). This score is the central mechanic of the game — it determines output multipliers, and drift risk.

There are two grading paths: a local heuristic that runs instantly on every keystroke, and an optional Claude API call the player can trigger manually.

---

## Heuristic grader (runs on every keystroke)

The heuristic runs client-side with no API call. It should feel snappy — recompute on every `onChange` of the prompt textarea.

### Scoring components

The final score is clamped to [0, 100] and is the sum of these components:

#### 1. Length score (30 points max)

Reward conciseness. The sweet spot is 20–80 tokens. Penalize both extremes.

```ts
function lengthScore(tokenCount: number): number {
  if (tokenCount < 5)  return 0
  if (tokenCount <= 20) return 15 + (tokenCount - 5) * 1   // ramp up
  if (tokenCount <= 80) return 30                            // sweet spot
  if (tokenCount <= 200) return 30 - (tokenCount - 80) * 0.15  // gentle penalty
  return Math.max(0, 12 - (tokenCount - 200) * 0.05)        // steep penalty
}
```

#### 2. Role keyword score (40 points max)

Each role has a set of high-value keywords. Award points for presence, with diminishing returns after the first few hits.

```ts
const ROLE_KEYWORDS: Record<AgentRole, string[]> = {
  sales: [
    'revenue', 'close', 'prospect', 'pipeline', 'quota', 'outreach',
    'convert', 'deal', 'customer', 'ARR', 'upsell', 'demo', 'follow up',
  ],
  marketing: [
    'audience', 'brand', 'campaign', 'content', 'engagement', 'funnel',
    'growth', 'acquisition', 'retention', 'channel', 'conversion', 'viral',
  ],
  engineering: [
    'implement', 'build', 'ship', 'deploy', 'test', 'debug', 'refactor',
    'architecture', 'api', 'performance', 'feature', 'PR', 'ticket',
  ],
  finance: [
    'burn', 'runway', 'budget', 'forecast', 'expense', 'reduce',
    'efficiency', 'cash', 'cost', 'margin', 'spend', 'optimize',
  ],
}

function roleKeywordScore(prompt: string, role: AgentRole): number {
  const lower = prompt.toLowerCase()
  const hits = ROLE_KEYWORDS[role].filter(kw => lower.includes(kw)).length
  // 10pts for first hit, +7 for second, +5 for third, +3 each after, cap at 40
  if (hits === 0) return 0
  if (hits === 1) return 10
  if (hits === 2) return 17
  if (hits === 3) return 22
  return Math.min(40, 22 + (hits - 3) * 3)
}
```

#### 3. Specificity score (20 points max)

Reward prompts that include a goal, a constraint, or a specific action. Penalize vague filler.

```ts
const SPECIFICITY_SIGNALS = [
  /\d+/,                      // contains a number
  /by (monday|friday|eod|eow|next week)/i,
  /goal[:is]/i,
  /target[:is]/i,
  /focus on/i,
  /prioritize/i,
  /avoid/i,
  /must (not|include|exclude)/i,
  /output (should|must|will)/i,
]

const VAGUE_SIGNALS = [
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
  const raw = (specificHits * 5) - (vagueHits * 4)
  return Math.max(0, Math.min(20, raw))
}
```

#### 4. Combining scores

```ts
function computeHeuristicScore(prompt: string, role: AgentRole): number {
  const tokens = prompt.trim().split(/\s+/).filter(Boolean)
  const tokenCount = tokens.length
  const score =
    lengthScore(tokenCount) +
    roleKeywordScore(prompt, role) +
    specificityScore(prompt)
  return Math.round(Math.max(0, Math.min(100, score)))
}
```

---

## Claude API grader (on-demand)

The player can press a **"Grade with AI"** button on any agent card. This fires a single Claude API call and caches the result on the agent. The button is disabled while loading and shows the cached score once received.

### API call

```ts
async function gradeWithClaude(prompt: string, role: AgentRole): Promise<{
  score: number
  explanation: string
}> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are grading an AI agent prompt for a ${role} agent in a startup simulation game.

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
      }]
    })
  })

  const data = await response.json()
  const text = data.content[0].text.trim()
  const parsed = JSON.parse(text)
  return { score: parsed.score, explanation: parsed.explanation }
}
```

### Caching

Once a prompt has been API-graded, set `agent.qualityCached = true` and store the score. The cached score is used for output multipliers instead of the heuristic score.

The cache is invalidated (reset to heuristic) when the player edits the prompt by more than 10 characters from the cached version. Track the cached prompt text alongside the score.

### UI states for the grade button

- Default: "Grade with AI ✦"
- Loading: "Grading..." (disabled)
- Cached: "Graded ✓" with the score shown (clicking re-grades)
- Error: "Retry" with a small error message

---

## Token counter

Count tokens by splitting on whitespace. This is intentionally approximate — it matches the intuition of "more words = more expensive" without needing a real tokenizer.

```ts
function countTokens(prompt: string): number {
  return prompt.trim().split(/\s+/).filter(Boolean).length
}
```

Display the count live next to the textarea: `"47 tokens"`. Color it amber above 100, red above 200.

Token count also drives per-tick model cost — see `PRESTIGE.md#llm-models`. Longer prompts
literally cost more every tick, which amplifies the "keep it concise" scoring signal with a
direct economic penalty.

---

## Score display

Show the quality score as a badge on the agent card. Color coding:

- 0–39: red — agent is at drift risk, warn visually
- 40–69: amber — acceptable but suboptimal
- 70–89: teal — good
- 90–100: purple — excellent

Show a small "!" icon next to the badge if `driftRisk` is true (score < 40).

---

## Prompt templates (prestige upgrade)

If the player has purchased the `promptTemplates` upgrade, show a "Use template" button that populates the textarea with a role-appropriate starter prompt. Templates should be genuinely good prompts that score 70+ on the heuristic, so the upgrade feels valuable.

```ts
const PROMPT_TEMPLATES: Record<AgentRole, string> = {
  sales:
    'Close 3 enterprise deals this week. Target accounts with 50+ seats. Follow up within 24 hours of demo. Avoid discounting below 15%.',
  marketing:
    'Run a LinkedIn campaign targeting B2B founders. Goal: 500 signups. Focus on pain point messaging, not feature lists.',
  engineering:
    'Ship the onboarding flow by Friday. Must include email verification and error states. No regressions on existing auth.',
  finance:
    'Reduce monthly burn by 12%. Audit SaaS subscriptions first. Flag any expense over $500 without a clear ROI.',
}
```
