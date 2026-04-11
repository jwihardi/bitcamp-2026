import type {
  Agent,
  FundingRound,
  GameState,
  TipCard,
  TickPayload,
} from './types'
import {
  AGENT_SALARY,
  BASE_OUTPUT,
  DEFAULT_MODEL_ID,
  DRIFT_CHANCE,
  MODELS,
  ROUND_ORDER,
  ROUNDS,
  TIP_CARDS,
  VALUATION_MULTIPLE,
} from './constants'

// ---- Model helpers ----

function getAgentModel(agent: Agent) {
  return MODELS[agent.modelId] ?? MODELS[DEFAULT_MODEL_ID]
}

export function hasActivePrompt(agent: Agent): boolean {
  return agent.prompt.trim().length > 0
}

export function getEffectiveQualityScore(agent: Agent): number {
  const model = getAgentModel(agent)
  return Math.min(agent.qualityScore, model.qualityCap)
}

export function getAgentTokensForBurn(agent: Agent): number {
  if (!hasActivePrompt(agent)) return 0
  return agent.evalResult?.estimatedTokensPerTick ?? agent.tokenCount
}

export function getAgentTickCost(agent: Agent): number {
  if (!hasActivePrompt(agent)) return 0
  const model = getAgentModel(agent)
  return AGENT_SALARY[agent.role] + getAgentTokensForBurn(agent) * model.costPerToken
}

// ---- Output multiplier ----

export function getOutputMultiplier(qualityScore: number): number {
  return 0.2 + (qualityScore / 100) * 1.8
}

// ---- Burn per tick ----

export function calcBurnPerTick(state: GameState): number {
  const salaryCost = state.agents.reduce((sum, a) => sum + getAgentTickCost(a), 0)
  return salaryCost * (state.tickInterval / 1000 / 3600)
}

// ---- Finance burn reduction ----

export function applyFinanceAgents(state: GameState, baseBurn: number): number {
  const financeAgents = state.agents.filter((a) => a.role === 'finance' && !a.isOffTask)
  const reductionFactor = financeAgents.reduce((acc, agent) => {
    return acc * (1 - 0.05 * getOutputMultiplier(getEffectiveQualityScore(agent)))
  }, 1)
  return baseBurn * reductionFactor
}

// ---- Drift roll ----

export function rollDrift(agent: Agent): boolean {
  if (!hasActivePrompt(agent)) return false
  if (agent.qualityScore >= 40) return false
  return Math.random() < DRIFT_CHANCE
}

// ---- Milestone check ----

export function checkMilestone(state: GameState): boolean {
  const config = ROUNDS[state.round]
  const arrMet = state.arr >= config.arr
  const usersMet = config.users != null ? state.users >= config.users : true
  const featuresMet = config.features != null ? state.features >= config.features : true
  return arrMet && usersMet && featuresMet
}

export function nextRound(current: FundingRound): FundingRound | null {
  const idx = ROUND_ORDER.indexOf(current)
  return idx < ROUND_ORDER.length - 1 ? ROUND_ORDER[idx + 1] : null
}

// ---- Valuation ----

export function computeValuation(state: Pick<GameState, 'arr'>): number {
  return Math.floor(state.arr * VALUATION_MULTIPLE)
}

export function awardVcChips(valuation: number): number {
  return Math.floor(valuation / 10_000_000)
}

function evaluateTipTrigger(
  state: GameState,
  firedTipIds: Set<string>,
): TipCard | null {
  for (const tip of TIP_CARDS) {
    if (firedTipIds.has(tip.id)) continue

    const shouldFire = (() => {
      switch (tip.trigger) {
        case 'first_agent_hired':
          return state.agents.length === 1
        case 'first_tick':
          return state.tickCount === 1
        case 'first_low_score':
          return state.agents.some((agent) => agent.qualityScore < 40)
        case 'first_drift':
          return state.agents.some((agent) => agent.isOffTask)
        case 'entered_burn_mode':
          return state.phase === 'burn_mode'
        case 'round_advance_seed':
          return state.round === 'seed'
        case 'round_advance_series_a':
          return state.round === 'series_a'
        case 'round_advance_series_b':
          return state.round === 'series_b'
        case 'runway_below_25k':
          return state.runway < 25_000
        case 'first_agent_fired':
          return false
        case 'first_cfo_consult':
          return false
        case 'ipo_triggered':
          return state.phase === 'ipo'
        default:
          return false
      }
    })()

    if (shouldFire) return tip
  }

  return null
}

// ---- Full tick resolution ----

export function resolveTick(
  state: GameState,
  firedTipIds: Set<string>,
): TickPayload & { firedTipId: string | null } {
  const tickCount = state.tickCount + 1

  // Reset previous off-task state, then roll drift before computing any output.
  const resetAgents = state.agents.map((agent) => ({ ...agent, isOffTask: false }))

  const agentUpdates = resetAgents.map((agent) => ({
    id: agent.id,
    isOffTask: rollDrift(agent),
  }))

  const agentsThisTick = resetAgents.map((agent) => {
    const update = agentUpdates.find((u) => u.id === agent.id)
    return update ? { ...agent, isOffTask: update.isOffTask } : agent
  })

  let arrDelta = 0
  let usersDelta = 0
  let featuresDelta = 0

  for (const agent of agentsThisTick) {
    if (!hasActivePrompt(agent)) continue
    if (agent.isOffTask) continue

    const base = BASE_OUTPUT[agent.role]
    const multiplier = getOutputMultiplier(getEffectiveQualityScore(agent))

    const agentArr = (base.arr ?? 0) * multiplier
    const agentUsers = (base.users ?? 0) * multiplier
    const agentFeatures = (base.features ?? 0) * multiplier

    if (agent.role !== 'finance') {
      arrDelta += agentArr
    }

    usersDelta += agentUsers
    featuresDelta += agentFeatures
  }

  const stateAfterOutputs: GameState = {
    ...state,
    agents: agentsThisTick,
    tickCount,
  }

  const baseBurn = calcBurnPerTick(stateAfterOutputs)
  const effectiveBurn = applyFinanceAgents(stateAfterOutputs, baseBurn)
  const runwayDelta = -effectiveBurn

  const nextStateBase: GameState = {
    ...stateAfterOutputs,
    arr: state.arr + arrDelta,
    users: state.users + usersDelta,
    features: state.features + featuresDelta,
    runway: state.runway + runwayDelta,
    burnRate: effectiveBurn,
  }

  let phase = state.phase
  let newRound: FundingRound | null = null
  let newAgentSlots: number | null = null

  const valuation = computeValuation(nextStateBase)
  let vcChipsEarned = 0

  if (valuation >= 100_000_000) {
    phase = 'ipo'
    vcChipsEarned = awardVcChips(valuation)
  } else if (checkMilestone(nextStateBase)) {
    const next = nextRound(state.round)
    if (next && next !== 'ipo') {
      newRound = next
      newAgentSlots = ROUNDS[next].agentSlotsUnlocked
      phase = 'playing'
    }
  }

  const stateAfterMilestone: GameState = {
    ...nextStateBase,
    phase,
    round: newRound ?? state.round,
    agentSlots: newAgentSlots ?? state.agentSlots,
  }

  const tipCard = evaluateTipTrigger(stateAfterMilestone, firedTipIds)
  const firedTipId = tipCard?.id ?? null

  if (stateAfterMilestone.runway <= 0) {
    phase = 'game_over'
    vcChipsEarned = 0
  }

  return {
    tickCount,
    arrDelta,
    usersDelta,
    featuresDelta,
    runwayDelta,
    burnRate: effectiveBurn,
    agentUpdates,
    tipCard,
    phase,
    newRound,
    newAgentSlots,
    valuation,
    vcChipsEarned,
    firedTipId,
  }
}
