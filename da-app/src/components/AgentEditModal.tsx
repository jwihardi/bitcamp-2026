'use client'

import { useState } from 'react'
import type { Agent, ModelId } from '../lib/types'
import { useGame } from '../context/GameContext'
import {
  AGENT_ICONS,
  AGENT_SALARY,
  DEFAULT_MODEL_ID,
  EVAL_COST,
  MODELS,
  PROMPT_TEMPLATES,
  ROLE_COLORS,
} from '../lib/constants'
import {
  computeHeuristicScore,
  countTokens,
  evaluatePrompt,
  shouldInvalidateCachedGrade,
} from '../lib/promptGrader'

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
    notifyCFOActivity()
  }

  async function handleEvaluate() {
    if (!agent.prompt.trim()) return
    if (state.runway < EVAL_COST) return

    const promptSnapshot = agent.prompt
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
        cost: EVAL_COST,
      })
      notifyCFOActivity()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Evaluation failed — try again.'
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
  const evalResult = agent.evalResult
  const evalCached = evalResult != null
  const evalStale =
    evalCached &&
    shouldInvalidateCachedGrade(agent.prompt, agent.evalPromptSnapshot ?? '')
  const effectiveTokens = evalResult?.estimatedTokensPerTick ?? agent.tokenCount
  const perTickCost =
    AGENT_SALARY[agent.role] + effectiveTokens * currentModel.costPerToken
  const estimatedComputeCost = effectiveTokens * currentModel.costPerToken
  const overCap = agent.qualityScore > currentModel.qualityCap
  const unlockedModels = state.upgrades.unlockedModelIds
    .map((id) => MODELS[id])
    .filter((m): m is NonNullable<typeof m> => Boolean(m))

  const canAffordEval = state.runway >= EVAL_COST
  const evaluateDisabled = evaluating || !agent.prompt.trim() || !canAffordEval

  function evaluateButtonLabel(): string {
    if (evaluating) return 'Evaluating…'
    if (evalError) return 'Retry'
    if (!canAffordEval) return `Evaluate ($${EVAL_COST})`
    if (evalStale) return `Re-evaluate ($${EVAL_COST}) ⟳`
    if (evalCached) return 'Evaluated ✓'
    return `Evaluate ($${EVAL_COST}) ✦`
  }

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
            <p className="mt-1 text-xs text-stone-400">Edit this agent&rsquo;s prompt to improve their output.</p>
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
                {evalCached && ' ✦'}
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

        {/* Model */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Model</p>
            <span className="text-xs text-stone-400">
              ~${perTickCost.toLocaleString()}/tick
            </span>
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
            Cost formula: <span className="text-stone-300">salary + tokens × ${currentModel.costPerToken}</span>.
            Effective quality is capped at {currentModel.qualityCap}.
          </p>
          {overCap && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
              Your prompt scores {agent.qualityScore} but {currentModel.name} caps at{' '}
              {currentModel.qualityCap}. Upgrade the model to unlock your prompt&rsquo;s full quality.
            </p>
          )}
        </div>

        {/* AI evaluation section */}
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
                <span className="text-stone-500">
                  (${estimatedComputeCost.toLocaleString()} compute)
                </span>
              </p>
              <p>💰 ~${evalResult.estimatedRevenuePerTick.toLocaleString()} rev/tick</p>
              <p className={`font-medium ${efficiencyClass(evalResult.tokenEfficiency)}`}>
                📊 Efficiency: {evalResult.tokenEfficiency.toFixed(1)} $/token
              </p>
            </div>
            <p className="mt-2 text-stone-300">&ldquo;{evalResult.explanation}&rdquo;</p>
            {evalStale && (
              <p className="mt-2 text-[11px] italic text-amber-300">
                Prompt changed — re-evaluate.
              </p>
            )}
          </div>
        )}

        {/* Footer: evaluate + done */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={evaluateDisabled}
              title={!canAffordEval ? 'Not enough runway' : undefined}
              className="rounded-xl border border-stone-700 px-4 py-2 text-sm text-stone-200 transition-colors hover:border-stone-500 hover:text-stone-50 disabled:cursor-not-allowed disabled:text-stone-600"
            >
              {evaluateButtonLabel()}
            </button>
            {evalError && <span className="text-xs text-red-400">{evalError}</span>}
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
