'use client'

import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { AGENT_ICONS, ROUNDS } from '../lib/constants'
import { PrestigeShop } from './PrestigeShop'

const IPO_FLAVOR_LINES = [
  'Your lean team and sharp prompts made all the difference.',
  'Turns out crisp prompts compound better than headcount.',
  'Investors loved the margins. Customers loved the product enough.',
  'You shipped just enough chaos management to look inevitable.',
]

function fmtMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toFixed(0)}`
}

export function IPOScreen() {
  const { state } = useGame()
  const [panel, setPanel] = useState<1 | 2 | 3>(1)

  if (state.phase === 'prestige_shop') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4">
        <PrestigeShop showClose />
      </div>
    )
  }

  if (state.phase !== 'ipo') return null

  const { valuation, arr, agents, vcChips, pendingPenalties } = state
  const chipsThisRun = Math.floor(valuation / 10_000_000)
  const companyName = `${agents[0]?.name ?? 'Your Startup'} & Co.`
  const chaosEventsSurvived = pendingPenalties.length
  const completedPath = `${ROUNDS.pre_seed.label} → IPO`
  const flavorLine =
    IPO_FLAVOR_LINES[(state.tickCount + chaosEventsSurvived + chipsThisRun) % IPO_FLAVOR_LINES.length]

  if (panel === 1) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.3),_transparent_35%),linear-gradient(180deg,#111827,#0f172a)] p-4">
        <div className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-white/8 p-8 text-center text-white shadow-2xl backdrop-blur sm:p-12">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-200">Acquisition</p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">
            Acquired for {fmtMoney(valuation)}
          </h1>
          <p className="mt-4 text-lg text-stone-200">Congratulations — you&apos;re going public.</p>
          <p className="mt-3 text-sm text-stone-300">{flavorLine}</p>
          <button
            type="button"
            onClick={() => setPanel(2)}
            className="mt-8 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950"
          >
            See your stats →
          </button>
        </div>
      </div>
    )
  }

  if (panel === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 p-4">
        <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 text-stone-950 shadow-2xl sm:p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Result Card</p>
          <h2 className="mt-3 text-3xl font-semibold">{companyName}</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Final valuation</p>
              <p className="mt-2 text-2xl font-semibold">{fmtMoney(valuation)}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Peak ARR</p>
              <p className="mt-2 text-2xl font-semibold">{fmtMoney(arr)}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Chaos events survived</p>
              <p className="mt-2 text-2xl font-semibold">{chaosEventsSurvived}</p>
            </div>
            <div className="rounded-2xl bg-stone-100 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Rounds completed</p>
              <p className="mt-2 text-2xl font-semibold">{completedPath}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-stone-200 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Agents</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {agents.map((agent) => (
                <li key={agent.id} className="flex items-center justify-between gap-3">
                  <span>
                    {AGENT_ICONS[agent.icon]} {agent.name}
                  </span>
                  <span className="capitalize text-stone-500">{agent.role}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p>VC chips earned this run: +{chipsThisRun} chips</p>
            <p>{vcChips} chips total</p>
          </div>
          <p className="mt-6 text-xs text-stone-400">Vibe Combinator · Bitcamp 2026</p>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setPanel(3)}
              className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Claim chips and upgrade →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 p-4">
      <PrestigeShop showStartNewRun />
    </div>
  )
}
