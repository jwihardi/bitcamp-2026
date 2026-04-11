'use client'

import { UPGRADE_COSTS, TICK_INTERVALS } from '../lib/constants'
import { useGame } from '../context/GameContext'

type Props = {
  showStartNewRun?: boolean
  showClose?: boolean
}

export function PrestigeShop({ showStartNewRun = false, showClose = false }: Props) {
  const { state, dispatch } = useGame()
  const { vcChips, upgrades } = state

  const fasterTicksTier = upgrades.fasterTicks
  const biggerBudgetTier = upgrades.biggerBudget

  const fasterTicksCost =
    fasterTicksTier < 3 ? UPGRADE_COSTS.fasterTicks[fasterTicksTier as 0 | 1 | 2] : null
  const biggerBudgetCost =
    biggerBudgetTier < 3 ? UPGRADE_COSTS.biggerBudget[biggerBudgetTier as 0 | 1 | 2] : null
  const templatesCost = !upgrades.promptTemplates ? UPGRADE_COSTS.promptTemplates : null

  return (
    <div className="w-full max-w-5xl rounded-[28px] bg-stone-950 p-6 text-stone-50 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Chip Shop</p>
          <h2 className="mt-2 text-3xl font-semibold">You have {vcChips} chips</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-300">
            Chips persist between runs. Faster ticks stack with burn mode, bigger budget boosts
            starting runway, and prompt templates unlock strong starter prompts.
          </p>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLOSE_PRESTIGE_SHOP' })}
            className="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200"
          >
            Back to run
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Faster Ticks</p>
          <h3 className="mt-2 text-xl font-medium">Tier {fasterTicksTier} / 3</h3>
          <p className="mt-3 text-sm text-stone-300">Reduce the base tick interval every run.</p>
          {fasterTicksTier < 3 ? (
            <>
              <p className="mt-4 text-sm text-stone-200">
                Next tier effect: {TICK_INTERVALS[fasterTicksTier]}ms to{' '}
                {TICK_INTERVALS[fasterTicksTier + 1]}ms
              </p>
              <p className="mt-2 text-sm text-stone-400">Cost: {fasterTicksCost} chips</p>
              <button
                type="button"
                disabled={vcChips < (fasterTicksCost ?? Infinity)}
                onClick={() => dispatch({ type: 'BUY_UPGRADE', upgrade: 'fasterTicks' })}
                className="mt-5 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
              >
                Buy upgrade
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm text-emerald-300">Max tier reached</p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Bigger Budget</p>
          <h3 className="mt-2 text-xl font-medium">Tier {biggerBudgetTier} / 3</h3>
          <p className="mt-3 text-sm text-stone-300">Add $25k starting runway per tier.</p>
          {biggerBudgetTier < 3 ? (
            <>
              <p className="mt-4 text-sm text-stone-200">
                Next tier effect: +${((biggerBudgetTier + 1) * 25_000).toLocaleString()} starting
                runway
              </p>
              <p className="mt-2 text-sm text-stone-400">Cost: {biggerBudgetCost} chips</p>
              <button
                type="button"
                disabled={vcChips < (biggerBudgetCost ?? Infinity)}
                onClick={() => dispatch({ type: 'BUY_UPGRADE', upgrade: 'biggerBudget' })}
                className="mt-5 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
              >
                Buy upgrade
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm text-emerald-300">Max tier reached</p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Prompt Templates</p>
          <h3 className="mt-2 text-xl font-medium">
            {upgrades.promptTemplates ? 'Unlocked' : 'Locked'}
          </h3>
          <p className="mt-3 text-sm text-stone-300">
            Adds role-specific starter prompts that begin above the baseline heuristic.
          </p>
          {!upgrades.promptTemplates ? (
            <>
              <p className="mt-4 text-sm text-stone-200">Next tier effect: starter prompts on every card</p>
              <p className="mt-2 text-sm text-stone-400">Cost: {templatesCost} chips</p>
              <button
                type="button"
                disabled={vcChips < (templatesCost ?? Infinity)}
                onClick={() => dispatch({ type: 'BUY_UPGRADE', upgrade: 'promptTemplates' })}
                className="mt-5 rounded-xl bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
              >
                Buy upgrade
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm text-emerald-300">Templates available on agent cards</p>
          )}
        </section>
      </div>

      {showStartNewRun && (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={() => dispatch({ type: 'NEW_RUN' })}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-stone-950"
          >
            Start new run →
          </button>
        </div>
      )}
    </div>
  )
}
