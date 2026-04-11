'use client'

import { useState } from 'react'
import type { Agent, ModelId } from '../lib/types'
import { useGame } from '../context/GameContext'
import {
  AGENT_ICONS,
  DEFAULT_MODEL_ID,
  MODELS,
  PROMPT_TEMPLATES,
  ROLE_COLORS,
} from '../lib/constants'
import {
  computeHeuristicScore,
  countTokens,
  EMPTY_EVALUATION,
  evaluatePrompt,
  shouldInvalidateCachedGrade,
} from '../lib/promptGrader'
import { getAgentTickCost, hasActivePrompt } from '../lib/tickEngine'

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

function efficiencyClass(efficiency: number) {
  if (efficiency > 50) return 'text-purple-300'
  if (efficiency >= 25) return 'text-teal-300'
  if (efficiency >= 10) return 'text-amber-300'
  return 'text-red-300'
}

export function AgentEditModal({ agent, onClose }: Props) {
  const { state, dispatch, notifyCFOActivity } = useGame()
  const [evaluating, setEvaluating] = useState(false)
  const [evalError, setEvalError] = useState<string | null>(null)

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

  async function handleDone() {
    const promptSnapshot = agent.prompt
    if (!promptSnapshot.trim()) {
      notifyCFOActivity()
      onClose()
      return
    }

    const needsEvaluation =
      agent.evalResult == null ||
      agent.evalPromptSnapshot == null ||
      shouldInvalidateCachedGrade(promptSnapshot, agent.evalPromptSnapshot)

    if (!needsEvaluation) {
      notifyCFOActivity()
      onClose()
      return
    }

    setEvaluating(true)
    setEvalError(null)
    try {
      const evaluation = await evaluatePrompt(promptSnapshot, agent.role, {
        round: state.round,
        arr: Math.max(0, Math.floor(state.arr)),
        users: Math.max(0, Math.floor(state.users)),
        features: Math.max(0, Math.floor(state.features)),
      })
      dispatch({
        type: 'EVALUATE_AGENT',
        agentId: agent.id,
        evaluation,
        promptSnapshot,
        cost: 0,
      })
      notifyCFOActivity()
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Evaluation failed while saving.'
      setEvalError(message)
    } finally {
      setEvaluating(false)
    }
  }

  function useTemplate() {
    const template = PROMPT_TEMPLATES[agent.role]
    handlePromptChange(template)
  }

  function handleModelChange(nextId: ModelId) {
    if (nextId === agent.modelId) return
    dispatch({ type: 'UPDATE_AGENT_MODEL', agentId: agent.id, modelId: nextId })
    notifyCFOActivity()
  }

  const roleName = agent.role.charAt(0).toUpperCase() + agent.role.slice(1)
  const currentModel = MODELS[agent.modelId] ?? MODELS[DEFAULT_MODEL_ID]
  const promptActive = hasActivePrompt(agent)
  const evalResult = agent.evalResult ?? (promptActive ? null : EMPTY_EVALUATION)
  const evalCached = agent.evalResult != null
  const evalStale =
    agent.evalResult != null &&
    shouldInvalidateCachedGrade(agent.prompt, agent.evalPromptSnapshot ?? '')
  const effectiveTokens = evalResult?.estimatedTokensPerTick ?? agent.tokenCount
  const perTickCost = getAgentTickCost(agent)
  const estimatedComputeCost = effectiveTokens * currentModel.costPerToken
  const overCap = agent.qualityScore > currentModel.qualityCap
  const unlockedModels = state.upgrades.unlockedModelIds
    .map((id) => MODELS[id])
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-stone-950/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl bg-stone-950 p-6 text-stone-50 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{AGENT_ICONS[agent.icon]}</span>
              <h2 className="text-xl font-semibold">{agent.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[agent.role]}`}>
                {roleName}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-400">
              Edit this agent&rsquo;s prompt. Saving will evaluate it automatically.
            </p>
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
                {evalCached && ' ✦'}
              </span>
            </div>
          </div>
          <textarea
            value={agent.prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={`Tell your ${agent.role} agent what to do...`}
            rows={6}
            autoFocus
            className="w-full resize-none rounded-xl bg-stone-800 px-4 py-3 text-sm text-stone-100 placeholder-stone-500 outline-none ring-1 ring-stone-700 transition focus:ring-amber-300"
          />
        </div>

        {state.upgrades.promptTemplates && (
          <button
            type="button"
            onClick={useTemplate}
            className="mt-2 self-start text-xs text-amber-300 underline underline-offset-2 hover:text-amber-200"
          >
            Use template
          </button>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Model</p>
            <span className="text-xs text-stone-400">~${perTickCost.toLocaleString()}/tick</span>
          </div>
          <select
            value={agent.modelId}
            onChange={(e) => handleModelChange(e.target.value as ModelId)}
            className="w-full rounded-xl bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none ring-1 ring-stone-700 transition focus:ring-amber-300"
          >
            {unlockedModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} — ${m.costPerToken}/token · cap {m.qualityCap}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] leading-snug text-stone-500">
            Active prompts cost <span className="text-stone-300">salary + tokens × ${currentModel.costPerToken}</span>.
            Empty prompts cost $0/tick. Effective quality is capped at {currentModel.qualityCap}.
          </p>
          {overCap && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
              Your prompt scores {agent.qualityScore} but {currentModel.name} caps at{' '}
              {currentModel.qualityCap}. Upgrade the model to unlock your prompt&rsquo;s full quality.
            </p>
          )}
        </div>

        {evalResult && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-xs transition-colors ${
              evalStale
                ? 'border-stone-700 bg-stone-900/60 text-stone-500'
                : 'border-stone-700 bg-stone-900 text-stone-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">
                AI evaluation
              </p>
              <span className={`font-semibold ${scoreBadgeClass(evalResult.score).replace('bg-', 'text-').replace('-100', '-300')}`}>
                {evalResult.score}/100
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <p>
                ⚡ ~{evalResult.estimatedTokensPerTick} tokens/tick{' '}
                <span className="text-stone-500">(${estimatedComputeCost.toLocaleString()} compute)</span>
              </p>
              <p>💰 ~${evalResult.estimatedRevenuePerTick.toLocaleString()} rev/tick</p>
              <p className={`font-medium ${efficiencyClass(evalResult.tokenEfficiency)}`}>
                📊 Efficiency: {evalResult.tokenEfficiency.toFixed(1)} $/token
              </p>
            </div>
            <p className="mt-2 text-stone-300">&ldquo;{evalResult.explanation}&rdquo;</p>
            {evalStale && (
              <p className="mt-2 text-[11px] italic text-amber-300">
                Prompt changed. Saving will re-evaluate it automatically.
              </p>
            )}
            {!promptActive && (
              <p className="mt-2 text-[11px] italic text-stone-400">
                Empty prompts produce no output and cost nothing.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          {evalError && <span className="text-xs text-red-400">{evalError}</span>}
          <button
            type="button"
            onClick={() => void handleDone()}
            disabled={evaluating}
            className="rounded-xl bg-amber-300 px-5 py-2 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
          >
            {evaluating ? 'Saving…' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  )
}
