export type AgentRole = 'sales' | 'marketing' | 'engineering' | 'finance'

export type AgentIcon =
  | 'robot'
  | 'briefcase'
  | 'chart'
  | 'wrench'
  | 'lightbulb'
  | 'rocket'

export type FundingRound = 'pre_seed' | 'seed' | 'series_a' | 'series_b' | 'ipo'

export type GamePhase =
  | 'playing'
  | 'burn_mode'
  | 'game_over'
  | 'ipo'
  | 'prestige_shop'

export type ModelId = 'nimbus_1' | 'quanta_s' | 'synapse_pro' | 'oracle_ultra'

export type Model = {
  id: ModelId
  name: string
  tagline: string
  description: string
  costPerToken: number
  qualityCap: number
  prestigeCost: number
  unlockedByDefault: boolean
}

export type TipTrigger =
  | 'first_agent_hired'
  | 'first_tick'
  | 'first_low_score'
  | 'first_drift'
  | 'entered_burn_mode'
  | 'round_advance_seed'
  | 'round_advance_series_a'
  | 'round_advance_series_b'
  | 'runway_below_25k'
  | 'first_agent_fired'
  | 'ipo_triggered'
  | 'first_cfo_consult'

export type PromptEvaluation = {
  score: number
  estimatedTokensPerTick: number
  estimatedRevenuePerTick: number
  tokenEfficiency: number
  explanation: string
}

export type CFOHealth = 'healthy' | 'warning' | 'critical'

export type CFOLesson = {
  topic: string
  body: string
}

export type CFOReport = {
  health: CFOHealth
  verdict: string
  advice: string[]
  lesson: CFOLesson
  consultedAt: number
}

export type Agent = {
  id: string
  name: string
  icon: AgentIcon
  role: AgentRole
  prompt: string
  tokenCount: number
  qualityScore: number
  driftRisk: boolean
  isOffTask: boolean
  modelId: ModelId
  evalResult: PromptEvaluation | null
  evalPromptSnapshot: string | null
}

export type TipCard = {
  id: string
  trigger: TipTrigger
  title: string
  body: string
  concept?: string
  dismissLabel: string
}

export type Upgrades = {
  fasterTicks: 0 | 1 | 2 | 3
  biggerBudget: 0 | 1 | 2 | 3
  promptTemplates: boolean
  unlockedModelIds: ModelId[]
}

export type GameState = {
  phase: GamePhase
  round: FundingRound

  arr: number
  runway: number
  burnRate: number
  users: number
  features: number
  valuation: number

  agents: Agent[]
  agentSlots: number

  tickInterval: number
  tickCount: number

  vcChips: number
  upgrades: Upgrades
}

export type TickPayload = {
  tickCount: number
  arrDelta: number
  usersDelta: number
  featuresDelta: number
  runwayDelta: number
  burnRate: number
  agentUpdates: { id: string; isOffTask: boolean }[]
  tipCard: TipCard | null
  phase: GamePhase
  newRound: FundingRound | null
  newAgentSlots: number | null
  valuation: number
  vcChipsEarned: number
}

export type Action =
  | { type: 'TICK'; payload: TickPayload }
  | { type: 'HIRE_AGENT'; agent: Agent }
  | { type: 'FIRE_AGENT'; agentId: string }
  | {
      type: 'UPDATE_PROMPT'
      agentId: string
      prompt: string
      tokenCount: number
      qualityScore: number
    }
  | { type: 'UPDATE_AGENT_NAME'; agentId: string; name: string }
  | { type: 'UPDATE_AGENT_ICON'; agentId: string; icon: AgentIcon }
  | { type: 'UPDATE_AGENT_MODEL'; agentId: string; modelId: ModelId }
  | {
      type: 'EVALUATE_AGENT'
      agentId: string
      evaluation: PromptEvaluation
      promptSnapshot: string
      cost: number
    }
  | { type: 'CONSULT_CFO'; cost: number }
  | { type: 'OPEN_PRESTIGE_SHOP' }
  | { type: 'CLOSE_PRESTIGE_SHOP' }
  | { type: 'ENTER_BURN_MODE' }
  | { type: 'EXIT_BURN_MODE' }
  | { type: 'GAME_OVER' }
  | { type: 'NEW_RUN' }
  | {
      type: 'BUY_UPGRADE'
      upgrade: 'fasterTicks' | 'biggerBudget' | 'promptTemplates'
    }
  | { type: 'BUY_UPGRADE'; upgrade: 'model'; modelId: ModelId }
