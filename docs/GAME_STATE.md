# GAME_STATE.md — Vibe Combinator

This file defines the single source of truth for all game state. Every other system reads from and writes to this shape. Do not add state that isn't defined here without updating this file first.

---

## Top-level state shape

```ts
type GameState = {
  // Meta
  phase: 'playing' | 'burn_mode' | 'game_over' | 'ipo' | 'prestige_shop'
  round: FundingRound

  // Economy
  arr: number           // Annual Recurring Revenue in dollars
  runway: number        // Remaining cash in dollars
  burnRate: number      // Dollars drained per tick (base + agent salaries)
  users: number         // User count (needed for some milestones)
  features: number      // Features shipped (needed for some milestones)
  valuation: number     // Computed at IPO: arr * valuation_multiple

  // Agents
  agents: Agent[]
  agentSlots: number    // Max agents allowed at current round

  // Tick
  tickInterval: number  // Milliseconds between ticks (default 3000)
  tickCount: number     // Total ticks elapsed this run

  // Prestige
  vcChips: number
  upgrades: {
    fasterTicks: 0 | 1 | 2 | 3    // tier purchased (0 = none)
    biggerBudget: 0 | 1 | 2 | 3
    promptTemplates: boolean
    unlockedModelIds: ModelId[]   // persists across runs; always contains 'nimbus_1'
  }

  // UI state
  activeTipCard: TipCard | null
}
```

---

## Agent shape

```ts
type Agent = {
  id: string            // uuid
  name: string          // player-assigned
  icon: AgentIcon       // one of a fixed set of icon keys
  role: AgentRole
  prompt: string
  tokenCount: number    // computed from prompt on change
  qualityScore: number  // 0–100, computed by heuristic or cached from API (raw, pre-cap)
  qualityCached: boolean // true if score came from Claude API grade
  driftRisk: boolean    // true if qualityScore < 40
  isOffTask: boolean    // true for current tick if drift roll hit
  modelId: ModelId      // which LLM model this agent runs on
}

type AgentRole = 'sales' | 'marketing' | 'engineering' | 'finance'

type AgentIcon = 'robot' | 'briefcase' | 'chart' | 'wrench' | 'lightbulb' | 'rocket'

type ModelId = 'nimbus_1' | 'quanta_s' | 'synapse_pro' | 'oracle_ultra'

type Model = {
  id: ModelId
  name: string
  tagline: string
  description: string
  costPerToken: number     // dollars added to burn per tick per token
  qualityCap: number       // clamps effective qualityScore at output resolution
  prestigeCost: number     // chips, 0 for the default unlocked model
  unlockedByDefault: boolean
}
```

Agents always carry a `modelId`. The player chooses one in the hire modal (restricted to
`upgrades.unlockedModelIds`) and can swap it later via the edit modal. The raw
`qualityScore` stays as-is; the cap is applied when computing output multipliers inside the
tick engine — see `TICK_ENGINE.md`.

---

## Funding round enum

```ts
type FundingRound = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'ipo'

const ROUND_ORDER: FundingRound[] = [
  'pre_seed', 'seed', 'series_a', 'series_b', 'ipo'
]
```

---

## Initial state (new run)

```ts
const INITIAL_STATE: GameState = {
  phase: 'playing',
  round: 'pre_seed',
  arr: 0,
  runway: 50000,        // +25k per biggerBudget tier from prestige
  burnRate: 0,
  users: 0,
  features: 0,
  valuation: 0,
  agents: [],
  agentSlots: 2,
  tickInterval: 3000,   // reduced by fasterTicks upgrade
  tickCount: 0,
  vcChips: 0,           // carried over from previous run
  upgrades: {           // carried over from previous run
    fasterTicks: 0,
    biggerBudget: 0,
    promptTemplates: false,
    unlockedModelIds: ['nimbus_1'],
  },
  activeTipCard: null,
}
```

---

## Constants

```ts
const BASE_RUNWAY = 50000
const BUDGET_PER_TIER = 25000

const AGENT_SALARY: Record<AgentRole, number> = {
  sales:       3000,   // per tick, deducted from runway
  marketing:   2500,
  engineering: 3500,
  finance:     2800,
}

const VALUATION_MULTIPLE = 10  // valuation = arr * 10 at IPO
```

---

## State management approach

Use `useReducer` with a single `dispatch` function. All mutations go through named actions — never mutate state directly. The tick engine, and prestige system all dispatch actions into the same reducer.

Persist `vcChips` and `upgrades` to `localStorage` between sessions. Everything else resets on game over or prestige.
