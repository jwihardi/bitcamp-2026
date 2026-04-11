import type { Agent, AgentRole, FundingRound, GameState, TipCard } from './types'
import {
  AGENT_SALARY,
  BASE_OUTPUT,
  DRIFT_CHANCE,
  ROUND_ORDER,
  ROUNDS,
  TIP_CARDS,
  VALUATION_MULTIPLE,
} from './constants'
import type { TickPayload } from './types'

// ---- Output multiplier ----

export function getOutputMultiplier(qualityScore: number): number {
  return 0.2 + (qualityScore / 100) * 1.8
}

// ---- Finance burn reduction ----

export function applyFinanceAgents(state: GameState): number {
  const financeAgents = state.agents.filter(a => a.role === 'finance' && !a.isOffTask)
  const reductionFactor = financeAgents.reduce((acc, agent) => {
    return acc * (1 - 0.05 * getOutputMultiplier(agent.qualityScore))
  }, 1)
  return state.burnRate * reductionFactor
}

// ---- Burn per tick ----

export function calcBurnPerTick(state: GameState): number {
  const salaryCost = state.agents.reduce((sum, a) => sum + AGENT_SALARY[a.role], 0)
  return salaryCost * (state.tickInterval / 1000 / 3600)
}

// ---- Drift roll ----

export function rollDrift(agent: Agent): boolean {
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

export function computeValuation(state: GameState): number {
  return Math.floor(state.arr * VALUATION_MULTIPLE)
}

export function awardVcChips(valuation: number): number {
  return Math.floor(valuation / 10_000_000)
}

// ---- Tip card evaluation ----

export function evaluateTipTrigger(
  state: GameState,
  firedTipIds: Set<string>,
): TipCard | null {
  for (const tip of TIP_CARDS) {
    if (firedTipIds.has(tip.id)) continue

    const shouldFire = (() => {
      switch (tip.trigger) {
        case 'first_agent_hired':      return state.agents.length === 1
        case 'first_tick':             return state.tickCount === 1
        case 'first_low_score':        return state.agents.some(a => a.qualityScore < 40)
        case 'first_drift':            return state.agents.some(a => a.isOffTask)
        case 'entered_burn_mode':      return state.phase === 'burn_mode'
        case 'round_advance_seed':     return state.round === 'seed'
        case 'round_advance_series_a': return state.round === 'series_a'
        case 'round_advance_series_b': return state.round === 'series_b'
        case 'runway_below_25k':       return state.runway < 25_000
        case 'first_agent_fired':      return false   // set externally via FIRE_AGENT action
        case 'ipo_triggered':          return state.phase === 'ipo'
        default:                       return false
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
): Omit<TickPayload, 'tipCard'> & { tipCard: TipCard | null; firedTipId: string | null } {
  const nextTickCount = state.tickCount + 1

  // Reset isOffTask from previous tick
  const agentsResetOffTask = state.agents.map(a => ({ ...a, isOffTask: false }))

  // Determine drift
  let arrDelta = 0
  let usersDelta = 0
  let featuresDelta = 0
  const agentUpdates: { id: string; isOffTask: boolean }[] = []

  const agentsWithDrift = agentsResetOffTask.map(agent => {
    const offTask = rollDrift(agent)
    agentUpdates.push({ id: agent.id, isOffTask: offTask })
    return { ...agent, isOffTask: offTask }
  })

  // Compute outputs
  for (const agent of agentsWithDrift) {
    if (agent.isOffTask || agent.role === 'finance') continue

    const mult = getOutputMultiplier(agent.qualityScore)
    const base = BASE_OUTPUT[agent.role]

    arrDelta += (base.arr ?? 0) * mult
    usersDelta += (base.users ?? 0) * mult
    featuresDelta += (base.features ?? 0) * mult
  }

  // Finance agents reduce effective burn
  const stateWithNewAgents: GameState = {
    ...state,
    agents: agentsWithDrift,
    tickCount: nextTickCount,
  }
  const baseBurn = calcBurnPerTick(stateWithNewAgents)
  const effectiveBurn = applyFinanceAgents({ ...stateWithNewAgents, burnRate: baseBurn })
  const runwayDelta = -effectiveBurn

  // Phase and round advancement
  const newArr = state.arr + arrDelta
  const newRunway = state.runway + runwayDelta
  const newUsers = state.users + usersDelta
  const newFeatures = state.features + featuresDelta

  let phase = state.phase as GameState['phase']
  let newRound: GameState['round'] | null = null
  let newAgentSlots: number | null = null

  const stateForMilestone: GameState = {
    ...stateWithNewAgents,
    arr: newArr,
    users: newUsers,
    features: newFeatures,
    runway: newRunway,
  }

  if (newRunway <= 0) {
    phase = 'game_over'
  } else if (phase !== 'game_over' && phase !== 'ipo') {
    const milestoneHit = checkMilestone(stateForMilestone)
    if (milestoneHit && state.round !== 'ipo') {
      const next = nextRound(state.round)
      if (next === 'ipo') {
        const valuation = computeValuation(stateForMilestone)
        if (valuation >= 100_000_000) {
          phase = 'ipo'
        }
      } else if (next) {
        newRound = next
        newAgentSlots = ROUNDS[next].agentSlotsUnlocked
        phase = 'playing'
      }
    }
  }

  const valuation = computeValuation(stateForMilestone)

  // Tip card
  const stateForTip: GameState = {
    ...stateForMilestone,
    phase,
    round: newRound ?? state.round,
    agents: agentsWithDrift,
  }
  const tipCard = evaluateTipTrigger(stateForTip, firedTipIds)
  const firedTipId = tipCard?.id ?? null

  return {
    arrDelta,
    usersDelta,
    featuresDelta,
    runwayDelta,
    burnRate: baseBurn,
    agentUpdates,
    tipCard,
    firedTipId,
    phase,
    newRound,
    newAgentSlots,
    valuation,
  }
}
