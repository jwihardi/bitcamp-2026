import type { Action, GameState } from './types'
import {
  BASE_RUNWAY,
  BUDGET_PER_TIER,
  INITIAL_STATE,
  TICK_INTERVALS,
  UPGRADE_COSTS,
} from './constants'

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TICK': {
      const p = action.payload

      const mergedPenalties = [
        ...p.updatedPenalties,
        ...(p.newPenalty ? [p.newPenalty] : []),
      ]

      const updatedAgents = state.agents.map((agent) => {
        const update = p.agentUpdates.find((u) => u.id === agent.id)
        return update ? { ...agent, isOffTask: update.isOffTask } : agent
      })

      return {
        ...state,
        tickCount: state.tickCount + 1,
        arr: Math.max(0, state.arr + p.arrDelta),
        users: Math.max(0, state.users + p.usersDelta),
        features: Math.max(0, state.features + p.featuresDelta),
        runway: Math.max(0, state.runway + p.runwayDelta),
        burnRate: p.burnRate,
        valuation: p.valuation,
        agents: updatedAgents,
        pendingPenalties: mergedPenalties,
        activeChaosEvent: p.newChaosEvent ?? state.activeChaosEvent,
        activeTipCard: state.activeTipCard ?? p.tipCard,
        phase: p.phase,
        round: p.newRound ?? state.round,
        agentSlots: p.newAgentSlots ?? state.agentSlots,
      }
    }

    case 'HIRE_AGENT': {
      return { ...state, agents: [...state.agents, action.agent] }
    }

    case 'FIRE_AGENT': {
      return {
        ...state,
        agents: state.agents.filter((a) => a.id !== action.agentId),
      }
    }

    case 'UPDATE_PROMPT': {
      return {
        ...state,
        agents: state.agents.map((a) => {
          if (a.id !== action.agentId) return a
          const divergence = Math.abs(action.prompt.length - a.cachedPromptText.length)
          const stillCached = a.qualityCached && divergence <= 10
          return {
            ...a,
            prompt: action.prompt,
            tokenCount: action.tokenCount,
            qualityScore: action.qualityScore,
            driftRisk: action.qualityScore < 40,
            qualityCached: stillCached,
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

    case 'GRADE_AGENT_AI': {
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.agentId
            ? {
                ...a,
                qualityScore: action.score,
                qualityCached: true,
                cachedPromptText: action.cachedPromptText,
                driftRisk: action.score < 40,
              }
            : a,
        ),
      }
    }

    case 'DISMISS_CHAOS_EVENT': {
      return { ...state, activeChaosEvent: null }
    }

    case 'DISMISS_TIP_CARD': {
      return { ...state, activeTipCard: null }
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

    case 'IPO_TRIGGERED': {
      return {
        ...state,
        phase: 'ipo',
        valuation: action.valuation,
        vcChips: state.vcChips + action.chipsEarned,
      }
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
