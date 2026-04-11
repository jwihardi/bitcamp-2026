# TICK_ENGINE.md — Vibe Combinator

The tick engine is the heartbeat of the game. Every `tickInterval` milliseconds, it fires and resolves revenue, burn, and drift. Nothing should mutate game state outside of a tick (except direct player actions like editing a prompt or hiring an agent).
8
---

## Tick sequence (in order)

Each tick executes these steps in sequence:

1. **Increment tickCount**
2. **Resolve agent outputs** — each non-off-task agent produces revenue/users/features
3. **Resolve drift rolls** — check each agent for off-task event
4. **Deduct burn** — salary costs drain runway
5. **Check milestone progress** — may trigger phase transition
7. **Check tip card triggers** — fire tip card if conditions met
8. **Check bankruptcy** — if runway <= 0, trigger game over

---

## Agent output per tick

Each agent produces output based on role and quality score. The quality score acts as a multiplier.

```ts
function getOutputMultiplier(qualityScore: number): number {
  // 0.2x at score 0, 1.0x at score 50, 2.0x at score 100
  return 0.2 + (qualityScore / 100) * 1.8
}

const BASE_OUTPUT: Record<AgentRole, { arr?: number; users?: number; features?: number }> = {
  sales:       { arr: 8000 },
  marketing:   { arr: 2000, users: 50 },
  engineering: { arr: 1000, features: 0.05 },  // features accumulate as float, floor for display
  finance:     { arr: 500 },                    // finance reduces burnRate instead — see below
}
```

Finance agents work differently: instead of producing ARR, they reduce the effective `burnRate` by a multiplier each tick. Apply this before deducting burn.

```ts
function applyFinanceAgents(state: GameState): number {
  const financeAgents = state.agents.filter(a => a.role === 'finance' && !a.isOffTask)
  const reductionFactor = financeAgents.reduce((acc, agent) => {
    return acc * (1 - 0.05 * getOutputMultiplier(agent.qualityScore))
  }, 1)
  return state.burnRate * reductionFactor
}
```

---

## Drift rolls

After resolving outputs, check each agent for drift. Only agents with `qualityScore < 40` are eligible.

```ts
const DRIFT_CHANCE = 0.15  // 15% per tick per vulnerable agent

function rollDrift(agent: Agent): boolean {
  if (agent.qualityScore >= 40) return false
  return Math.random() < DRIFT_CHANCE
}
```

If an agent goes off-task:
- Set `agent.isOffTask = true` for this tick (produces no output)
- Show a small toast notification: `"[AgentName] went off-task this tick."`
- Reset `isOffTask` to false at the start of the next tick

---

## Burn calculation

```ts
function calcBurnPerTick(state: GameState): number {
  const salaryCost = state.agents.reduce((sum, a) => sum + AGENT_SALARY[a.role], 0)
  const baseBurn = salaryCost * (state.tickInterval / 1000 / 3600)  // scale to tick duration
  return baseBurn
}
```

Deduct the result from `state.runway` each tick. If `runway <= 0`, dispatch `GAME_OVER`.

---

## Burn mode

Burn mode activates when the player is within the final 20% of a milestone timer without meeting the goal. It does not activate based on runway alone.

While in burn mode:
- `tickInterval` is halved (e.g. 3000ms → 1500ms)
- The UI pulses visually (handled in `FUNDING_GATES.md`)
- A tip card fires on first entry: "You're in burn mode. Cut costs or improve your prompts fast."

Burn mode exits when the milestone is met or the player fires an agent (reducing burn).

---

## Implementation notes

- Use `useEffect` with `setInterval` in a `TickEngine` component. Clear the interval on unmount.
- When `tickInterval` changes (burn mode or prestige upgrade), clear and restart the interval.
- The tick function should be wrapped in `useCallback` with all state as a dependency, or use a ref to always access fresh state without stale closures.
- Dispatch a single `TICK` action per tick with a payload containing all resolved deltas. The reducer applies them atomically — never dispatch multiple actions in one tick.

```ts
dispatch({
  type: 'TICK',
  payload: {
    arrDelta,
    usersDelta,
    featuresDelta,
    runwayDelta,    // negative (burn)
    agentUpdates,   // isOffTask flags
    tipCard,        // null or tip to show
  }
})
```
