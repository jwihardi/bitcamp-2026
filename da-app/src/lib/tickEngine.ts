import type {
  Agent,
  ChaosEvent,
  ChaosEventType,
  FundingRound,
  GameState,
  Penalty,
  TipCard,
  TickPayload,
} from './types'
import {
  AGENT_SALARY,
  BASE_OUTPUT,
  CHAOS_CHANCE_PER_TICK,
  CHAOS_EVENT_CONFIGS,
  DRIFT_CHANCE,
  ROUND_ORDER,
  ROUNDS,
  TIP_CARDS,
  VALUATION_MULTIPLE,
} from './constants'

// ---- Output multiplier ----

export function getOutputMultiplier(qualityScore: number): number {
  return 0.2 + (qualityScore / 100) * 1.8
}

// ---- Burn per tick ----

export function calcBurnPerTick(state: GameState): number {
  const salaryCost = state.agents.reduce((sum, a) => sum + AGENT_SALARY[a.role], 0)
  return salaryCost * (state.tickInterval / 1000 / 3600)
}

// ---- Finance burn reduction ----

export function applyFinanceAgents(state: GameState, baseBurn: number): number {
  const financeAgents = state.agents.filter((a) => a.role === 'finance' && !a.isOffTask)
  const reductionFactor = financeAgents.reduce((acc, agent) => {
    return acc * (1 - 0.05 * getOutputMultiplier(agent.qualityScore))
  }, 1)
  return baseBurn * reductionFactor
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

export function computeValuation(state: Pick<GameState, 'arr' | 'pendingPenalties'>): number {
  const hasDueDiligencePenalty = state.pendingPenalties.some(
    (penalty) => penalty.type === 'due_diligence' && penalty.active,
  )
  const multiple = hasDueDiligencePenalty ? 7 : VALUATION_MULTIPLE
  return Math.floor(state.arr * multiple)
}

export function awardVcChips(valuation: number): number {
  return Math.floor(valuation / 10_000_000)
}

// ---- Chaos and penalties ----

function buildChaosEvent(type: ChaosEventType): ChaosEvent {
  const config = CHAOS_EVENT_CONFIGS[type]
  return {
    type,
    agentRole: config.agentRole,
    title: config.title,
    description: config.description,
    penaltyDescription: config.penaltyDescription,
    fixThreshold: config.fixThreshold,
  }
}

function buildPenalty(event: ChaosEvent, tickCount: number): Penalty {
  return {
    id: `${event.type}-${tickCount}`,
    type: event.type,
    agentRole: event.agentRole,
    description: event.penaltyDescription,
    active: true,
    appliedAt: tickCount,
  }
}

function refreshPenalties(state: GameState): { pendingPenalties: Penalty[]; clearedPenalty: boolean } {
  let clearedPenalty = false

  const pendingPenalties = state.pendingPenalties.map((penalty) => {
    if (!penalty.active) return penalty

    const agent = state.agents.find((candidate) => candidate.role === penalty.agentRole)
    const threshold = CHAOS_EVENT_CONFIGS[penalty.type].fixThreshold
    const fixed = agent != null && agent.qualityScore >= threshold

    if (!fixed) return penalty

    clearedPenalty = true
    return { ...penalty, active: false }
  })

  return { pendingPenalties, clearedPenalty }
}

function shouldFireChaosEvent(state: GameState): boolean {
  if (state.activeChaosEvent !== null) return false
  if (state.tickCount <= 10) return false
  return Math.random() < CHAOS_CHANCE_PER_TICK
}

function rollChaosEvent(
  state: GameState,
  tickCount: number,
  refreshedPenalties: Penalty[],
): {
  activeChaosEvent: ChaosEvent | null
  pendingPenalties: Penalty[]
} {
  if (!shouldFireChaosEvent(state)) {
    return {
      activeChaosEvent: state.activeChaosEvent,
      pendingPenalties: refreshedPenalties,
    }
  }

  const chaosTypes = Object.keys(CHAOS_EVENT_CONFIGS) as ChaosEventType[]
  const type = chaosTypes[Math.floor(Math.random() * chaosTypes.length)]
  const activeChaosEvent = buildChaosEvent(type)

  return {
    activeChaosEvent,
    pendingPenalties: [...refreshedPenalties, buildPenalty(activeChaosEvent, tickCount)],
  }
}

function applyPenaltyDeltas(
  state: GameState,
  deltas: { arrDelta: number; usersDelta: number; featuresDelta: number },
): { arrDelta: number; usersDelta: number; featuresDelta: number } {
  let arrDelta = deltas.arrDelta
  let usersDelta = deltas.usersDelta
  const featuresDelta = deltas.featuresDelta

  for (const penalty of state.pendingPenalties) {
    if (!penalty.active) continue

    if (penalty.type === 'hallucination') {
      usersDelta *= 0.8
      continue
    }

    if (penalty.type === 'prod_bug') {
      arrDelta *= 0.75
    }
  }

  return { arrDelta, usersDelta, featuresDelta }
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
        case 'first_chaos_event':
          return state.activeChaosEvent !== null
        case 'entered_burn_mode':
          return state.phase === 'burn_mode'
        case 'round_advance_seed':
          return state.round === 'seed'
        case 'round_advance_series_a':
          return state.round === 'series_a'
        case 'round_advance_series_b':
          return state.round === 'series_b'
        case 'first_penalty_cleared':
          return state.pendingPenalties.some((penalty) => !penalty.active)
        case 'runway_below_25k':
          return state.runway < 25_000
        case 'first_agent_fired':
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

  const hasSalesPenalty = state.pendingPenalties.some(
    (penalty) => penalty.active && penalty.type === 'competitor',
  )

  for (const agent of agentsThisTick) {
    if (agent.isOffTask) continue

    const base = BASE_OUTPUT[agent.role]
    const multiplier = getOutputMultiplier(agent.qualityScore)

    let agentArr = (base.arr ?? 0) * multiplier
    const agentUsers = (base.users ?? 0) * multiplier
    const agentFeatures = (base.features ?? 0) * multiplier

    if (hasSalesPenalty && agent.role === 'sales') {
      agentArr *= 0.7
    }

    if (agent.role !== 'finance') {
      arrDelta += agentArr
    }

    usersDelta += agentUsers
    featuresDelta += agentFeatures
  }

  const penaltyAdjusted = applyPenaltyDeltas(state, { arrDelta, usersDelta, featuresDelta })
  arrDelta = penaltyAdjusted.arrDelta
  usersDelta = penaltyAdjusted.usersDelta
  featuresDelta = penaltyAdjusted.featuresDelta

  const stateAfterOutputs: GameState = {
    ...state,
    agents: agentsThisTick,
    tickCount,
  }

  const baseBurn = calcBurnPerTick(stateAfterOutputs)
  const effectiveBurn = applyFinanceAgents(stateAfterOutputs, baseBurn)
  const runwayDelta = -effectiveBurn

  const pendingPenaltiesBeforeChaos = refreshPenalties(stateAfterOutputs).pendingPenalties

  const nextStateBase: GameState = {
    ...stateAfterOutputs,
    arr: state.arr + arrDelta,
    users: state.users + usersDelta,
    features: state.features + featuresDelta,
    runway: state.runway + runwayDelta,
    burnRate: effectiveBurn,
    pendingPenalties: pendingPenaltiesBeforeChaos,
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

  const chaosResolution = rollChaosEvent(stateAfterMilestone, tickCount, pendingPenaltiesBeforeChaos)

  const stateForTip: GameState = {
    ...stateAfterMilestone,
    activeChaosEvent: chaosResolution.activeChaosEvent,
    pendingPenalties: chaosResolution.pendingPenalties,
  }

  const tipCard = evaluateTipTrigger(stateForTip, firedTipIds)
  const firedTipId = tipCard?.id ?? null

  if (stateForTip.runway <= 0) {
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
    activeChaosEvent: chaosResolution.activeChaosEvent,
    pendingPenalties: chaosResolution.pendingPenalties,
    tipCard,
    phase,
    newRound,
    newAgentSlots,
    valuation,
    vcChipsEarned,
    firedTipId,
  }
}
