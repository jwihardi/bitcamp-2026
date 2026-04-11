'use client'

import { useState } from 'react'
import type { Agent } from '../lib/types'
import { useGame } from '../context/GameContext'
import { AGENT_ICONS, PROMPT_TEMPLATES, ROLE_COLORS } from '../lib/constants'
import { computeHeuristicScore, countTokens, gradeWithClaude } from '../lib/promptGrader'

type Props = { agent: Agent; onClose: () => void }

function scoreBadgeClass(score: number) {
  if (score >= 90) return 'bg-purple-100 text-purple-800'
  if (score >= 70) return 'bg-teal-100 text-teal-800'
  if (score >= 40) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function tokenClass(count: number) {
  if (count > 200) return 'text-red-400'
  if (count > 100) return 'text-amber-400'
  return 'text-stone-400'
}

export function AgentEditModal({ agent, onClose }: Props) {
  const { state, dispatch } = useGame()
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)

  function handlePromptChange(value: string) {
    const tokenCount = countTokens(value)
    const qualityScore = computeHeuristicScore(value, agent.role)
    dispatch({
      type: 'UPDATE_PROMPT',
      agentId: agent.id,
      prompt: value,
      tokenCount,
      qualityScore,
    })
  }

  async function handleGradeWithAI() {
    // Snapshot the prompt now — the user may keep typing during the API call.
    const promptSnapshot = agent.prompt
    setGrading(true)
    setGradeError(null)
    try {
      const result = await gradeWithClaude(promptSnapshot, agent.role)
      dispatch({
        type: 'GRADE_AGENT_AI',
        agentId: agent.id,
        score: result.score,
        cachedPromptText: promptSnapshot,
      })
    } catch {
      setGradeError('Grade failed — retry?')
    } finally {
      setGrading(false)
    }
  }

  function useTemplate() {
    const template = PROMPT_TEMPLATES[agent.role]
    handlePromptChange(template)
  }

  const roleName = agent.role.charAt(0).toUpperCase() + agent.role.slice(1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/70"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl bg-stone-950 p-6 text-stone-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{AGENT_ICONS[agent.icon]}</span>
              <h2 className="text-xl font-semibold">{agent.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[agent.role]}`}>
                {roleName}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-400">Edit this agent's prompt to improve their output.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-stone-400 transition-colors hover:text-stone-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Prompt textarea */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Prompt</p>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${tokenClass(agent.tokenCount)}`}>
                {agent.tokenCount} tokens
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreBadgeClass(agent.qualityScore)}`}>
                {agent.qualityScore}/100
                {agent.driftRisk && ' ⚠'}
                {agent.qualityCached && ' ✦'}
              </span>
            </div>
          </div>
          <textarea
            value={agent.prompt}
            onChange={e => handlePromptChange(e.target.value)}
            placeholder={`Tell your ${agent.role} agent what to do...`}
            rows={6}
            autoFocus
            className="w-full resize-none rounded-xl bg-stone-800 px-4 py-3 text-sm text-stone-100 placeholder-stone-500 outline-none ring-1 ring-stone-700 transition focus:ring-amber-300"
          />
        </div>

        {/* Template button */}
        {state.upgrades.promptTemplates && (
          <button
            type="button"
            onClick={useTemplate}
            className="mt-2 self-start text-xs text-amber-300 underline underline-offset-2 hover:text-amber-200"
          >
            Use template
          </button>
        )}

        {/* Footer: grade + done */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGradeWithAI}
              disabled={grading || !agent.prompt.trim()}
              className="rounded-xl border border-stone-700 px-4 py-2 text-sm text-stone-200 transition-colors hover:border-stone-500 hover:text-stone-50 disabled:cursor-not-allowed disabled:text-stone-600"
            >
              {grading ? 'Grading…' : agent.qualityCached ? 'Graded ✓ (re-grade)' : 'Grade with AI ✦'}
            </button>
            {gradeError && <span className="text-xs text-red-400">{gradeError}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-amber-300 px-5 py-2 text-sm font-semibold text-stone-950"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
