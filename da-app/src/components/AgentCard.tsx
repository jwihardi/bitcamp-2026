'use client'

import { useState } from 'react'
import type { Agent, AgentIcon } from '../lib/types'
import { useGame } from '../context/GameContext'
import { AGENT_ICONS, PROMPT_TEMPLATES } from '../lib/constants'
import { computeHeuristicScore, countTokens, gradeWithClaude } from '../lib/promptGrader'

type Props = { agent: Agent }

export function AgentCard({ agent }: Props) {
  const { state, dispatch } = useGame()
  const [confirmFire, setConfirmFire] = useState(false)
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

  function handleNameChange(value: string) {
    dispatch({ type: 'UPDATE_AGENT_NAME', agentId: agent.id, name: value })
  }

  function handleIconChange(icon: AgentIcon) {
    dispatch({ type: 'UPDATE_AGENT_ICON', agentId: agent.id, icon })
  }

  async function handleGradeWithAI() {
    setGrading(true)
    setGradeError(null)
    try {
      const result = await gradeWithClaude(agent.prompt, agent.role)
      dispatch({
        type: 'GRADE_AGENT_AI',
        agentId: agent.id,
        score: result.score,
        cachedPromptText: agent.prompt,
      })
    } catch {
      setGradeError('Grade failed — retry?')
    } finally {
      setGrading(false)
    }
  }

  function handleFire() {
    dispatch({ type: 'FIRE_AGENT', agentId: agent.id })
    setConfirmFire(false)
  }

  function useTemplate() {
    const template = PROMPT_TEMPLATES[agent.role]
    handlePromptChange(template)
  }

  return (
    <article>
      {/* Icon picker */}
      <div>
        {(Object.entries(AGENT_ICONS) as [AgentIcon, string][]).map(([key, emoji]) => (
          <label key={key}>
            <input
              type="radio"
              name={`icon-${agent.id}`}
              value={key}
              checked={agent.icon === key}
              onChange={() => handleIconChange(key)}
            />
            {emoji}
          </label>
        ))}
      </div>

      {/* Name */}
      <input
        type="text"
        value={agent.name}
        onChange={e => handleNameChange(e.target.value)}
        placeholder="Agent name"
      />

      {/* Role badge */}
      <span>{agent.role}</span>

      {/* Quality score */}
      <span>
        {agent.qualityScore}/100
        {agent.qualityCached && ' (AI graded)'}
        {agent.driftRisk && ' ⚠ Drift risk'}
      </span>

      {/* Token count */}
      <span>{agent.tokenCount} tokens</span>

      {/* Off-task indicator */}
      {agent.isOffTask && (
        <p>{agent.name} went off-task this tick — no output</p>
      )}

      {/* Prompt textarea */}
      <textarea
        value={agent.prompt}
        onChange={e => handlePromptChange(e.target.value)}
        placeholder={`Tell your ${agent.role} agent what to do...`}
        rows={4}
      />

      {/* Template button (prestige upgrade) */}
      {state.upgrades.promptTemplates && (
        <button type="button" onClick={useTemplate}>Use template</button>
      )}

      {/* Grade with AI */}
      <button type="button" onClick={handleGradeWithAI} disabled={grading}>
        {grading ? 'Grading...' : agent.qualityCached ? 'Graded ✓ (re-grade)' : 'Grade with AI ✦'}
      </button>
      {gradeError && <span>{gradeError}</span>}

      {/* Fire button */}
      {!confirmFire ? (
        <button type="button" onClick={() => setConfirmFire(true)}>Fire</button>
      ) : (
        <div>
          <span>Fire {agent.name}? Their slot opens immediately.</span>
          <button type="button" onClick={handleFire}>Confirm</button>
          <button type="button" onClick={() => setConfirmFire(false)}>Cancel</button>
        </div>
      )}
    </article>
  )
}
