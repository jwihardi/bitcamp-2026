'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type Dispatch,
} from 'react'
import type { Action, GameState } from '../lib/types'
import { gameReducer } from '../lib/gameReducer'
import { INITIAL_STATE, INITIAL_UPGRADES, BASE_RUNWAY, BUDGET_PER_TIER, TICK_INTERVALS } from '../lib/constants'
import { resolveTick, awardVcChips } from '../lib/tickEngine'

// ---- Persistence helpers ----

const LS_CHIPS_KEY = 'vibe_combinator_chips'
const LS_UPGRADES_KEY = 'vibe_combinator_upgrades'

function loadPersistedState(): Pick<GameState, 'vcChips' | 'upgrades'> {
  if (typeof window === 'undefined') {
    return { vcChips: 0, upgrades: INITIAL_UPGRADES }
  }
  try {
    const chips = JSON.parse(localStorage.getItem(LS_CHIPS_KEY) ?? '0') as number
    const upgrades = JSON.parse(localStorage.getItem(LS_UPGRADES_KEY) ?? 'null') ?? INITIAL_UPGRADES
    return { vcChips: chips, upgrades }
  } catch {
    return { vcChips: 0, upgrades: INITIAL_UPGRADES }
  }
}

function persistState(state: GameState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_CHIPS_KEY, JSON.stringify(state.vcChips))
    localStorage.setItem(LS_UPGRADES_KEY, JSON.stringify(state.upgrades))
  } catch {
    // Storage quota exceeded or private browsing — ignore
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

// ---- Context types ----

type GameContextValue = {
  state: GameState
  dispatch: Dispatch<Action>
  /** IDs of tip cards already shown this run — read-only reference */
  firedTipIds: Set<string>
  /** Call to mark a tip as fired (used by TickEngine after evaluating) */
  markTipFired: (id: string) => void
}

const GameContext = createContext<GameContextValue | null>(null)

// ---- Provider ----

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, buildInitialState)

  // Fired tip IDs live outside the reducer (UI-only, reset on NEW_RUN)
  const firedTipIdsRef = useRef<Set<string>>(new Set())

  const markTipFired = useCallback((id: string) => {
    firedTipIdsRef.current.add(id)
  }, [])

  // Persist carry-over values whenever they change
  useEffect(() => {
    persistState(state)
  }, [state.vcChips, state.upgrades])

  // ---- Tick engine ----

  // Use a ref so the interval callback always sees fresh state
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const phase = state.phase
    if (phase === 'game_over' || phase === 'ipo' || phase === 'prestige_shop') return

    const tick = () => {
      const current = stateRef.current
      if (
        current.phase === 'game_over' ||
        current.phase === 'ipo' ||
        current.phase === 'prestige_shop'
      ) return

      const result = resolveTick(current, firedTipIdsRef.current)

      // Mark tip as fired before dispatching so it doesn't re-trigger
      if (result.firedTipId) {
        firedTipIdsRef.current.add(result.firedTipId)
      }

      const { firedTipId: _ignored, ...payload } = result

      dispatch({ type: 'TICK', payload })

      // IPO check after tick resolves
      if (payload.phase === 'ipo') {
        const chips = awardVcChips(payload.valuation)
        dispatch({ type: 'IPO_TRIGGERED', valuation: payload.valuation, chipsEarned: chips })
      }
    }

    const id = setInterval(tick, state.tickInterval)
    return () => clearInterval(id)
    // Re-run when tickInterval or phase changes so the interval is restarted cleanly
  }, [state.tickInterval, state.phase])

  // Reset fired tips on new run
  const prevPhaseRef = useRef(state.phase)
  useEffect(() => {
    if (prevPhaseRef.current !== 'game_over' && state.phase === 'game_over') {
      // keep tips as-is; cleared on NEW_RUN
    }
    if (state.tickCount === 0 && prevPhaseRef.current !== 'game_over') {
      // NEW_RUN resets tickCount to 0 outside of game_over, so reset tips
      firedTipIdsRef.current = new Set()
    }
    prevPhaseRef.current = state.phase
  }, [state.phase, state.tickCount])

  return (
    <GameContext.Provider value={{ state, dispatch, firedTipIds: firedTipIdsRef.current, markTipFired }}>
      {children}
    </GameContext.Provider>
  )
}

// ---- Hook ----

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>')
  return ctx
}
