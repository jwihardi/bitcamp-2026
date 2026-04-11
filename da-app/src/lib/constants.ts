import type {
  AgentRole,
  AgentIcon,
  ChaosEventType,
  FundingRound,
  Model,
  ModelId,
  TipCard,
  Upgrades,
  GameState,
} from './types'

// ---- Economy ----

export const BASE_RUNWAY = 50_000
export const BUDGET_PER_TIER = 25_000
export const VALUATION_MULTIPLE = 10

export const AGENT_SALARY: Record<AgentRole, number> = {
  sales: 3000,
  marketing: 2500,
  engineering: 3500,
  finance: 2800,
}

export const BASE_OUTPUT: Record<
  AgentRole,
  { arr?: number; users?: number; features?: number }
> = {
  sales: { arr: 8000 },
  marketing: { arr: 2000, users: 50 },
  engineering: { arr: 1000, features: 0.05 },
  finance: {},
}

// ---- Tick ----

export const DEFAULT_TICK_INTERVAL = 3000
export const TICK_INTERVALS: readonly [number, number, number, number] = [
  3000, 2500, 2000, 1500,
]

// How many real-time seconds constitute one in-game day.
// Change this to speed up or slow down the day cycle.
export const DAY_DURATION_SECONDS = 240 // 4 minutes

export const DRIFT_CHANCE = 0.15
export const CHAOS_CHANCE_PER_TICK = 0.04

// ---- Rounds ----

export type MilestoneConfig = {
  arr: number
  users?: number
  features?: number
  agentSlotsUnlocked: number
  label: string
}

export const ROUNDS: Record<FundingRound, MilestoneConfig> = {
  pre_seed: {
    arr: 100_000,
    agentSlotsUnlocked: 2,
    label: 'Pre-seed',
  },
  seed: {
    arr: 500_000,
    features: 1,
    agentSlotsUnlocked: 4,
    label: 'Seed',
  },
  series_a: {
    arr: 2_000_000,
    users: 1000,
    agentSlotsUnlocked: 6,
    label: 'Series A',
  },
  series_b: {
    arr: 10_000_000,
    features: 3,
    agentSlotsUnlocked: 8,
    label: 'Series B',
  },
  ipo: {
    arr: 0,
    agentSlotsUnlocked: 8,
    label: 'IPO',
  },
}

export const ROUND_ORDER: FundingRound[] = [
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'ipo',
]

// ---- Chaos events ----

export type ChaosEventConfig = {
  agentRole: AgentRole
  title: string
  description: string
  penaltyDescription: string
  fixThreshold: number
}

export const CHAOS_EVENT_CONFIGS: Record<ChaosEventType, ChaosEventConfig> = {
  hallucination: {
    agentRole: 'marketing',
    title: 'Your Marketing agent hallucinated a product feature',
    description:
      "They published a blog post promising a feature that doesn't exist. Users are churning.",
    penaltyDescription: '-20% users per tick until Marketing prompt improves',
    fixThreshold: 65,
  },
  prod_bug: {
    agentRole: 'engineering',
    title: 'Engineering shipped a bug to prod',
    description: 'A critical bug hit production. Customers are cancelling.',
    penaltyDescription:
      '-25% ARR per tick from churn until Engineering prompt improves',
    fixThreshold: 65,
  },
  competitor: {
    agentRole: 'sales',
    title: 'A competitor just launched a similar product',
    description:
      "They're undercutting your pricing. Deals are stalling.",
    penaltyDescription: '-30% Sales output per tick until Sales prompt is updated',
    fixThreshold: 70,
  },
  due_diligence: {
    agentRole: 'finance',
    title: 'Investors audited your Finance agent',
    description:
      'They found your financial projections are vague and unconvincing.',
    penaltyDescription:
      'Valuation multiple reduced to 7x until Finance prompt improves',
    fixThreshold: 60,
  },
}

// ---- Tip cards ----

export const TIP_CARDS: TipCard[] = [
  {
    id: 'first_agent_hired',
    trigger: 'first_agent_hired',
    title: 'Your first agent is live',
    body: "Write them a prompt. The more specific and concise it is, the better they'll perform. A 500-word prompt isn't better — it's noisier.",
    concept: 'Prompt engineering',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_tick',
    trigger: 'first_tick',
    title: 'Your runway is ticking',
    body: 'Runway is how long you can survive before running out of cash. Every tick costs you money in agent salaries. ARR is what saves you.',
    concept: 'Runway',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_low_score',
    trigger: 'first_low_score',
    title: 'That prompt needs work',
    body: 'Scores below 40 put your agent at risk of going off-task — wasting a tick entirely. Shorter, more specific prompts score higher.',
    concept: 'Prompt quality',
    dismissLabel: "I'll fix it",
  },
  {
    id: 'first_drift',
    trigger: 'first_drift',
    title: 'Your agent went off-task',
    body: 'Vague prompts cause drift. When an agent goes off-task, they produce nothing that tick — burning salary with zero return.',
    concept: 'Agent drift',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_chaos_event',
    trigger: 'first_chaos_event',
    title: 'Chaos happens',
    body: "Real startups deal with unexpected setbacks constantly. Improve the flagged agent's prompt to clear the penalty.",
    concept: 'Operational risk',
    dismissLabel: 'On it',
  },
  {
    id: 'entered_burn_mode',
    trigger: 'entered_burn_mode',
    title: "You're in burn mode",
    body: "You're running out of time on this milestone. Ticks are faster, costs are higher. Fix your worst prompts or fire an agent to cut burn.",
    concept: 'Burn rate',
    dismissLabel: 'Got it',
  },
  {
    id: 'round_advance_seed',
    trigger: 'round_advance_seed',
    title: 'Seed round closed',
    body: "You've unlocked 2 new agent slots. Seed rounds mean investors believe in your growth story — now you have to execute it.",
    concept: 'Seed funding',
    dismissLabel: "Let's go",
  },
  {
    id: 'round_advance_series_a',
    trigger: 'round_advance_series_a',
    title: 'Series A unlocked',
    body: "Series A investors are betting on your growth trajectory. You now need users, not just revenue. Add a Marketing agent if you haven't.",
    concept: 'Series A',
    dismissLabel: 'Got it',
  },
  {
    id: 'round_advance_series_b',
    trigger: 'round_advance_series_b',
    title: 'Series B — scaling up',
    body: "Series B is about proving you can scale what's working. Your cost per new dollar of ARR should be dropping. That's called improving unit economics.",
    concept: 'Unit economics',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_penalty_cleared',
    trigger: 'first_penalty_cleared',
    title: 'Penalty cleared',
    body: 'Better prompts fixed the damage. This is the core loop — write, observe, improve. Real prompt engineers do the same thing.',
    concept: 'Iterative improvement',
    dismissLabel: 'Nice',
  },
  {
    id: 'runway_below_25k',
    trigger: 'runway_below_25k',
    title: 'Runway critical',
    body: "Under $25k means you're weeks from zero. Cut your lowest-performing agent or find a way to spike ARR fast. CAC might be killing you.",
    concept: 'CAC (Customer Acquisition Cost)',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_agent_fired',
    trigger: 'first_agent_fired',
    title: 'Agent fired',
    body: 'Cutting headcount reduces burn immediately. Painful, but sometimes the only move. Real startups call this a "right-sizing."',
    concept: 'Headcount management',
    dismissLabel: 'Understood',
  },
  {
    id: 'ipo_triggered',
    trigger: 'ipo_triggered',
    title: 'IPO incoming',
    body: "You hit $100M valuation. Your company is going public — or more likely, getting acquired. That's a win either way. Time to prestige.",
    concept: 'Valuation',
    dismissLabel: "Let's go",
  },
]

// ---- Prompt templates ----

export const PROMPT_TEMPLATES: Record<AgentRole, string> = {
  sales:
    'Close 3 enterprise deals this week. Target accounts with 50+ seats. Follow up within 24 hours of demo. Avoid discounting below 15%.',
  marketing:
    'Run a LinkedIn campaign targeting B2B founders. Goal: 500 signups. Focus on pain point messaging, not feature lists.',
  engineering:
    'Ship the onboarding flow by Friday. Must include email verification and error states. No regressions on existing auth.',
  finance:
    'Reduce monthly burn by 12%. Audit SaaS subscriptions first. Flag any expense over $500 without a clear ROI.',
}

// ---- Icons and role colors ----

export const AGENT_ICONS: Record<AgentIcon, string> = {
  robot: '🤖',
  briefcase: '💼',
  chart: '📊',
  wrench: '🔧',
  lightbulb: '💡',
  rocket: '🚀',
}

export const ROLE_COLORS: Record<AgentRole, string> = {
  sales: 'bg-blue-100 text-blue-800',
  marketing: 'bg-purple-100 text-purple-800',
  engineering: 'bg-teal-100 text-teal-800',
  finance: 'bg-amber-100 text-amber-800',
}

// ---- Initial state ----

// ---- LLM Models ----

export const DEFAULT_MODEL_ID: ModelId = 'nimbus_1'

export const MODELS: Record<ModelId, Model> = {
  nimbus_1: {
    id: 'nimbus_1',
    name: 'Nimbus-1',
    tagline: 'Cheap cycles, tight ceiling.',
    description:
      'Your default model. Low per-token cost, capped at 55 quality. Enough to scrape through pre-seed.',
    costPerToken: 5,
    qualityCap: 55,
    prestigeCost: 0,
    unlockedByDefault: true,
  },
  quanta_s: {
    id: 'quanta_s',
    name: 'Quanta-S',
    tagline: 'Mid-tier reasoning.',
    description:
      'Solid general-purpose model. ~2.4× the per-token cost of Nimbus, but raises the quality ceiling to 75.',
    costPerToken: 12,
    qualityCap: 75,
    prestigeCost: 3,
    unlockedByDefault: false,
  },
  synapse_pro: {
    id: 'synapse_pro',
    name: 'Synapse Pro',
    tagline: 'Series-A grade.',
    description:
      'High ceiling, high burn. Quality cap 90. Long prompts on this model will wreck your runway.',
    costPerToken: 25,
    qualityCap: 90,
    prestigeCost: 7,
    unlockedByDefault: false,
  },
  oracle_ultra: {
    id: 'oracle_ultra',
    name: 'Oracle Ultra',
    tagline: 'IPO-tier cognition.',
    description:
      'The frontier. Uncapped quality ceiling. A single 200-token prompt can burn $9k/tick.',
    costPerToken: 45,
    qualityCap: 100,
    prestigeCost: 15,
    unlockedByDefault: false,
  },
}

export const INITIAL_UPGRADES: Upgrades = {
  fasterTicks: 0,
  biggerBudget: 0,
  promptTemplates: false,
  unlockedModelIds: ['nimbus_1'],
}

export const INITIAL_STATE: GameState = {
  phase: 'playing',
  round: 'pre_seed',
  arr: 0,
  runway: BASE_RUNWAY,
  burnRate: 0,
  users: 0,
  features: 0,
  valuation: 0,
  agents: [],
  agentSlots: 2,
  tickInterval: DEFAULT_TICK_INTERVAL,
  tickCount: 0,
  vcChips: 0,
  upgrades: INITIAL_UPGRADES,
  activeChaosEvent: null,
  pendingPenalties: [],
}

// ---- Upgrade costs ----

export const UPGRADE_COSTS: {
  fasterTicks: readonly [number, number, number]
  biggerBudget: readonly [number, number, number]
  promptTemplates: number
} = {
  fasterTicks: [2, 5, 10],
  biggerBudget: [1, 3, 7],
  promptTemplates: 3,
}
