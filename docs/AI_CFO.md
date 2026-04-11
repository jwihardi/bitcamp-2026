# AI_CFO.md — Vibe Combinator

The AI CFO is a company-wide strategic advisor. It doesn't score individual prompts — that's the evaluator's job. The CFO looks at the full picture and tells you what to do next: who to hire, who to fire, where you're bleeding money, and why. It's also the game's primary educational voice, teaching token economics and startup finance through contextualized advice.

---

## Role

The CFO is a coach, not a grader. It answers questions like:

- "Should I hire a third agent or improve my existing prompts?"
- "My burn rate is $3k/tick — is that sustainable for this round?"
- "I have two agents with score 55. Which one matters more right now?"
- "What's the fastest path to hitting my Series A milestone?"

It also proactively teaches concepts: what burn rate means, why token efficiency matters, how CAC relates to marketing spend, why lean teams outperform bloated ones.

---

## UI surface

A collapsible side panel anchored to the right edge of the screen.

### Collapsed state
A small vertical tab: `"💰 CFO"`. Pulses gently when the report is stale or when company health is critical.

### Expanded panel (360px wide)

1. **Header**: "AI CFO" + "Ask for advice" button
2. **Cost label**: "$500 per consultation"
3. **Company health badge**: healthy / warning / critical with color
4. **Verdict**: one-line summary of company state
5. **Strategic advice**: 2–3 prioritized recommendations
6. **Lesson of the moment**: a short educational blurb tied to current game state
7. **Last consulted**: "12 ticks ago" or "Never consulted"

---

## API call

One call per consultation. Evaluates company-wide state. No individual prompt scoring — that's `PROMPT_EVAL.md`.

```ts
async function consultCFO(state: GameState): Promise<CFOReport> {
  const agentSummaries = state.agents.map(a => ({
    name: a.name,
    role: a.role,
    score: a.qualityScore,
    tokenCount: a.tokenCount,
    isOffTask: a.isOffTask,
    hasEval: !!a.evalResult,
    evalEfficiency: a.evalResult?.tokenEfficiency ?? null,
  }))

  const currentMilestone = ROUNDS[state.round]

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_GEMINI_API_KEY', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          text: `You are the AI CFO in a startup simulation game. Your job is to give strategic advice and teach the player about startup finance and token economics. Do NOT score individual prompts — just advise on company strategy.

Company state:
- Round: ${state.round} (need $${currentMilestone.arr.toLocaleString()} ARR${currentMilestone.users ? `, ${currentMilestone.users} users` : ''}${currentMilestone.features ? `, ${currentMilestone.features} features` : ''})
- ARR: $${state.arr.toLocaleString()}
- Runway: $${state.runway.toLocaleString()}
- Users: ${state.users}
- Features: ${state.features}
- Agent slots used: ${state.agents.length} / ${state.agentSlots}
- Phase: ${state.phase}
- Tick interval: ${state.tickInterval}ms
- Active penalties: ${state.pendingPenalties.filter(p => p.active).map(p => p.type).join(', ') || 'none'}

Agents:
${agentSummaries.map(a => `- ${a.name} (${a.role}) — score: ${a.score}, tokens: ${a.tokenCount}${a.isOffTask ? ', OFF-TASK' : ''}${a.evalEfficiency ? `, efficiency: ${a.evalEfficiency}` : ''}`).join('\n')}
${state.agents.length === 0 ? '- No agents hired yet.' : ''}

Respond ONLY with a JSON object, no markdown, no preamble:
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
  const parsed = JSON.parse(text)
  parsed.consultedAt = state.tickCount
  return parsed
}
```

---

## CFO report shape

```ts
type CFOReport = {
  health: 'healthy' | 'warning' | 'critical'
  verdict: string
  advice: string[]         // 2–3 prioritized actions
  lesson: {
    topic: string          // e.g. "Token Efficiency"
    body: string           // 2–3 educational sentences
  }
  consultedAt: number      // tickCount, added client-side
}
```

---

## Consultation cost

```ts
const CFO_CONSULT_COST = 500  // dollars deducted from runway
```

Button: `"Ask for advice ($500)"`. Disabled if runway < $500, tooltip: "Not enough runway."

More expensive than a per-agent evaluation ($200) because the CFO sees everything and returns strategic guidance plus an educational lesson.

---

## Health indicator

```ts
const HEALTH_COLORS = {
  healthy:  'bg-emerald-100 text-emerald-800',
  warning:  'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
}
```

The health badge also appears on the collapsed CFO tab so the player can see the status at a glance without opening the panel.

---

## Advice display

Each advice item renders as a numbered card:

```
1. Fire your marketing agent — their score is 28 and
   they've gone off-task twice. You're paying $2,500/tick
   for almost nothing.

2. Hire an engineering agent — you need 1 feature shipped
   for Seed and you have zero engineers.

3. Tighten your sales prompt — it's 140 words but a
   60-word version would score higher and cost less to run.
```

---

## Lesson display

The lesson section appears as a distinct card at the bottom of the panel with a lightbulb icon and a colored topic pill:

```
💡 Token Efficiency
Every tick, your agents "run" their prompts — and longer prompts
cost more compute. A 200-word prompt that scores 65 might generate
less net revenue than a 50-word prompt scoring 80, because the
shorter one costs a fraction to run. In real AI deployments, this
is why companies obsess over prompt compression.
```

The lesson rotates based on game state — the CFO picks whatever concept is most relevant. Early game might teach "Runway", mid-game "Unit Economics", late-game "Valuation Multiples".

---

## Lesson topic pool

The CFO can draw from these topics (not exhaustive — the LLM picks what fits):

| Topic | When it's relevant |
|-------|-------------------|
| Runway | Early game, runway dropping fast |
| Burn Rate | Multiple agents hired, costs rising |
| Token Efficiency | Agents have long prompts with low scores |
| CAC (Customer Acquisition Cost) | Marketing agent active, user growth slow |
| Unit Economics | Series A+, ARR growing but burn is high |
| Lean Teams | Player has max agents but low scores |
| Prompt Engineering | Any agent below score 50 |
| Valuation Multiples | Approaching IPO, due diligence penalty active |
| Right-sizing | Player should fire an underperformer |
| Compound Growth | Player has high-scoring agents, things are going well |

---

## Staleness

The report goes stale when:

- Any agent is hired or fired
- The round advances
- 20 ticks pass since last consultation
- Phase changes (entering burn mode, game over, etc.)

When stale, the CFO tab shows `"💰 CFO ⟳"` and the panel grays out the old report with: "Things have changed — consult again for updated advice."

Old advice is still visible (grayed out) so the player can reference it, but it's visually demoted.

---

## Tip card integration

```ts
{
  id: 'first_cfo_consult',
  trigger: 'first_cfo_consult',
  title: 'Your CFO is in the building',
  body: 'The AI CFO looks at your whole company and tells you what to prioritize. It also teaches real startup concepts as you play. Use it when you\'re stuck.',
  concept: 'Strategic advisory',
  dismissLabel: 'Got it',
}
```

---

## Edge cases

- **No agents hired**: CFO returns health "critical", verdict "You have no team", advice to hire first agent, lesson on "Runway" explaining that idle runway is wasted runway.
- **API failure**: Show "CFO unavailable — try again." Do not deduct $500. Keep previous report if one exists.
- **Player spamming consults**: The $500 cost is the throttle. No additional rate limiting needed.
- **Game over state**: CFO panel is inaccessible during game over. Report clears on new run.
