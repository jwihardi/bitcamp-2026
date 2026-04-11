import type { Action, GameState } from './types'
import {
  AGENT_SALARY,
  BASE_RUNWAY,
  BUDGET_PER_TIER,
  DEFAULT_MODEL_ID,
  INITIAL_STATE,
  MODELS,
  TICK_INTERVALS,
  UPGRADE_COSTS,
} from './constants'
import { shouldInvalidateCachedGrade } from './promptGrader'

function computeImmediateBurnRate(state: GameState): number {
  return state.agents.reduce((sum, agent) => {
    if (agent.prompt.trim().length === 0) return sum
    const model = MODELS[agent.modelId] ?? MODELS[DEFAULT_MODEL_ID]
    const tokens = agent.evalResult?.estimatedTokensPerTick ?? agent.tokenCount
    return sum + AGENT_SALARY[agent.role] + tokens * model.costPerToken
  }, 0)
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TICK': {
      const p = action.payload

      const updatedAgents = state.agents.map((agent) => {
        const update = p.agentUpdates.find((u) => u.id === agent.id)
        return update ? { ...agent, isOffTask: update.isOffTask } : agent
      })

      return {
        ...state,
        tickCount: p.tickCount,
        arr: Math.max(0, state.arr + p.arrDelta),
        users: Math.max(0, state.users + p.usersDelta),
        features: Math.max(0, state.features + p.featuresDelta),
        runway: Math.max(0, state.runway + p.runwayDelta),
        burnRate: p.burnRate,
        valuation: p.valuation,
        agents: updatedAgents,
        phase: p.phase,
        round: p.newRound ?? state.round,
        agentSlots: p.newAgentSlots ?? state.agentSlots,
        vcChips: state.vcChips + p.vcChipsEarned,
      }
    }

    case 'HIRE_AGENT': {
      if (state.agents.length >= state.agentSlots) return state

      const agents = [...state.agents, action.agent]

      return {
        ...state,
        agents,
        burnRate: computeImmediateBurnRate({ ...state, agents }),
      }
    }

    case 'FIRE_AGENT': {
      const agents = state.agents.filter((a) => a.id !== action.agentId)
      const nextPhase = state.phase === 'burn_mode' ? 'playing' : state.phase

      return {
        ...state,
        agents,
        burnRate: computeImmediateBurnRate({ ...state, agents }),
        phase: nextPhase,
        tickInterval:
          state.phase === 'burn_mode'
            ? TICK_INTERVALS[state.upgrades.fasterTicks]
            : state.tickInterval,
      }
    }

    case 'UPDATE_PROMPT': {
      return {
        ...state,
        agents: state.agents.map((a) => {
          if (a.id !== action.agentId) return a
          const evalStillValid =
            a.evalResult != null &&
            a.evalPromptSnapshot != null &&
            !shouldInvalidateCachedGrade(action.prompt, a.evalPromptSnapshot)
          const qualityScore = evalStillValid
            ? a.qualityScore
            : action.qualityScore
          return {
            ...a,
            prompt: action.prompt,
            tokenCount: action.tokenCount,
            qualityScore,
            driftRisk: action.prompt.trim().length > 0 && qualityScore < 40,
            evalResult: evalStillValid ? a.evalResult : null,
            evalPromptSnapshot: evalStillValid ? a.evalPromptSnapshot : null,
          }
        }),
      }
    }

    case 'UPDATE_AGENT_NAME': {
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, name: action.name } : a,
        ),
      }
    }

    case 'UPDATE_AGENT_ICON': {
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.agentId ? { ...a, icon: action.icon } : a,
        ),
      }
    }

    case 'UPDATE_AGENT_MODEL': {
      if (!MODELS[action.modelId]) return state
      if (!state.upgrades.unlockedModelIds.includes(action.modelId)) return state
      const agents = state.agents.map((a) =>
        a.id === action.agentId ? { ...a, modelId: action.modelId } : a,
      )
      return {
        ...state,
        agents,
        burnRate: computeImmediateBurnRate({ ...state, agents }),
      }
    }

    case 'EVALUATE_AGENT': {
      const cost = Math.max(0, action.cost)
      const nextRunway = Math.max(0, state.runway - cost)
      const agents = state.agents.map((a) =>
        a.id === action.agentId
          ? {
              ...a,
              qualityScore: action.evaluation.score,
              driftRisk: action.evaluation.score < 40,
              evalResult: action.evaluation,
              evalPromptSnapshot: action.promptSnapshot,
            }
          : a,
      )
      return {
        ...state,
        runway: nextRunway,
        agents,
        burnRate: computeImmediateBurnRate({ ...state, agents }),
        phase: nextRunway <= 0 ? 'game_over' : state.phase,
      }
    }

    case 'CONSULT_CFO': {
      const cost = Math.max(0, action.cost)
      const nextRunway = Math.max(0, state.runway - cost)
      return {
        ...state,
        runway: nextRunway,
        phase: nextRunway <= 0 ? 'game_over' : state.phase,
      }
    }

    case 'OPEN_PRESTIGE_SHOP': {
      if (state.phase === 'ipo' || state.phase === 'game_over') return state
      return { ...state, phase: 'prestige_shop' }
    }

    case 'CLOSE_PRESTIGE_SHOP': {
      if (state.phase !== 'prestige_shop') return state
      return { ...state, phase: 'playing', tickInterval: TICK_INTERVALS[state.upgrades.fasterTicks] }
    }

    case 'ENTER_BURN_MODE': {
      if (state.phase === 'burn_mode') return state
      const halved = Math.max(1000, Math.floor(state.tickInterval / 2))
      return { ...state, phase: 'burn_mode', tickInterval: halved }
    }

    case 'EXIT_BURN_MODE': {
      if (state.phase !== 'burn_mode') return state
      const restored = TICK_INTERVALS[state.upgrades.fasterTicks]
      return { ...state, phase: 'playing', tickInterval: restored }
    }

    case 'GAME_OVER': {
      return { ...state, phase: 'game_over' }
    }

    case 'NEW_RUN': {
      const { vcChips, upgrades } = state
      return {
        ...INITIAL_STATE,
        runway: BASE_RUNWAY + upgrades.biggerBudget * BUDGET_PER_TIER,
        tickInterval: TICK_INTERVALS[upgrades.fasterTicks],
        vcChips,
        upgrades,
      }
    }

    case 'BUY_UPGRADE': {
      const { upgrade } = action
      const { upgrades, vcChips } = state

      if (upgrade === 'model') {
        const model = MODELS[action.modelId]
        if (!model) return state
        if (upgrades.unlockedModelIds.includes(action.modelId)) return state
        if (vcChips < model.prestigeCost) return state
        return {
          ...state,
          vcChips: vcChips - model.prestigeCost,
          upgrades: {
            ...upgrades,
            unlockedModelIds: [...upgrades.unlockedModelIds, action.modelId],
          },
        }
      }

      if (upgrade === 'promptTemplates') {
        if (upgrades.promptTemplates) return state
        const cost = UPGRADE_COSTS.promptTemplates
        if (vcChips < cost) return state
        return {
          ...state,
          vcChips: vcChips - cost,
          upgrades: { ...upgrades, promptTemplates: true },
        }
      }

      if (upgrade === 'fasterTicks') {
        const tier = upgrades.fasterTicks
        if (tier === 3) return state
        const cost = UPGRADE_COSTS.fasterTicks[tier]
        if (vcChips < cost) return state
        const nextTier = (tier + 1) as 0 | 1 | 2 | 3
        return {
          ...state,
          vcChips: vcChips - cost,
          upgrades: { ...upgrades, fasterTicks: nextTier },
          tickInterval: TICK_INTERVALS[nextTier],
        }
      }

      if (upgrade === 'biggerBudget') {
        const tier = upgrades.biggerBudget
        if (tier === 3) return state
        const cost = UPGRADE_COSTS.biggerBudget[tier]
        if (vcChips < cost) return state
        const nextTier = (tier + 1) as 0 | 1 | 2 | 3
        return {
          ...state,
          vcChips: vcChips - cost,
          upgrades: { ...upgrades, biggerBudget: nextTier },
        }
      }

      return state
    }

    default:
      return state
  }
}
