'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PromptEvaluation } from '@/lib/types'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'
import {
  INITIAL_MODELS,
  INITIAL_AGENTS,
  FUNDING_STAGES,
  INITIAL_REPUTATION_UPGRADES,
  REVENUE_PER_USER,
} from '../game-config'
import type { Model, Agent, ReputationUpgrade } from '../game-config'
import { HeaderView, type HeaderTab } from '@/components/Header'
import { LeftPanel } from '@/components/LeftPanel'
import { RightPanel } from '@/components/RightPanel'
import { UpgradesPane } from '@/components/UpgradesPane'
import { StatisticsPanel } from '@/components/StatisticsPanel'
import { BuyAgentModal } from '@/components/BuyAgentModal'
import { PromptEditorModal } from '@/components/PromptEditorModal'

// ---- helpers ----

async function evaluateIdlePrompt(
  prompt: string,
  agentType: IdleAgentType,
  stageContext: { stage: string; users: number; revenue: number; agentCount: number },
): Promise<PromptEvaluation> {
  const response = await fetch('/api/evaluate-idle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, agentType, stageContext }),
  })
  if (!response.ok) {
    let detail = `Evaluation failed: ${response.status}`
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) detail = data.error
    } catch { /* keep HTTP status */ }
    throw new Error(detail)
  }
  return (await response.json()) as PromptEvaluation
}

function getInitialState(upgrades: ReputationUpgrade[]) {
  const has = (effect: string) => upgrades.some((u) => u.effect === effect && u.purchased)
  return {
    tokens: has('startingCash') ? 1500 : 0,
    userbase: has('startingUsers') ? 150 : 0,
    agents: INITIAL_AGENTS.map((a) => ({
      ...a,
      promptQuality: has('promptQuality') ? 70 : 0,
    })),
    models: INITIAL_MODELS.map((m) => ({
      ...m,
      unlocked: m.id === 'nimbus_1' || (m.id === 'quanta_s' && has('modelUnlock')),
    })),
  }
}

export default function NewUIPage() {
  const [activeTab, setActiveTab] = useState<HeaderTab>('stats')
  const [reputationUpgrades, setReputationUpgrades] = useState<ReputationUpgrade[]>(INITIAL_REPUTATION_UPGRADES)
  const [tokens, setTokens] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).tokens)
  const [userbase, setUserbase] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).userbase)
  const [agents, setAgents] = useState<Agent[]>(() => getInitialState(INITIAL_REPUTATION_UPGRADES).agents)
  const [models, setModels] = useState<Model[]>(() => getInitialState(INITIAL_REPUTATION_UPGRADES).models)
  const [clickPower, setClickPower] = useState(1)
  const [totalEarned, setTotalEarned] = useState(0)
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  // Modal state
  const [editingAgentId, setEditingAgentId] = useState<IdleAgentType | null>(null)
  const [buyingAgentId, setBuyingAgentId] = useState<IdleAgentType | null>(null)
  const [evaluatingAgentIds, setEvaluatingAgentIds] = useState<Set<IdleAgentType>>(new Set())

  const gameSpeed: number = 1

  // ---- reputation upgrade purchase ----

  const [reputation, setReputation] = useState(0)

  const buyReputationUpgrade = (upgradeId: string) => {
    const upgrade = reputationUpgrades.find((u) => u.id === upgradeId)
    if (!upgrade || upgrade.purchased || reputation < upgrade.cost) return
    setReputation((r) => r - upgrade.cost)
    setReputationUpgrades((prev) =>
      prev.map((u) => (u.id === upgradeId ? { ...u, purchased: true } : u)),
    )
  }

  // ---- reputation bonuses ----

  const getReputationBonus = useCallback((effect: string): number => {
    if (!reputationUpgrades.some((u) => u.effect === effect && u.purchased)) return 0
    switch (effect) {
      case 'clickMultiplier': return 2
      case 'userGeneration':  return 1.25
      case 'costReduction':   return 0.8
      case 'revenueBoost':    return 1.5
      default: return 1
    }
  }, [reputationUpgrades])

  // ---- derived ----

  const getCost = (agent: Agent): number =>
    Math.floor(agent.baseCost * Math.pow(agent.multiplier, agent.count))

  const getUsersPerSecond = useCallback((agent: Agent): number => {
    const model = models.find((m) => m.id === agent.selectedModel)
    const qualityBonus = model ? model.qualityMultiplier : 1
    const promptBonus = agent.promptQuality / 100
    const reputationBonus = getReputationBonus('userGeneration') || 1
    return agent.baseUsersPerSecond * agent.count * qualityBonus * promptBonus * reputationBonus
  }, [models, getReputationBonus])

  const getTotalUsersPerSecond = useCallback(
    (): number => agents.reduce((sum, a) => sum + getUsersPerSecond(a), 0),
    [agents, getUsersPerSecond],
  )

  const getRevenueFromUsers = useCallback((): number => {
    const reputationBonus = getReputationBonus('revenueBoost') || 1
    return userbase * REVENUE_PER_USER * reputationBonus
  }, [userbase, getReputationBonus])

  const getOperatingCost = useCallback((agent: Agent): number => {
    const model = models.find((m) => m.id === agent.selectedModel)
    const costPerToken = model ? model.costPerToken : 0.001
    const reputationBonus = getReputationBonus('costReduction') || 1
    const promptEfficiency = agent.promptQuality / 100
    const tokenMultiplier = 2 - promptEfficiency
    const tokensUsed = agent.lastEvaluation
      ? agent.lastEvaluation.estimatedTokensPerTick
      : agent.baseTokensPerTask * tokenMultiplier
    return tokensUsed * costPerToken * agent.count * reputationBonus
  }, [models, getReputationBonus])

  const getTotalOperatingCost = useCallback(
    (): number => agents.reduce((sum, a) => sum + getOperatingCost(a), 0),
    [agents, getOperatingCost],
  )

  const getAgentQuality = useCallback((agent: Agent): number => {
    if (agent.count === 0) return 0
    const model = models.find((m) => m.id === agent.selectedModel)
    const modelQuality = model ? model.qualityMultiplier : 1
    const promptScore = agent.promptQuality * 0.7
    const modelScore = ((modelQuality - 1) / 1.2) * 30
    return Math.min(100, promptScore + modelScore)
  }, [models])

  const getUserChurnRate = (quality: number): number => {
    if (quality >= 75) return 0
    if (quality >= 65) return 0.005
    if (quality >= 55) return 0.015
    if (quality >= 45) return 0.04
    if (quality >= 35) return 0.08
    return 0.15
  }

  const calculateServiceQuality = useCallback((): number => {
    const active = agents.filter((a) => a.count > 0)
    if (active.length === 0) return 100
    const totalWeight = active.reduce((sum, a) => sum + getUsersPerSecond(a), 0)
    if (totalWeight === 0) return 100
    const weighted = active.reduce((sum, a) => {
      const model = models.find((m) => m.id === a.selectedModel)
      const modelQuality = model ? model.qualityMultiplier : 1
      const promptScore = a.promptQuality * 0.7
      const modelScore = ((modelQuality - 1) / 1.2) * 30
      const quality = Math.min(100, promptScore + modelScore)
      return sum + quality * getUsersPerSecond(a)
    }, 0)
    return Math.max(0, Math.min(100, weighted / totalWeight))
  }, [agents, models, getUsersPerSecond])

  // ---- click handler ----

  const handleClick = useCallback(() => {
    const multiplier = getReputationBonus('clickMultiplier') || 1
    const gained = clickPower * multiplier
    setUserbase((u) => u + gained)
  }, [clickPower, getReputationBonus])

  // ---- agent actions ----

  const buyAgent = (agentId: IdleAgentType) => {
    setAgents((prev) => {
      const agent = prev.find((a) => a.id === agentId)
      if (!agent) return prev
      const cost = getCost(agent)
      if (tokens < cost) return prev
      setTokens((t) => t - cost)
      return prev.map((a) => (a.id === agentId ? { ...a, count: a.count + 1 } : a))
    })
  }

  const changeAgentModel = (agentId: IdleAgentType, modelId: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, selectedModel: modelId } : a)),
    )
  }

  const applyEvaluation = (agentId: IdleAgentType, prompt: string, evaluation: PromptEvaluation) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, promptQuality: evaluation.score, lastEvaluation: evaluation, lastPrompt: prompt }
          : a,
      ),
    )
  }

  const handleAnalyze = (agentId: IdleAgentType, prompt: string) => {
    setEvaluatingAgentIds((prev) => new Set(prev).add(agentId))
    const stageContext = {
      stage: FUNDING_STAGES[currentStageIndex].name,
      users: Math.floor(userbase),
      revenue: Math.floor(totalEarned),
      agentCount: agents.reduce((s, a) => s + a.count, 0),
    }
    void evaluateIdlePrompt(prompt, agentId, stageContext)
      .then((evaluation) => {
        applyEvaluation(agentId, prompt, evaluation)
        setEvaluatingAgentIds((prev) => {
          const next = new Set(prev)
          next.delete(agentId)
          return next
        })
      })
      .catch((e) => {
        console.error('[handleAnalyze] evaluation failed', e instanceof Error ? e.message : e)
        setEvaluatingAgentIds((prev) => {
          const next = new Set(prev)
          next.delete(agentId)
          return next
        })
      })
  }

  // ---- game loops ----

  // User generation loop
  useEffect(() => {
    // gameSpeed is always 1 in new-ui; guard kept for future extensibility
    const usersPerSecond = getTotalUsersPerSecond()
    const quality = calculateServiceQuality()
    const churnRate = getUserChurnRate(quality)

    const interval = setInterval(() => {
      const gained = (usersPerSecond / 10) * gameSpeed
      const lost = ((userbase * churnRate) / 10) * gameSpeed
      setUserbase((u) => Math.max(0, u + gained - lost))
    }, 100)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, models, userbase, reputationUpgrades])

  // Revenue loop
  useEffect(() => {
    const revenue = getRevenueFromUsers()
    const costs = getTotalOperatingCost()
    const netIncome = revenue - costs

    const interval = setInterval(() => {
      const earned = (netIncome / 10) * gameSpeed
      setTokens((t) => t + earned)
      if (netIncome > 0) {
        setTotalEarned((e) => e + earned)
        setLifetimeRevenue((r) => r + earned)
      }
    }, 100)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userbase, agents, models, reputationUpgrades])

  // clickPower scales with total agents purchased
  useEffect(() => {
    const totalAgents = agents.reduce((sum, a) => sum + a.count, 0)
    setClickPower(1 + Math.floor(totalAgents * 0.5))
  }, [agents])

  // Stage advance
  const advanceStage = useCallback(() => {
    const next = FUNDING_STAGES[currentStageIndex + 1]
    if (!next) return
    const netIncome = getRevenueFromUsers() - getTotalOperatingCost()
    if (
      userbase >= next.userRequirement &&
      totalEarned >= next.revenueRequirement &&
      netIncome >= next.profitRequirement
    ) {
      setCurrentStageIndex((i) => i + 1)
    }
  }, [
    currentStageIndex,
    userbase,
    totalEarned,
    getRevenueFromUsers,
    getTotalOperatingCost,
  ])

  useEffect(() => {
    advanceStage()
  }, [userbase, totalEarned, currentStageIndex, advanceStage])

  // ---- derived display values ----

  const nextStage = FUNDING_STAGES[currentStageIndex + 1] ?? null
  const percentage = (currentStageIndex / (FUNDING_STAGES.length - 1)) * 100

  const usersPerSecond = getTotalUsersPerSecond()
  const passiveProfitPerSecond = getRevenueFromUsers() - getTotalOperatingCost()
  const unlockedModels = models.filter((m) => m.unlocked)

  const companyName = (() => {
    const firstHired = agents.find((a) => a.count > 0)
    return firstHired ? `${firstHired.name} & Co.` : 'Your Company'
  })()

  // ---- modal derived ----

  const editingAgent = editingAgentId ? agents.find((a) => a.id === editingAgentId) ?? null : null
  const buyingAgent = buyingAgentId ? agents.find((a) => a.id === buyingAgentId) ?? null : null

  return (
    <div className="flex flex-col h-screen" style={{ background: 'white' }}>
      <HeaderView
        arr={tokens}
        users={Math.floor(userbase)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div className="border-r" style={{ borderColor: '#d9d9d9', width: '360px', flexShrink: 0 }}>
          <LeftPanel
            percentage={percentage}
            userCount={Math.floor(userbase)}
            passiveProfitPerSecond={passiveProfitPerSecond}
            companyName={companyName}
            onGoldButtonClick={handleClick}
          />
        </div>

        {/* Center pane */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'upgrades' && (
            <UpgradesPane
              reputation={reputation}
              upgrades={reputationUpgrades}
              onBuy={buyReputationUpgrade}
            />
          )}
          {activeTab === 'stats' && (
            <StatisticsPanel
              tokens={tokens}
              totalEarned={totalEarned}
              lifetimeRevenue={lifetimeRevenue}
              usersPerSecond={usersPerSecond}
              clickPower={clickPower}
              currentStageIndex={currentStageIndex}
              userbase={userbase}
              profitPerSecond={passiveProfitPerSecond}
              unlockedModels={unlockedModels}
              totalModels={models.length}
              nextStage={nextStage}
            />
          )}
        </div>

        {/* Right pane — wired to new-ui state */}
        <RightPanel
          agents={agents}
          models={models}
          tokens={tokens}
          getCost={getCost}
          getAgentQuality={getAgentQuality}
          getUsersPerSecond={getUsersPerSecond}
          evaluatingAgentIds={evaluatingAgentIds}
          onOpenBuy={setBuyingAgentId}
          onOpenPrompt={setEditingAgentId}
          onChangeModel={changeAgentModel}
        />
      </div>

      {/* Modals */}
      {buyingAgent && (
        <BuyAgentModal
          agent={buyingAgent}
          cost={getCost(buyingAgent)}
          canAfford={tokens >= getCost(buyingAgent)}
          onConfirm={() => {
            buyAgent(buyingAgent.id)
            setBuyingAgentId(null)
          }}
          onClose={() => setBuyingAgentId(null)}
        />
      )}

      {editingAgent && (
        <PromptEditorModal
          agent={editingAgent}
          isEvaluating={evaluatingAgentIds.has(editingAgent.id)}
          onClose={() => setEditingAgentId(null)}
          onAnalyze={(prompt) => {
            handleAnalyze(editingAgent.id, prompt)
            setEditingAgentId(null)
          }}
        />
      )}
    </div>
  )
}
