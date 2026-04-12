'use client'

import { useState } from 'react'
import type { Agent, Model } from '@/app/game-config'
import { Button } from './Button'

type AgentEditorModalProps = {
  agent: Agent
  models: Model[]
  isEvaluating: boolean
  onClose: () => void
  onAnalyze: (prompt: string) => void
  onChangeModel: (modelId: string) => void
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
      : score >= 50
        ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }
        : { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border"
      style={{ background: color.bg, color: color.text, borderColor: color.border }}
    >
      {score}/100
    </span>
  )
}

export function AgentEditorModal({
  agent,
  models,
  isEvaluating,
  onClose,
  onAnalyze,
  onChangeModel,
}: AgentEditorModalProps) {
  const [draft, setDraft] = useState(agent.lastPrompt ?? '')
  const eval_ = agent.lastEvaluation

  const promptChanged = draft !== agent.lastPrompt && agent.lastPrompt !== ''
  const isEmpty = draft.trim() === ''

  const unlockedModels = models.filter((m) => m.unlocked)

  const effColor =
    !eval_
      ? '#b3b3b3'
      : eval_.tokenEfficiency > 50
        ? '#8200db'
        : eval_.tokenEfficiency > 25
          ? '#0d9488'
          : eval_.tokenEfficiency > 10
            ? '#d97706'
            : '#dc2626'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.25)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col rounded-[20px] overflow-hidden"
        style={{
          width: 480,
          maxHeight: '90vh',
          background: 'white',
          border: '1px solid #d9d9d9',
          boxShadow: '0px 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid #f0f0f0' }}
        >
          <div>
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
              Agent Editor
            </p>
            <p className="text-sm mt-0.5" style={{ color: '#b3b3b3' }}>
              {agent.emoji} {agent.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xl leading-none rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ color: '#b3b3b3', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Model selector */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: '#b3b3b3' }}
            >
              Model
            </label>
            <select
              value={agent.selectedModel}
              onChange={(e) => onChangeModel(e.target.value)}
              className="w-full rounded-[10px] px-3 py-2 text-sm"
              style={{
                border: '1px solid #d9d9d9',
                background: 'white',
                color: '#1e1e1e',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            >
              {unlockedModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} — ×{model.qualityMultiplier.toFixed(1)} quality · ${model.costPerToken}/token
                </option>
              ))}
            </select>
          </div>

          {/* Prompt textarea */}
          <div className="flex flex-col gap-2">
            <label
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: '#b3b3b3' }}
            >
              Prompt
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Write instructions for your ${agent.name}...\n\nTip: Be specific and concise. Short, clear prompts score higher than long, vague ones.`}
              className="w-full resize-none rounded-[10px] p-3 text-sm leading-relaxed outline-none"
              style={{
                minHeight: 120,
                border: '1px solid #d9d9d9',
                background: '#fafafa',
                color: '#1e1e1e',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1fc46a'
                e.target.style.background = 'white'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d9d9d9'
                e.target.style.background = '#fafafa'
              }}
            />
            <p className="text-xs" style={{ color: '#b3b3b3' }}>
              {draft.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {/* Quality bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#b3b3b3' }}>
                Prompt Quality
              </span>
              <span className="text-xs font-bold" style={{ color: '#1e1e1e' }}>
                {Math.round(agent.promptQuality)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#f0f0f0' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${agent.promptQuality}%`,
                  background:
                    agent.promptQuality >= 70
                      ? '#1fc46a'
                      : agent.promptQuality >= 50
                        ? '#3b82f6'
                        : '#f97316',
                }}
              />
            </div>
          </div>

          {/* Stale warning */}
          {promptChanged && eval_ && (
            <p
              className="text-xs rounded-[8px] px-3 py-2"
              style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
            >
              Prompt changed — re-analyze to update scores.
            </p>
          )}

          {/* Previous evaluation */}
          {eval_ && (
            <div
              className="flex flex-col gap-3 rounded-[12px] p-4"
              style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#b3b3b3' }}>
                  Last Evaluation
                </span>
                <ScoreBadge score={eval_.score} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: '#b3b3b3' }}>Tokens/tick</span>
                  <span className="text-sm font-bold" style={{ color: '#1e1e1e' }}>
                    {eval_.estimatedTokensPerTick.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: '#b3b3b3' }}>Revenue/tick</span>
                  <span className="text-sm font-bold" style={{ color: '#1fc46a' }}>
                    ${eval_.estimatedRevenuePerTick.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: '#b3b3b3' }}>Efficiency</span>
                  <span className="text-sm font-bold" style={{ color: effColor }}>
                    {eval_.tokenEfficiency.toFixed(1)} $/tok
                  </span>
                </div>
              </div>

              {eval_.explanation && (
                <p className="text-xs italic leading-relaxed" style={{ color: '#555' }}>
                  &ldquo;{eval_.explanation}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid #f0f0f0' }}
        >
          <Button variant="Neutral" size="Medium" label="Close" onClick={onClose} />
          <Button
            variant="Primary"
            size="Medium"
            label={isEvaluating ? 'Analyzing...' : 'Analyze Prompt'}
            iconStart={<span>🔍</span>}
            disabled={isEvaluating || isEmpty}
            onClick={() => onAnalyze(draft)}
          />
        </div>
      </div>
    </div>
  )
}
