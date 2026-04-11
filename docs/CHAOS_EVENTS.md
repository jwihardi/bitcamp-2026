# CHAOS_EVENTS.md — Vibe Combinator

Chaos events are random disruptions that fire during the game loop. They apply a persistent penalty until the player improves the responsible agent's prompt above a threshold. They are the game's primary way of forcing players back to prompt editing instead of going idle.

---

## Event definitions

```ts
type ChaosEventType = 'hallucination' | 'prod_bug' | 'competitor' | 'due_diligence'

type ChaosEvent = {
  id: string
  type: ChaosEventType
  agentRole: AgentRole        // which agent triggered it
  title: string
  description: string
  penaltyDescription: string  // shown while penalty is active
  fixThreshold: number        // prompt score required to clear penalty
}
```

### 1. Hallucination

Triggered by: a Marketing agent with score < 60.

```ts
{
  type: 'hallucination',
  agentRole: 'marketing',
  title: 'Your Marketing agent hallucinated a product feature',
  description: 'They published a blog post promising a feature that doesn\'t exist. Users are churning.',
  penaltyDescription: '-20% users per tick until Marketing prompt improves',
  fixThreshold: 65,
}
```

Penalty: multiply `usersDelta` by 0.8 each tick while active. Also immediately remove 15% of current `users`.

### 2. Prod bug

Triggered by: an Engineering agent with score < 55.

```ts
{
  type: 'prod_bug',
  agentRole: 'engineering',
  title: 'Engineering shipped a bug to prod',
  description: 'A critical bug hit production. Customers are cancelling.',
  penaltyDescription: '-25% ARR per tick from churn until Engineering prompt improves',
  fixThreshold: 65,
}
```

Penalty: multiply `arrDelta` by 0.75 each tick while active. Also immediately remove 10% of current `arr`.

### 3. Competitor launch

Triggered by: any time after Series A, regardless of agent score. (External pressure event.)

```ts
{
  type: 'competitor',
  agentRole: 'sales',
  title: 'A competitor just launched a similar product',
  description: 'They\'re undercutting your pricing. Deals are stalling.',
  penaltyDescription: '-30% Sales output per tick until Sales prompt is updated',
  fixThreshold: 70,
}
```

Penalty: multiply Sales `arrDelta` by 0.7 each tick while active. No immediate hit — just ongoing reduction.

### 4. Investor due diligence

Triggered by: any Finance agent with score < 50.

```ts
{
  type: 'due_diligence',
  agentRole: 'finance',
  title: 'Investors audited your Finance agent',
  description: 'They found your financial projections are vague and unconvincing.',
  penaltyDescription: 'Valuation multiple reduced to 7x until Finance prompt improves',
  fixThreshold: 60,
}
```

Penalty: reduce `VALUATION_MULTIPLE` from 10 to 7 while active. This makes the IPO milestone harder to reach. No per-tick ARR impact.

---

## Event selection logic

When the tick engine decides to fire a chaos event (see `TICK_ENGINE.md`), select an event type using this priority:

1. Check if any agent has a score below its event threshold — if so, weight those events 3x
2. If no agents are vulnerable, still pick randomly (competitor is always eligible after Series A)
3. Pick the `agentRole` for the event from a currently-hired agent of the required role
4. If no agent of the required role exists (e.g. no Finance agent for due_diligence), skip that event type and re-roll

```ts
function pickChaosEvent(state: GameState): ChaosEvent | null {
  const candidates: ChaosEventType[] = []

  if (state.agents.find(a => a.role === 'marketing' && a.qualityScore < 60))
    candidates.push('hallucination', 'hallucination', 'hallucination')
  else
    candidates.push('hallucination')

  if (state.agents.find(a => a.role === 'engineering' && a.qualityScore < 55))
    candidates.push('prod_bug', 'prod_bug', 'prod_bug')
  else
    candidates.push('prod_bug')

  if (['series_a', 'series_b', 'ipo'].includes(state.round))
    candidates.push('competitor')

  if (state.agents.find(a => a.role === 'finance' && a.qualityScore < 50))
    candidates.push('due_diligence', 'due_diligence', 'due_diligence')
  else if (state.agents.find(a => a.role === 'finance'))
    candidates.push('due_diligence')

  if (candidates.length === 0) return null

  const type = candidates[Math.floor(Math.random() * candidates.length)]
  // Build full event object from type...
  return buildChaosEvent(type, state)
}
```

---

## Modal UI

When a chaos event fires, set `state.activeChaosEvent` and render the chaos event modal. The modal is not dismissible by clicking outside — the player must read it.

### Modal content

- **Title** — bold, in red
- **Description** — one paragraph explaining what happened
- **Penalty** — clearly labeled: "Active penalty:" + `penaltyDescription`
- **Fix instruction** — "Improve your [Role] agent's prompt above score [fixThreshold] to clear this penalty."
- **Dismiss button** — "Got it" — closes the modal but the penalty persists

The modal does not pause the tick engine. Time keeps moving while it's open.

---

## Penalty persistence and resolution

Every tick, check all `pendingPenalties`:

```ts
function resolvePenalties(state: GameState): Penalty[] {
  return state.pendingPenalties.map(penalty => {
    const responsibleAgent = state.agents.find(a => a.role === penalty.agentRole)
    if (!responsibleAgent) return { ...penalty, active: false }  // agent was fired, clear it

    const event = CHAOS_EVENT_CONFIGS[penalty.type]
    const fixed = responsibleAgent.qualityScore >= event.fixThreshold
    return { ...penalty, active: !fixed }
  })
}
```

When a penalty's `active` flips to false:
- Show a small success toast: `"[Role] agent penalty cleared!"`
- The tick output for that role returns to normal next tick

---

## Active penalty indicator

While a penalty is active, show a small warning banner on the affected agent's card:

> "Active penalty: -25% ARR output" (in amber/red)

This banner persists until the penalty is cleared. It should be visually distinct from the off-task indicator.

---

## Stacking

At most one chaos event modal fires at a time (`activeChaosEvent` is a single event, not an array). But multiple penalties can be active simultaneously — they stack multiplicatively on outputs.

Do not fire a new chaos event modal while one is already pending dismissal.
