'use client'

import type { Agent } from '@/app/game-config'
import { Button } from './Button'

type BuyAgentModalProps = {
  agent: Agent
  cost: number
  canAfford: boolean
  onConfirm: () => void
  onClose: () => void
}

const AGENT_DESCRIPTIONS: Record<string, string> = {
  chatbot: 'Handles customer conversations and support requests, growing your user base through automated assistance.',
  image: 'Generates visual content and creative assets, attracting creative users to your platform.',
  code: 'Writes and reviews code, shipping features faster and improving product quality.',
  data: 'Analyzes datasets and surfaces insights that drive smarter business decisions.',
  research: 'Conducts deep research across topics, producing high-value reports and content.',
  orchestrator: 'Coordinates multiple AI workflows, compounding the output of your entire agent fleet.',
}

function formatCost(n: number): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + Math.floor(n)
}

export function BuyAgentModal({ agent, cost, canAfford, onConfirm, onClose }: BuyAgentModalProps) {
  const description = AGENT_DESCRIPTIONS[agent.id] ?? 'An AI agent that generates value for your company.'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-[20px] overflow-hidden"
        style={{
          width: 400,
          background: 'white',
          border: '1px solid #d9d9d9',
          boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid #f0f0f0' }}
        >
          {/* Icon */}
          <div
            className="flex items-center justify-center rounded-[14px] text-3xl shrink-0"
            style={{
              width: 56,
              height: 56,
              backgroundImage: agent.iconGrad,
            }}
          >
            {agent.emoji}
          </div>

          <div className="flex-1 min-w-0">
            <p
              style={{
                fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.4px',
                color: '#1e1e1e',
                lineHeight: 1.2,
              }}
            >
              {agent.name}
            </p>
            {agent.count > 0 && (
              <p className="text-sm" style={{ color: '#b3b3b3', marginTop: 2 }}>
                You already own ×{agent.count}
              </p>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="text-xl leading-none rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color: '#b3b3b3', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Description */}
          <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
            {description}
          </p>

          {/* Stats row */}
          <div
            className="flex items-center justify-between rounded-[10px] px-4 py-3"
            style={{ background: '#f8f8f8', border: '1px solid #f0f0f0' }}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium" style={{ color: '#b3b3b3' }}>Users/sec</span>
              <span className="text-sm font-bold" style={{ color: '#1e1e1e' }}>
                +{agent.baseUsersPerSecond}
              </span>
            </div>
            <div className="w-px h-8" style={{ background: '#e5e5e5' }} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium" style={{ color: '#b3b3b3' }}>Base cost</span>
              <span className="text-sm font-bold" style={{ color: '#1e1e1e' }}>
                {formatCost(agent.baseCost)}
              </span>
            </div>
            <div className="w-px h-8" style={{ background: '#e5e5e5' }} />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-medium" style={{ color: '#b3b3b3' }}>Cost now</span>
              <span
                className="text-sm font-bold"
                style={{ color: canAfford ? '#1fc46a' : '#ef4444' }}
              >
                {formatCost(cost)}
              </span>
            </div>
          </div>

          {!canAfford && (
            <p className="text-xs text-center" style={{ color: '#ef4444' }}>
              Not enough tokens — need {formatCost(cost)}
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <Button variant="Neutral" size="Medium" label="Cancel" onClick={onClose} />
          <Button
            variant="Primary"
            size="Medium"
            label={agent.count === 0 ? 'Hire Agent' : `Hire Another (${formatCost(cost)})`}
            disabled={!canAfford}
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>
  )
}
