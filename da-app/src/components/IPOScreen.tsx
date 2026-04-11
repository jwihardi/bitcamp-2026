'use client'

import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { AGENT_ICONS, UPGRADE_COSTS, TICK_INTERVALS } from '../lib/constants'

export function IPOScreen() {
  const { state, dispatch } = useGame()
  const [panel, setPanel] = useState<1 | 2 | 3>(1)

  if (state.phase !== 'ipo' && state.phase !== 'prestige_shop') return null

  const { valuation, arr, agents, vcChips, upgrades } = state

  const chipsThisRun = Math.floor(valuation / 10_000_000)

  if (panel === 1) {
    return (
      <div>
        <h1>Acquired for ${(valuation / 1_000_000).toFixed(0)}M</h1>
        <p>Congratulations — you&apos;re going public.</p>
        <button onClick={() => setPanel(2)}>See your stats →</button>
      </div>
    )
  }

  if (panel === 2) {
    return (
      <div>
        <h2>{agents[0]?.name ?? 'Your'} &amp; Co.</h2>
        <p>Final valuation: ${(valuation / 1_000_000).toFixed(1)}M</p>
        <p>Peak ARR: ${(arr / 1_000_000).toFixed(1)}M</p>
        <ul>
          {agents.map(a => (
            <li key={a.id}>{AGENT_ICONS[a.icon]} {a.name} — {a.role}</li>
          ))}
        </ul>
        <p>VC chips earned this run: +{chipsThisRun}</p>
        <p>Total VC chips: {vcChips}</p>
        <button onClick={() => setPanel(3)}>Claim chips and upgrade →</button>
      </div>
    )
  }

  // Panel 3: Chip shop
  const fasterTicksTier = upgrades.fasterTicks
  const biggerBudgetTier = upgrades.biggerBudget

  const fasterTicksCost = fasterTicksTier < 3 ? UPGRADE_COSTS.fasterTicks[fasterTicksTier as 0 | 1 | 2] : null
  const biggerBudgetCost = biggerBudgetTier < 3 ? UPGRADE_COSTS.biggerBudget[biggerBudgetTier as 0 | 1 | 2] : null
  const templatesCost = !upgrades.promptTemplates ? UPGRADE_COSTS.promptTemplates : null

  return (
    <div>
      <h2>Chip Shop</h2>
      <p>You have {vcChips} chips</p>

      <section>
        <h3>Faster Ticks (Tier {fasterTicksTier}/3)</h3>
        {fasterTicksTier < 3 ? (
          <>
            <p>Next: {TICK_INTERVALS[fasterTicksTier + 1]}ms ticks</p>
            <p>Cost: {fasterTicksCost} chips</p>
            <button
              disabled={vcChips < (fasterTicksCost ?? Infinity)}
              onClick={() => dispatch({ type: 'BUY_UPGRADE', upgrade: 'fasterTicks' })}
            >
              Buy
            </button>
          </>
        ) : (
          <p>Max tier reached</p>
        )}
      </section>

      <section>
        <h3>Bigger Starting Budget (Tier {biggerBudgetTier}/3)</h3>
        {biggerBudgetTier < 3 ? (
          <>
            <p>Next: +${((biggerBudgetTier + 1) * 25_000).toLocaleString()} starting runway</p>
            <p>Cost: {biggerBudgetCost} chips</p>
            <button
              disabled={vcChips < (biggerBudgetCost ?? Infinity)}
              onClick={() => dispatch({ type: 'BUY_UPGRADE', upgrade: 'biggerBudget' })}
            >
              Buy
            </button>
          </>
        ) : (
          <p>Max tier reached</p>
        )}
      </section>

      <section>
        <h3>Prompt Templates</h3>
        {upgrades.promptTemplates ? (
          <p>Unlocked</p>
        ) : (
          <>
            <p>Adds role-specific starter prompts to every agent card</p>
            <p>Cost: {templatesCost} chips</p>
            <button
              disabled={vcChips < (templatesCost ?? Infinity)}
              onClick={() => dispatch({ type: 'BUY_UPGRADE', upgrade: 'promptTemplates' })}
            >
              Buy
            </button>
          </>
        )}
      </section>

      <button onClick={() => dispatch({ type: 'NEW_RUN' })}>Start new run →</button>
    </div>
  )
}
