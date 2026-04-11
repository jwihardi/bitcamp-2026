'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import type { Action, GameState, TipCard } from '@/lib/types'
import { gameReducer } from '@/lib/gameReducer'
import {
  BASE_RUNWAY,
  BUDGET_PER_TIER,
  INITIAL_STATE,
  INITIAL_UPGRADES,
  TIP_CARDS,
  TICK_INTERVALS,
} from '@/lib/constants'
import { resolveTick } from '@/lib/tickEngine'

const LS_CHIPS_KEY = 'vibe_combinator_chips'
const LS_UPGRADES_KEY = 'vibe_combinator_upgrades'

function loadPersistedState(): Pick<GameState, 'vcChips' | 'upgrades'> {
  if (typeof window === 'undefined') {
    return { vcChips: 0, upgrades: INITIAL_UPGRADES }
  }
  try {
    const rawChips = localStorage.getItem(LS_CHIPS_KEY)
    const rawUpgrades = localStorage.getItem(LS_UPGRADES_KEY)
    const vcChips = rawChips ? (JSON.parse(rawChips) as number) : 0
    const upgrades = rawUpgrades
      ? (JSON.parse(rawUpgrades) as GameState['upgrades'])
      : INITIAL_UPGRADES

    // Migrate old saves that predate the LLM models feature.
    if (!Array.isArray(upgrades.unlockedModelIds)) {
      upgrades.unlockedModelIds = ['nimbus_1']
    } else if (!upgrades.unlockedModelIds.includes('nimbus_1')) {
      upgrades.unlockedModelIds = ['nimbus_1', ...upgrades.unlockedModelIds]
    }

    return { vcChips, upgrades }
  } catch {
    return { vcChips: 0, upgrades: INITIAL_UPGRADES }
  }
}

function persistCarryOver(
  vcChips: number,
  upgrades: GameState['upgrades'],
) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_CHIPS_KEY, JSON.stringify(vcChips))
    localStorage.setItem(LS_UPGRADES_KEY, JSON.stringify(upgrades))
  } catch {
    // Quota exceeded or private browsing — ignore
  }
}

function buildInitialState(): GameState {
  const { vcChips, upgrades } = loadPersistedState()
  return {
    ...INITIAL_STATE,
    vcChips,
    upgrades,
    runway: BASE_RUNWAY + upgrades.biggerBudget * BUDGET_PER_TIER,
    tickInterval: TICK_INTERVALS[upgrades.fasterTicks],
  }
}

type GameContextValue = {
  state: GameState
  dispatch: Dispatch<Action>
  activeTipCard: TipCard | null
  dismissTipCard: () => void
  markTipFired: (id: string) => void
  hasFiredTip: (id: string) => boolean
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, buildInitialState)
  const [activeTipCard, setActiveTipCard] = useState<TipCard | null>(null)
  const [queuedTipCards, setQueuedTipCards] = useState<TipCard[]>([])
  const activeTipCardRef = useRef<TipCard | null>(null)

  const firedTipIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    activeTipCardRef.current = activeTipCard
  }, [activeTipCard])

  const markTipFired = useCallback((id: string) => {
    firedTipIdsRef.current.add(id)
  }, [])

  const hasFiredTip = useCallback((id: string) => {
    return firedTipIdsRef.current.has(id)
  }, [])

  const enqueueTipCard = useCallback((tipCard: TipCard | null) => {
    if (!tipCard) return
    if (firedTipIdsRef.current.has(tipCard.id)) return

    firedTipIdsRef.current.add(tipCard.id)

    setQueuedTipCards((current) => {
      if (activeTipCardRef.current?.id === tipCard.id) return current
      if (current.some((queued) => queued.id === tipCard.id)) return current
      return [...current, tipCard]
    })
  }, [])

  const dismissTipCard = useCallback(() => {
    setActiveTipCard(null)
  }, [])

  useEffect(() => {
    persistCarryOver(state.vcChips, state.upgrades)
  }, [state.vcChips, state.upgrades])

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (activeTipCard != null) return
    if (queuedTipCards.length === 0) return

    const id = window.setTimeout(() => {
      setActiveTipCard(queuedTipCards[0])
      setQueuedTipCards((current) => current.slice(1))
    }, 0)

    return () => window.clearTimeout(id)
  }, [activeTipCard, queuedTipCards])

  useEffect(() => {
    const phase = state.phase
    if (phase === 'game_over' || phase === 'ipo' || phase === 'prestige_shop') {
      return
    }

    const tick = () => {
      const current = stateRef.current
      if (
        current.phase === 'game_over' ||
        current.phase === 'ipo' ||
        current.phase === 'prestige_shop'
      ) {
        return
      }

      const { firedTipId, ...payload } = resolveTick(
        current,
        firedTipIdsRef.current,
      )

      dispatch({ type: 'TICK', payload })

      if (firedTipId) {
        enqueueTipCard(payload.tipCard)
      }
    }

    const id = setInterval(tick, state.tickInterval)
    return () => clearInterval(id)
  }, [state.tickInterval, state.phase, enqueueTipCard])

  const prevTickCountRef = useRef(state.tickCount)
  useEffect(() => {
    if (state.tickCount === 0 && prevTickCountRef.current !== 0) {
      firedTipIdsRef.current = new Set()
      const id = window.setTimeout(() => {
        setActiveTipCard(null)
        setQueuedTipCards([])
      }, 0)
      prevTickCountRef.current = state.tickCount
      return () => window.clearTimeout(id)
    }
    prevTickCountRef.current = state.tickCount
  }, [state.tickCount])

  const prevAgentCountRef = useRef(state.agents.length)
  useEffect(() => {
    const previousCount = prevAgentCountRef.current
    prevAgentCountRef.current = state.agents.length

    if (previousCount <= state.agents.length) return

    const id = window.setTimeout(() => {
      enqueueTipCard(TIP_CARDS.find((tip) => tip.id === 'first_agent_fired') ?? null)
    }, 0)

    return () => window.clearTimeout(id)
  }, [state.agents.length, enqueueTipCard])

  useEffect(() => {
    const firstPendingTip = TIP_CARDS.find((tip) => {
      if (firedTipIdsRef.current.has(tip.id)) return false

      switch (tip.trigger) {
        case 'first_agent_hired':
          return state.agents.length === 1
        case 'first_low_score':
          return state.agents.some((agent) => agent.qualityScore < 40)
        case 'first_chaos_event':
          return state.activeChaosEvent !== null
        case 'entered_burn_mode':
          return state.phase === 'burn_mode'
        case 'first_penalty_cleared':
          return state.pendingPenalties.some((penalty) => !penalty.active)
        default:
          return false
      }
    })

    const id = window.setTimeout(() => {
      enqueueTipCard(firstPendingTip ?? null)
    }, 0)

    return () => window.clearTimeout(id)
  }, [
    state.activeChaosEvent,
    state.agents,
    state.phase,
    state.pendingPenalties,
    enqueueTipCard,
  ])

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        activeTipCard,
        dismissTipCard,
        markTipFired,
        hasFiredTip,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
