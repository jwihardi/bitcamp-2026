# PROMPT_GRADE.md — Vibe Combinator

The prompt evaluator is a per-agent Gemini API call that scores the player's prompt and returns token cost and revenue estimates tailored to the agent's role. It replaces the old "Grade with AI" button with richer, role-aware output.

---

## When it fires

The player clicks **"Evaluate"** on any agent card. One API call per agent. Never automatic.

---

## API call

```ts
async function evaluatePrompt(
  prompt: string,
  role: AgentRole,
  roundContext: { round: FundingRound; arr: number; users: number; features: number }
): Promise<PromptEvaluation> {
  const roleDescriptions: Record<AgentRole, string> = {
    sales: 'generates ARR by closing deals and expanding accounts',
    marketing: 'grows user acquisition through campaigns and content',
    engineering: 'ships product features and maintains system reliability',
    finance: 'reduces burn rate by optimizing spend and cutting waste',
  }

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_GEMINI_API_KEY', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          text: `You are evaluating an AI agent prompt in a startup simulation game.

This agent's role is **${role}**. A ${role} agent ${roleDescriptions[role]}.

The company is currently at the ${roundContext.round} stage with $${roundContext.arr.toLocaleString()} ARR, ${roundContext.users} users, and ${roundContext.features} features shipped.

The player wrote this prompt for their ${role} agent:
<prompt>
${prompt}
</prompt>

Evaluate and return ONLY a JSON object, no markdown, no preamble:
{
  "score": <0-100, how effective this prompt is for a ${role} agent>,
  "estimatedTokensPerTick": <integer, estimate how many LLM tokens this prompt would consume per invocation — consider prompt length, instruction complexity, and expected output size>,
  "estimatedRevenuePerTick": <integer, estimated dollar output per tick for this role given the prompt quality — ${role === 'sales' ? 'ARR generated' : role === 'marketing' ? 'user-equivalent value in dollars' : role === 'engineering' ? 'feature-shipping value in dollars' : 'burn reduction value in dollars'}>,
  "tokenEfficiency": <float rounded to 2 decimals, ratio of estimatedRevenuePerTick to estimatedTokensPerTick — higher is better>,
  "explanation": "<one sentence on what makes this prompt good or bad for a ${role} agent, max 25 words>"
}`
        }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
      },
    })
  })

  const data = await response.json()
  const text = data.candidates[0].content.parts[0].text.trim()
  return JSON.parse(text)
}
```

---

## Evaluation shape

```ts
type PromptEvaluation = {
  score: number                  // 0–100
  estimatedTokensPerTick: number // integer
  estimatedRevenuePerTick: number // integer, dollars
  tokenEfficiency: number        // revenue / tokens ratio
  explanation: string
}
```

---

## Token cost integration

The estimated token count feeds into a per-tick compute cost for the agent, layered on top of salary.

```ts
const TOKEN_COST_RATE = 0.50  // dollars per estimated token per tick

function computeTokenCost(agent: Agent): number {
  // Use evaluation estimate if available, otherwise naive fallback
  const tokens = agent.evalEstimatedTokens ?? agent.tokenCount * 3
  return tokens * TOKEN_COST_RATE
}
```

Before evaluation, agents use a fallback (`wordCount * 3`). After evaluation, the estimate persists until the prompt changes significantly (>10 character delta from evaluated version).

### Burn rate impact

Total burn per tick:

```ts
function calcBurnPerTick(state: GameState): number {
  const salaryCost = state.agents.reduce((sum, a) => sum + AGENT_SALARY[a.role], 0)
  const computeCost = state.agents.reduce((sum, a) => sum + computeTokenCost(a), 0)
  const totalCost = (salaryCost + computeCost) * (state.tickInterval / 1000 / 3600)
  return totalCost
}
```

This makes bloated prompts expensive. A 200-word engineering prompt might score 65 but cost 3x what a tight 40-word prompt costs. Token efficiency becomes a real economic constraint.

---

## Revenue estimate by role

The `estimatedRevenuePerTick` is role-aware:

| Role | What "revenue" means | Example range |
|------|---------------------|---------------|
| Sales | Direct ARR generated | $2,000–$16,000/tick |
| Marketing | User growth valued in dollar-equivalent | $500–$6,000/tick |
| Engineering | Feature velocity valued in dollar-equivalent | $300–$4,000/tick |
| Finance | Burn reduction valued as saved dollars | $200–$3,000/tick |

The estimate is advisory — displayed to the player so they can compare agents. It does **not** replace the heuristic-driven output multiplier in the tick engine. Gameplay math still runs on the fast local heuristic. The evaluation shows the player what a smarter evaluator thinks their prompt is worth.

---

## Agent card display (post-evaluation)

After evaluation, the agent card shows a new section below the heuristic score:

```
Quality: 72 (heuristic)
─────────────────────────
AI Eval: 68
⚡ ~280 tokens/tick ($140 compute)
💰 ~$8,400 revenue/tick
📊 Efficiency: 30.0 $/token
"Add a specific quota number to sharpen the conversion target."
```

### Efficiency color coding

- `< 10`: red — prompt costs more than it's worth
- `10–25`: amber — acceptable but room to improve
- `25–50`: teal — good return on tokens
- `> 50`: purple — excellent efficiency

---

## Evaluation cost

Each evaluation costs runway:

```ts
const EVAL_COST = 200  // dollars per evaluation
```

Button label: `"Evaluate ($200)"`. Disabled if runway < $200.

Cheaper than the CFO ($500) because it's scoped to one agent. Players can evaluate selectively — check the agent they're most unsure about without burning too much runway.

---

## Caching

Cache the evaluation on the agent object:

```ts
type Agent = {
  // ... existing fields
  evalResult: PromptEvaluation | null
  evalPromptSnapshot: string | null  // prompt text at time of evaluation
  evalEstimatedTokens: number | null
}
```

Cache invalidates when the prompt changes by more than 10 characters from `evalPromptSnapshot`. On invalidation, gray out the old eval with a label: "Prompt changed — re-evaluate."

---

## Button states

- Default: `"Evaluate ($200) ✦"`
- Loading: `"Evaluating..."` (disabled)
- Cached: `"Evaluated ✓"` — clicking re-evaluates
- Stale: `"Re-evaluate ($200) ⟳"`
- Error: `"Retry"` — do not deduct cost on failure
- Insufficient funds: `"Evaluate ($200)"` (disabled, tooltip: "Not enough runway")

---

## Edge cases

- **Empty prompt**: Return score 0, tokens 0, revenue 0, explanation "No prompt written." Do not call API — handle client-side.
- **API failure**: Keep previous cached evaluation. Show "Evaluation failed — try again."
- **Very long prompts (>200 words)**: Truncate to first 200 words in the API payload, append `(truncated — full prompt is ${wordCount} words)`. The evaluator can still assess structure from the opening.
