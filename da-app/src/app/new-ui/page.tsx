'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { AgentEditorModal } from '@/components/AgentEditorModal'
import { CTOPanel, type CtoReport } from '@/components/CTOPanel'

<<<<<<< HEAD
type HistoryPoint = { time: number; value: number }
=======
type UiTip = {
  id: string
  title: string
  body: string
}

const UI_TIP_DURATION_MS = 5000
>>>>>>> 6ad4104 (notifs)

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
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<HeaderTab>('stats')
  const [reputationUpgrades, setReputationUpgrades] = useState<ReputationUpgrade[]>(INITIAL_REPUTATION_UPGRADES)
  const [tokens, setTokens] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).tokens)
  const [userbase, setUserbase] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).userbase)
  const [agents, setAgents] = useState<Agent[]>(() => getInitialState(INITIAL_REPUTATION_UPGRADES).agents)
  const [models, setModels] = useState<Model[]>(() => getInitialState(INITIAL_REPUTATION_UPGRADES).models)
  const [clickPower, setClickPower] = useState(1)
  const [companyName, setCompanyName] = useState('Your Company')
  const [totalEarned, setTotalEarned] = useState(0)
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0)
  const [lifetimeCosts, setLifetimeCosts] = useState(0)
  const [elapsedGameSeconds, setElapsedGameSeconds] = useState(0)
  const [lifetimeProfitHistory, setLifetimeProfitHistory] = useState<HistoryPoint[]>([{ time: 0, value: 0 }])
  const [lifetimeCostHistory, setLifetimeCostHistory] = useState<HistoryPoint[]>([{ time: 0, value: 0 }])
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  // Modal state
  const [editingAgentId, setEditingAgentId] = useState<IdleAgentType | null>(null)
  const [evaluatingAgentIds, setEvaluatingAgentIds] = useState<Set<IdleAgentType>>(new Set())

  // Permanently unlocked agents — once tokens ever reach an agent's unlockThreshold,
  // the agent stays on the sidebar forever (even if tokens later drop below threshold)
  const [unlockedAgentIds, setUnlockedAgentIds] = useState<Set<IdleAgentType>>(
    () => new Set(INITIAL_AGENTS.filter((a) => a.unlockThreshold === 0).map((a) => a.id)),
  )

  // CTO panel state
  const [ctoReport, setCtoReport] = useState<CtoReport | null>(null)
  const [ctoLoading, setCtoLoading] = useState(false)
  const [ctoError, setCtoError] = useState<string | null>(null)
  const [ctoCollapsed, setCtoCollapsed] = useState(false)
  const [ctoFresh, setCtoFresh] = useState(false)
  const [activeTip, setActiveTip] = useState<UiTip | null>(null)
  const [queuedTips, setQueuedTips] = useState<UiTip[]>([])

  // CTO refs (debounce / anti-stale-closure)
  const ctoLoadingRef = useRef(false)
  const autoConsultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAutoConsultTimeRef = useRef<number>(0)
  const purchasedAgentTypesRef = useRef(new Set<string>())
  const prevStageIndexRef = useRef(0)
  const levelUpAudioRef = useRef<HTMLAudioElement | null>(null)
  const userLevelUpAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevUserMilestoneIndexRef = useRef(0)
<<<<<<< HEAD
  const lifetimeProfitRef = useRef(0)
  const lifetimeCostRef = useRef(0)
=======
  const firedTipIdsRef = useRef(new Set<string>())
  const activeTipRef = useRef<UiTip | null>(null)
  const prevUnlockedAgentIdsRef = useRef(unlockedAgentIds)
  const prevUnlockedModelIdsRef = useRef(new Set(models.filter((model) => model.unlocked).map((model) => model.id)))
  const prevAgentCountsRef = useRef(new Map(agents.map((agent) => [agent.id, agent.count])))
>>>>>>> 6ad4104 (notifs)

  const gameSpeed: number = 1

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const roundAudio = new Audio('/levelup.mp3')
    roundAudio.preload = 'auto'
    levelUpAudioRef.current = roundAudio

    const userAudio = new Audio('/user-levelup.mp3')
    userAudio.preload = 'auto'
    userLevelUpAudioRef.current = userAudio

    return () => {
      roundAudio.pause()
      roundAudio.src = ''
      levelUpAudioRef.current = null

      userAudio.pause()
      userAudio.src = ''
      userLevelUpAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    lifetimeProfitRef.current = lifetimeRevenue
  }, [lifetimeRevenue])

  useEffect(() => {
    lifetimeCostRef.current = lifetimeCosts
  }, [lifetimeCosts])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedGameSeconds((seconds) => {
        const next = seconds + 1
        setLifetimeProfitHistory((prev) => {
          const point: HistoryPoint = { time: next, value: lifetimeProfitRef.current }
          return [...prev, point].slice(-120)
        })
        setLifetimeCostHistory((prev) => {
          const point: HistoryPoint = { time: next, value: lifetimeCostRef.current }
          return [...prev, point].slice(-120)
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

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

  const buyAgent = (agentId: IdleAgentType, isFirstBuy: boolean) => {
    setAgents((prev) => {
      const agent = prev.find((a) => a.id === agentId)
      if (!agent) return prev
      const cost = getCost(agent)
      if (tokens < cost) return prev
      setTokens((t) => t - cost)
      return prev.map((a) => (a.id === agentId ? { ...a, count: a.count + 1 } : a))
    })
    if (isFirstBuy) setEditingAgentId(agentId)
  }

  const enqueueTip = useCallback((tip: UiTip) => {
    if (firedTipIdsRef.current.has(tip.id)) return
    firedTipIdsRef.current.add(tip.id)
    setQueuedTips((current) => {
      if (activeTipRef.current?.id === tip.id) return current
      if (current.some((queued) => queued.id === tip.id)) return current
      return [...current, tip]
    })
  }, [])

  const unlockModel = (modelId: string) => {
    const model = models.find((m) => m.id === modelId)
    if (!model || model.unlocked || tokens < model.unlockCost) return
    setTokens((t) => t - model.unlockCost)
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, unlocked: true } : m)))
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

  // ---- AI CTO ----

  const consultCTO = useCallback(async () => {
    if (ctoLoading) return
    setCtoLoading(true)
    setCtoError(null)

    const payload = {
      stage: FUNDING_STAGES[currentStageIndex].name,
      tokens: Math.floor(tokens),
      userbase: Math.floor(userbase),
      revenuePerSec: getRevenueFromUsers(),
      operatingCostPerSec: getTotalOperatingCost(),
      netIncomePerSec: getRevenueFromUsers() - getTotalOperatingCost(),
      serviceQuality: Math.round(calculateServiceQuality()),
      gameSpeed,
      agents: agents
        .filter((a) => a.count > 0)
        .map((a) => ({
          name: a.name,
          type: a.id,
          count: a.count,
          promptQuality: Math.round(a.promptQuality),
          model: models.find((m) => m.id === a.selectedModel)?.name ?? a.selectedModel,
          prompt: a.lastPrompt,
          evaluationExplanation: a.lastEvaluation?.explanation ?? null,
        })),
    }

    try {
      const res = await fetch('/api/cfo-idle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        setCtoError(err.error ?? 'CTO unavailable — try again.')
      } else {
        const report = (await res.json()) as CtoReport
        setCtoReport(report)
        setCtoFresh(true)
        setTimeout(() => setCtoFresh(false), 2500)
      }
    } catch {
      setCtoError('CTO unavailable — try again.')
    } finally {
      setCtoLoading(false)
    }
  }, [
    ctoLoading, tokens, currentStageIndex, userbase, gameSpeed,
    agents, models, getRevenueFromUsers, getTotalOperatingCost, calculateServiceQuality,
  ])

  // Keep ref in sync so auto-consult timer avoids stale closure
  useEffect(() => { ctoLoadingRef.current = ctoLoading }, [ctoLoading])

  // Debounced free auto-consult (4s delay, 30s minimum interval)
  const scheduleAutoConsult = useCallback(() => {
    if (autoConsultTimerRef.current) clearTimeout(autoConsultTimerRef.current)
    autoConsultTimerRef.current = setTimeout(() => {
      if (ctoLoadingRef.current) return
      const now = Date.now()
      if (now - lastAutoConsultTimeRef.current < 30_000) return
      lastAutoConsultTimeRef.current = now
      consultCTO()
    }, 4_000)
  }, [consultCTO])

  // Trigger on stage advance
  useEffect(() => {
    if (currentStageIndex > prevStageIndexRef.current) {
      const stage = FUNDING_STAGES[currentStageIndex]
      if (stage) {
        enqueueTip({
          id: `stage-${stage.id}`,
          title: `${stage.name} reached`,
          body: 'Your company leveled up. New growth goals are live.',
        })
      }
      prevStageIndexRef.current = currentStageIndex
      scheduleAutoConsult()
    } else {
      prevStageIndexRef.current = currentStageIndex
    }
  }, [currentStageIndex, scheduleAutoConsult, enqueueTip])

  // Trigger on first purchase of a new agent type
  useEffect(() => {
    let triggered = false
    for (const agent of agents) {
      if (agent.count > 0 && !purchasedAgentTypesRef.current.has(agent.id)) {
        purchasedAgentTypesRef.current.add(agent.id)
        enqueueTip({
          id: `bought-${agent.id}`,
          title: `${agent.name} hired`,
          body: 'Open the agent editor to write a prompt and improve output.',
        })
        triggered = true
      }
    }
    if (triggered) scheduleAutoConsult()
  }, [agents, scheduleAutoConsult, enqueueTip])

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
      const incurredCosts = (costs / 10) * gameSpeed
      setTokens((t) => t + earned)
      setLifetimeCosts((c) => c + incurredCosts)
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

  // Permanently unlock agents once tokens cross their threshold (one-way latch)
  useEffect(() => {
    setUnlockedAgentIds((prev) => {
      const next = new Set(prev)
      let changed = false
      for (const agent of agents) {
        if (!next.has(agent.id) && tokens >= agent.unlockThreshold) {
          next.add(agent.id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [tokens, agents])

  useEffect(() => {
    const previous = prevUnlockedAgentIdsRef.current
    const newlyUnlocked = [...unlockedAgentIds].filter((id) => !previous.has(id))
    prevUnlockedAgentIdsRef.current = unlockedAgentIds

    newlyUnlocked.forEach((id) => {
      const agent = agents.find((entry) => entry.id === id)
      if (!agent || agent.unlockThreshold === 0) return
      enqueueTip({
        id: `unlock-agent-${agent.id}`,
        title: `${agent.name} unlocked`,
        body: 'A new agent is available in the right sidebar shop.',
      })
    })
  }, [unlockedAgentIds, agents, enqueueTip])

  useEffect(() => {
    const previous = prevUnlockedModelIdsRef.current
    const next = new Set(models.filter((model) => model.unlocked).map((model) => model.id))
    const newlyUnlocked = [...next].filter((id) => !previous.has(id))
    prevUnlockedModelIdsRef.current = next

    newlyUnlocked.forEach((id) => {
      if (id === 'nimbus_1') return
      const model = models.find((entry) => entry.id === id)
      if (!model) return
      enqueueTip({
        id: `unlock-model-${model.id}`,
        title: `${model.name} unlocked`,
        body: 'Switch models in the agent editor to trade more cost for more quality.',
      })
    })
  }, [models, enqueueTip])

  useEffect(() => {
    const previous = prevAgentCountsRef.current
    const next = new Map(agents.map((agent) => [agent.id, agent.count]))
    prevAgentCountsRef.current = next

    agents.forEach((agent) => {
      const previousCount = previous.get(agent.id) ?? 0
      if (previousCount === 0 && agent.count > 0) {
        enqueueTip({
          id: `first-agent-open-${agent.id}`,
          title: 'Prompt your agents',
          body: 'Right-click an agent row to reopen its editor and refine the prompt later.',
        })
      }
    })
  }, [agents, enqueueTip])

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
      if (levelUpAudioRef.current) {
        levelUpAudioRef.current.currentTime = 0
        void levelUpAudioRef.current.play().catch(() => {})
      }
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

  useEffect(() => {
    let achievedMilestoneIndex = 0
    for (let i = 1; i < FUNDING_STAGES.length; i += 1) {
      if (userbase >= FUNDING_STAGES[i].userRequirement) {
        achievedMilestoneIndex = i
      }
    }

    if (achievedMilestoneIndex > prevUserMilestoneIndexRef.current) {
      prevUserMilestoneIndexRef.current = achievedMilestoneIndex
      if (userLevelUpAudioRef.current) {
        userLevelUpAudioRef.current.currentTime = 0
        void userLevelUpAudioRef.current.play().catch(() => {})
      }
      return
    }

    if (achievedMilestoneIndex < prevUserMilestoneIndexRef.current) {
      prevUserMilestoneIndexRef.current = achievedMilestoneIndex
    }
  }, [userbase])

  // ---- derived display values ----

  const nextStage = FUNDING_STAGES[currentStageIndex + 1] ?? null
  const percentage = (currentStageIndex / (FUNDING_STAGES.length - 1)) * 100

  const usersPerSecond = getTotalUsersPerSecond()
  const passiveProfitPerSecond = getRevenueFromUsers() - getTotalOperatingCost()
  const unlockedModels = models.filter((m) => m.unlocked)

  // ---- modal derived ----

  const editingAgent = editingAgentId ? agents.find((a) => a.id === editingAgentId) ?? null : null

  useEffect(() => {
    activeTipRef.current = activeTip
  }, [activeTip])

  useEffect(() => {
    if (activeTip || queuedTips.length === 0) return
    setActiveTip(queuedTips[0])
    setQueuedTips((current) => current.slice(1))
  }, [activeTip, queuedTips])

  useEffect(() => {
    if (!activeTip) return
    const id = window.setTimeout(() => {
      setActiveTip(null)
    }, UI_TIP_DURATION_MS)
    return () => window.clearTimeout(id)
  }, [activeTip])

  if (!mounted) return null

  return (
    <div className="flex flex-col h-screen" style={{ background: 'white' }}>
      {activeTip && (
        <aside
          className="pointer-events-none fixed z-[70] w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-left shadow-lg"
          style={{
            top: 16,
            right: 16,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#1fc46a' }}>
            Tip
          </p>
          <h3 className="mt-1 text-sm font-semibold text-stone-950">{activeTip.title}</h3>
          <p className="mt-1 text-[13px] leading-5 text-stone-700">{activeTip.body}</p>
        </aside>
      )}

      <HeaderView
        arr={tokens}
        users={Math.floor(userbase)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div
          className="border-r"
          style={{
            borderColor: '#d9d9d9',
            width: 'clamp(360px, 24vw, 640px)',
            flexShrink: 0,
          }}
        >
          <LeftPanel
            percentage={percentage}
            userCount={Math.floor(userbase)}
            passiveProfitPerSecond={passiveProfitPerSecond}
            companyName={companyName}
            onCompanyNameChange={setCompanyName}
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
              lifetimeCosts={lifetimeCosts}
              elapsedGameSeconds={elapsedGameSeconds}
              lifetimeProfitHistory={lifetimeProfitHistory}
              lifetimeCostHistory={lifetimeCostHistory}
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

        {/* Right pane */}
        <RightPanel
          agents={agents}
          models={models}
          tokens={tokens}
          unlockedAgentIds={unlockedAgentIds}
          getCost={getCost}
          getUsersPerSecond={getUsersPerSecond}
          onBuy={(id, isFirstBuy) => buyAgent(id, isFirstBuy)}
          onOpenEditor={setEditingAgentId}
          onUnlockModel={unlockModel}
        />
      </div>

      {/* Modals */}
      {editingAgent && (
        <AgentEditorModal
          agent={editingAgent}
          models={models}
          isEvaluating={evaluatingAgentIds.has(editingAgent.id)}
          onClose={() => setEditingAgentId(null)}
          onAnalyze={(prompt) => {
            handleAnalyze(editingAgent.id, prompt)
            setEditingAgentId(null)
          }}
          onChangeModel={(modelId) => changeAgentModel(editingAgent.id, modelId)}
        />
      )}

      {/* AI CTO Panel — fixed bottom-right, auto-consults only */}
      <CTOPanel
        collapsed={ctoCollapsed}
        onToggle={() => setCtoCollapsed((c) => !c)}
        report={ctoReport}
        loading={ctoLoading}
        error={ctoError}
        fresh={ctoFresh}
      />
    </div>
  )
}
