# FUNDING_GATES.md — Vibe Combinator

Funding gates are the progression system. Each round has a milestone the player must hit before their runway runs out. Clearing a milestone advances the round, unlocks more agent slots, and resets the milestone timer. Missing it triggers game over.

---

## Round definitions

```ts
type MilestoneConfig = {
  arr: number
  users?: number
  features?: number
  agentSlotsUnlocked: number
  timeLimit: number   // seconds the player has to hit the milestone
  label: string
}

const ROUNDS: Record<FundingRound, MilestoneConfig> = {
  pre_seed: {
    arr: 100_000,
    agentSlotsUnlocked: 2,
    timeLimit: 300,   // 5 minutes
    label: 'Pre-seed',
  },
  seed: {
    arr: 500_000,
    features: 1,
    agentSlotsUnlocked: 4,
    timeLimit: 420,   // 7 minutes
    label: 'Seed',
  },
  series_a: {
    arr: 2_000_000,
    users: 1000,
    agentSlotsUnlocked: 6,
    timeLimit: 480,
    label: 'Series A',
  },
  series_b: {
    arr: 10_000_000,
    features: 3,
    agentSlotsUnlocked: 8,
    timeLimit: 600,
    label: 'Series B',
  },
  ipo: {
    arr: 0,           // IPO triggers on valuation, not ARR directly
    agentSlotsUnlocked: 8,
    timeLimit: 720,
    label: 'IPO',
  },
}
```

IPO triggers when `state.arr * VALUATION_MULTIPLE >= 100_000_000` (i.e. ARR >= $10M with a 10x multiple). The Series B ARR goal effectively gates this, so the IPO timer is a soft deadline.

---

## Milestone check (runs every tick)

```ts
function checkMilestone(state: GameState): 'advance' | 'none' {
  const config = ROUNDS[state.round]
  const arrMet = state.arr >= config.arr
  const usersMet = config.users ? state.users >= config.users : true
  const featuresMet = config.features ? state.features >= config.features : true

  if (arrMet && usersMet && featuresMet) return 'advance'
  return 'none'
}
```

On `'advance'`:
1. Compute new round (next in `ROUND_ORDER`)
2. If next round is `'ipo'`, dispatch `IPO_TRIGGERED` instead of `ADVANCE_ROUND`
3. Set `agentSlots` to the new round's value
4. Reset milestone timer
5. Exit burn mode if active
6. Fire the appropriate tip card for the new round

---

## HUD layout

The funding gate HUD is a persistent bar at the top of the screen (not inside the agent grid). It shows:

- **Current round label** — e.g. "Series A"
- **ARR progress** — `$1.4M / $2M ARR` with a progress bar
- **Secondary condition** — shown only if required: `1,000 users / 1,000` or `2 features / 3`
- **Time remaining** — countdown in `MM:SS` format, turns amber below 60s, red below 20s
- **Runway** — `$284,000 runway` shown separately, turns red below $50k

---

## Burn mode

Burn mode activates when the milestone timer drops below 20% of its total duration AND the milestone has not been met.

```ts
function shouldEnterBurnMode(state: GameState, timeRemainingSeconds: number): boolean {
  const config = ROUNDS[state.round]
  const threshold = config.timeLimit * 0.2
  return timeRemainingSeconds <= threshold && checkMilestone(state) === 'none'
}
```

While in burn mode:
- `tickInterval` halves (clamped to minimum 1000ms)
- The HUD timer pulses red
- The entire game border or background gets a subtle red pulse animation
- A tip card fires once on entry (does not repeat)
- Firing an agent immediately exits burn mode if the milestone is now achievable

Burn mode exits when:
- The milestone is met (advance round, exit burn mode)
- The player fires an agent and runway stabilizes (manual exit — just clear the `burn_mode` phase flag)

---

## Game over

Game over triggers when `state.runway <= 0`. It can also trigger if the milestone timer hits 0 without the milestone being met.

On game over:
- Set `state.phase = 'game_over'`
- Show the game over screen (see below)
- Do not clear `vcChips` or `upgrades` — they persist

### Game over screen

Full-screen overlay with:
- Round reached: "You made it to Series A"
- Peak ARR: "$1.8M ARR"
- Ticks survived: "94 ticks"
- A single CTA: "Try again" — restarts from `INITIAL_STATE` with chips/upgrades preserved

No prestige chips are awarded on game over (only on IPO).

---

## Round advance animation

When a milestone is cleared:
- Show a full-screen flash (white, 150ms) then a congratulations banner
- Banner: "[Round] unlocked! [X] new agent slots available."
- Banner auto-dismisses after 3 seconds
- Agent slot grid re-renders with newly unlocked slots fading in
