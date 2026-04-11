import type { Agent, AgentRole, ChaosEvent, ChaosEventType, GameState, Penalty, TipCard } from './types'
import {
  AGENT_SALARY,
  BASE_OUTPUT,
  CHAOS_CHANCE_PER_TICK,
  CHAOS_EVENT_CONFIGS,
  CHAOS_GRACE_TICKS,
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

// ---- Chaos event selection ----

function buildChaosEvent(type: ChaosEventType, state: GameState): ChaosEvent | null {
  const config = CHAOS_EVENT_CONFIGS[type]
  const agentForRole = state.agents.find(a => a.role === config.agentRole)
  if (!agentForRole) return null

  return {
    id: crypto.randomUUID(),
    type,
    agentRole: config.agentRole,
    title: config.title,
    description: config.description,
    penaltyDescription: config.penaltyDescription,
    fixThreshold: config.fixThreshold,
  }
}

export function pickChaosEvent(state: GameState): ChaosEvent | null {
  const candidates: ChaosEventType[] = []

  if (state.agents.find(a => a.role === 'marketing' && a.qualityScore < 60)) {
    candidates.push('hallucination', 'hallucination', 'hallucination')
  } else if (state.agents.find(a => a.role === 'marketing')) {
    candidates.push('hallucination')
  }

  if (state.agents.find(a => a.role === 'engineering' && a.qualityScore < 55)) {
    candidates.push('prod_bug', 'prod_bug', 'prod_bug')
  } else if (state.agents.find(a => a.role === 'engineering')) {
    candidates.push('prod_bug')
  }

  if (['series_a', 'series_b', 'ipo'].includes(state.round)) {
    candidates.push('competitor')
  }

  if (state.agents.find(a => a.role === 'finance' && a.qualityScore < 50)) {
    candidates.push('due_diligence', 'due_diligence', 'due_diligence')
  } else if (state.agents.find(a => a.role === 'finance')) {
    candidates.push('due_diligence')
  }

  if (candidates.length === 0) return null

  // Shuffle + try up to 5 times to find a buildable event
  for (let attempt = 0; attempt < 5; attempt++) {
    const type = candidates[Math.floor(Math.random() * candidates.length)]
    const event = buildChaosEvent(type, state)
    if (event) return event
  }
  return null
}

export function shouldFireChaosEvent(state: GameState): boolean {
  if (state.activeChaosEvent !== null) return false
  if (state.tickCount <= CHAOS_GRACE_TICKS) return false
  return Math.random() < CHAOS_CHANCE_PER_TICK
}

// ---- Penalty resolution ----

export function resolvePenalties(state: GameState): Penalty[] {
  return state.pendingPenalties.map(penalty => {
    const responsibleAgent = state.agents.find(a => a.role === penalty.agentRole)
    if (!responsibleAgent) return { ...penalty, active: false }

    const config = CHAOS_EVENT_CONFIGS[penalty.type]
    const fixed = responsibleAgent.qualityScore >= config.fixThreshold
    return { ...penalty, active: !fixed }
  })
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
  const hasDueDiligencePenalty = state.pendingPenalties.some(
    p => p.type === 'due_diligence' && p.active,
  )
  const multiple = hasDueDiligencePenalty ? 7 : VALUATION_MULTIPLE
  return Math.floor(state.arr * multiple)
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
        case 'first_chaos_event':      return state.activeChaosEvent !== null
        case 'entered_burn_mode':      return state.phase === 'burn_mode'
        case 'round_advance_seed':     return state.round === 'seed'
        case 'round_advance_series_a': return state.round === 'series_a'
        case 'round_advance_series_b': return state.round === 'series_b'
        case 'first_penalty_cleared':  return state.pendingPenalties.some(p => !p.active)
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

  // Resolve agent outputs
  let arrDelta = 0
  let usersDelta = 0
  let featuresDelta = 0
  const agentUpdates: { id: string; isOffTask: boolean }[] = []

  // First determine drift
  const agentsWithDrift = agentsResetOffTask.map(agent => {
    const offTask = rollDrift(agent)
    agentUpdates.push({ id: agent.id, isOffTask: offTask })
    return { ...agent, isOffTask: offTask }
  })

  // Apply active penalties (snapshot before resolving below)
  const hasProdBugPenalty = state.pendingPenalties.some(p => p.type === 'prod_bug' && p.active)
  const hasHallucinationPenalty = state.pendingPenalties.some(p => p.type === 'hallucination' && p.active)
  const hasCompetitorPenalty = state.pendingPenalties.some(p => p.type === 'competitor' && p.active)

  // Compute raw outputs
  for (const agent of agentsWithDrift) {
    if (agent.isOffTask || agent.role === 'finance') continue

    const mult = getOutputMultiplier(agent.qualityScore)
    const base = BASE_OUTPUT[agent.role]

    let agentArr = (base.arr ?? 0) * mult
    let agentUsers = (base.users ?? 0) * mult
    const agentFeatures = (base.features ?? 0) * mult

    // Apply penalties per role
    if (agent.role === 'engineering' && hasProdBugPenalty) {
      agentArr *= 0.75
    }
    if (agent.role === 'marketing' && hasHallucinationPenalty) {
      agentUsers *= 0.8
    }
    if (agent.role === 'sales' && hasCompetitorPenalty) {
      agentArr *= 0.7
    }

    arrDelta += agentArr
    usersDelta += agentUsers
    featuresDelta += agentFeatures
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

  // Resolve existing penalties
  const updatedPenalties = resolvePenalties({ ...stateWithNewAgents, arr: state.arr + arrDelta })

  // Chaos event
  let newChaosEvent: ChaosEvent | null = null
  let newPenalty: Penalty | null = null

  if (shouldFireChaosEvent({ ...stateWithNewAgents, tickCount: nextTickCount })) {
    const event = pickChaosEvent(stateWithNewAgents)
    if (event) {
      newChaosEvent = event

      // Immediate hit effects
      if (event.type === 'hallucination') {
        usersDelta -= state.users * 0.15
      } else if (event.type === 'prod_bug') {
        arrDelta -= state.arr * 0.10
      }

      newPenalty = {
        id: crypto.randomUUID(),
        type: event.type,
        agentRole: event.agentRole,
        description: event.penaltyDescription,
        active: true,
        appliedAt: nextTickCount,
      }
    }
  }

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
    activeChaosEvent: newChaosEvent ?? state.activeChaosEvent,
    pendingPenalties: [
      ...updatedPenalties,
      ...(newPenalty ? [newPenalty] : []),
    ],
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
    newChaosEvent,
    newPenalty,
    updatedPenalties,
    tipCard,
    firedTipId,
    phase,
    newRound,
    newAgentSlots,
    valuation,
  }
}
