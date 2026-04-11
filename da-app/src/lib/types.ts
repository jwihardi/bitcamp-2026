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

export type ChaosEventType =
  | 'hallucination'
  | 'prod_bug'
  | 'competitor'
  | 'due_diligence'

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

export type Agent = {
  id: string
  name: string
  icon: AgentIcon
  role: AgentRole
  prompt: string
  tokenCount: number
  qualityScore: number
  qualityCached: boolean
  cachedPromptText: string
  driftRisk: boolean
  isOffTask: boolean
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

  activeTipCard: TipCard | null
}

export type TickPayload = {
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
  | {
      type: 'GRADE_AGENT_AI'
      agentId: string
      score: number
      cachedPromptText: string
    }
  | { type: 'DISMISS_CHAOS_EVENT' }
  | { type: 'DISMISS_TIP_CARD' }
  | { type: 'ENTER_BURN_MODE' }
  | { type: 'EXIT_BURN_MODE' }
  | { type: 'IPO_TRIGGERED'; valuation: number; chipsEarned: number }
  | { type: 'GAME_OVER' }
  | { type: 'NEW_RUN' }
  | {
      type: 'BUY_UPGRADE'
      upgrade: 'fasterTicks' | 'biggerBudget' | 'promptTemplates'
    }
