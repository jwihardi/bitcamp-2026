import type { Action, GameState } from './types'
import {
  BASE_RUNWAY,
  BUDGET_PER_TIER,
  INITIAL_STATE,
  TICK_INTERVALS,
  UPGRADE_COSTS,
} from './constants'
import { computeValuation, awardVcChips } from './tickEngine'

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'TICK': {
      const p = action.payload

      const updatedAgents = state.agents.map(agent => {
        const update = p.agentUpdates.find(u => u.id === agent.id)
        if (!update) return agent
        return { ...agent, isOffTask: update.isOffTask }
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
        activeTipCard: state.activeTipCard ?? p.tipCard,
        phase: p.phase,
        round: p.newRound ?? state.round,
        agentSlots: p.newAgentSlots ?? state.agentSlots,
      }
    }

    case 'HIRE_AGENT': {
      return {
        ...state,
        agents: [...state.agents, action.agent],
      }
    }

    case 'FIRE_AGENT': {
      return {
        ...state,
        agents: state.agents.filter(a => a.id !== action.agentId),
      }
    }

    case 'UPDATE_PROMPT': {
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id !== action.agentId
            ? a
            : {
                ...a,
                prompt: action.prompt,
                tokenCount: action.tokenCount,
                qualityScore: action.qualityScore,
                driftRisk: action.qualityScore < 40,
                // Invalidate API cache if prompt diverged by more than 10 chars
                qualityCached:
                  Math.abs(action.prompt.length - a.cachedPromptText.length) <= 10 &&
                  a.qualityCached,
              },
        ),
      }
    }

    case 'UPDATE_AGENT_NAME': {
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.agentId ? { ...a, name: action.name } : a,
        ),
      }
    }

    case 'UPDATE_AGENT_ICON': {
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id === action.agentId ? { ...a, icon: action.icon } : a,
        ),
      }
    }

    case 'GRADE_AGENT_AI': {
      return {
        ...state,
        agents: state.agents.map(a =>
          a.id !== action.agentId
            ? a
            : {
                ...a,
                qualityScore: action.score,
                qualityCached: true,
                cachedPromptText: action.cachedPromptText,
                driftRisk: action.score < 40,
              },
        ),
      }
    }

    case 'DISMISS_TIP_CARD': {
      return { ...state, activeTipCard: null }
    }

    case 'ENTER_BURN_MODE': {
      if (state.phase === 'burn_mode') return state
      const halfInterval = Math.max(1000, Math.floor(state.tickInterval / 2))
      return { ...state, phase: 'burn_mode', tickInterval: halfInterval }
    }

    case 'EXIT_BURN_MODE': {
      if (state.phase !== 'burn_mode') return state
      const baseInterval = TICK_INTERVALS[state.upgrades.fasterTicks]
      return { ...state, phase: 'playing', tickInterval: baseInterval }
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
      const { upgrades, vcChips } = state
      const startingRunway = BASE_RUNWAY + upgrades.biggerBudget * BUDGET_PER_TIER
      const tickInterval = TICK_INTERVALS[upgrades.fasterTicks]
      return {
        ...INITIAL_STATE,
        runway: startingRunway,
        tickInterval,
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
        const currentTier = upgrades.fasterTicks
        if (currentTier >= 3) return state
        const cost = UPGRADE_COSTS.fasterTicks[currentTier as 0 | 1 | 2]
        if (vcChips < cost) return state
        const newTier = (currentTier + 1) as 0 | 1 | 2 | 3
        return {
          ...state,
          vcChips: vcChips - cost,
          upgrades: { ...upgrades, fasterTicks: newTier },
          tickInterval: TICK_INTERVALS[newTier],
        }
      }

      if (upgrade === 'biggerBudget') {
        const currentTier = upgrades.biggerBudget
        if (currentTier >= 3) return state
        const cost = UPGRADE_COSTS.biggerBudget[currentTier as 0 | 1 | 2]
        if (vcChips < cost) return state
        const newTier = (currentTier + 1) as 0 | 1 | 2 | 3
        return {
          ...state,
          vcChips: vcChips - cost,
          upgrades: { ...upgrades, biggerBudget: newTier },
        }
      }

      return state
    }

    default:
      return state
  }
}
