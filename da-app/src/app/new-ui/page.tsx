'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { AchievementsPane } from '@/components/AchievementsPane'
import { AgentEditorModal } from '@/components/AgentEditorModal'
import { CTOPanel, type CtoReport } from '@/components/CTOPanel'
import { buildAchievements, type AchievementMetrics } from '@/lib/achievements'

type HistoryPoint = { time: number; value: number }
type AchievementToast = { key: string; id: string; title: string; emoji: string }

const IPO_FLAVOR_LINES = [
  'Your lean team and sharp prompts made all the difference.',
  'Turns out crisp prompts compound better than headcount.',
  'Investors loved the margins. Customers loved the product enough.',
  'You kept the team focused long enough to make the outcome inevitable.',
]

function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0'
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return Math.floor(num).toString()
}

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
  const [toolNotification, setToolNotification] = useState<{
    id: number
    tone: 'success' | 'info' | 'error'
    title: string
    body: string
  } | null>(null)
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
  const [cashHistory, setCashHistory] = useState<HistoryPoint[]>([{ time: 0, value: 0 }])
  const [userbaseHistory, setUserbaseHistory] = useState<HistoryPoint[]>([{ time: 0, value: 0 }])
  const [usersPerSecondHistory, setUsersPerSecondHistory] = useState<HistoryPoint[]>([{ time: 0, value: 0 }])
  const [profitPerSecondHistory, setProfitPerSecondHistory] = useState<HistoryPoint[]>([{ time: 0, value: 0 }])
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([])
  // Modal state
  const [editingAgentId, setEditingAgentId] = useState<IdleAgentType | null>(null)
  const [evaluatingAgentIds, setEvaluatingAgentIds] = useState<Set<IdleAgentType>>(new Set())
  const [ipoPanel, setIpoPanel] = useState<0 | 1 | 2 | 3>(0)
  const [gamePaused, setGamePaused] = useState(false)

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

  // CTO refs (debounce / anti-stale-closure)
  const ctoLoadingRef = useRef(false)
  const autoConsultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAutoConsultTimeRef = useRef<number>(0)
  const purchasedAgentTypesRef = useRef(new Set<string>())
  const prevStageIndexRef = useRef(0)
  const levelUpAudioRef = useRef<HTMLAudioElement | null>(null)
  const userLevelUpAudioRef = useRef<HTMLAudioElement | null>(null)
  const prevUserMilestoneIndexRef = useRef(0)
  const lifetimeProfitRef = useRef(0)
  const lifetimeCostRef = useRef(0)
  const cashRef = useRef(0)
  const userbaseRef = useRef(0)
  const usersPerSecondRef = useRef(0)
  const profitPerSecondRef = useRef(0)
  const toolNotificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const announcedAchievementIdsRef = useRef<Set<string>>(new Set())

  const gameSpeed: number = 1

  const showToolNotification = useCallback((
    tone: 'success' | 'info' | 'error',
    title: string,
    body: string,
  ) => {
    if (toolNotificationTimerRef.current) clearTimeout(toolNotificationTimerRef.current)
    setToolNotification({ id: Date.now(), tone, title, body })
    toolNotificationTimerRef.current = setTimeout(() => {
      setToolNotification(null)
      toolNotificationTimerRef.current = null
    }, 3_000)
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
    return () => {
      if (toolNotificationTimerRef.current) clearTimeout(toolNotificationTimerRef.current)
    }
  }, [])

  useEffect(() => {
    lifetimeProfitRef.current = lifetimeRevenue
  }, [lifetimeRevenue])

  useEffect(() => {
    lifetimeCostRef.current = lifetimeCosts
  }, [lifetimeCosts])

  useEffect(() => {
    cashRef.current = tokens
  }, [tokens])

  useEffect(() => {
    userbaseRef.current = userbase
  }, [userbase])

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
        setCashHistory((prev) => {
          const point: HistoryPoint = { time: next, value: cashRef.current }
          return [...prev, point].slice(-120)
        })
        setUserbaseHistory((prev) => {
          const point: HistoryPoint = { time: next, value: userbaseRef.current }
          return [...prev, point].slice(-120)
        })
        setUsersPerSecondHistory((prev) => {
          const point: HistoryPoint = { time: next, value: usersPerSecondRef.current }
          return [...prev, point].slice(-120)
        })
        setProfitPerSecondHistory((prev) => {
          const point: HistoryPoint = { time: next, value: profitPerSecondRef.current }
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

  const unlockModel = (modelId: string) => {
    const model = models.find((m) => m.id === modelId)
    if (!model || model.unlocked || tokens < model.unlockCost) return
    setTokens((t) => t - model.unlockCost)
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, unlocked: true } : m)))
    showToolNotification('success', 'Model unlocked', `${model.name} is ready for your agents.`)
  }

  const changeAgentModel = (agentId: IdleAgentType, modelId: string) => {
    const agent = agents.find((entry) => entry.id === agentId)
    const model = models.find((entry) => entry.id === modelId)
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, selectedModel: modelId } : a)),
    )
    if (agent && model) {
      showToolNotification('info', 'Model switched', `${agent.name} now uses ${model.name}.`)
    }
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
    const agent = agents.find((entry) => entry.id === agentId)
    setEvaluatingAgentIds((prev) => new Set(prev).add(agentId))
    showToolNotification(
      'info',
      'Analyzing prompt',
      agent ? `Reviewing the latest instructions for ${agent.name}.` : 'Reviewing prompt quality.',
    )
    const stageContext = {
      stage: FUNDING_STAGES[currentStageIndex].name,
      users: Math.floor(userbase),
      revenue: Math.floor(totalEarned),
      agentCount: agents.reduce((s, a) => s + a.count, 0),
    }
    void evaluateIdlePrompt(prompt, agentId, stageContext)
      .then((evaluation) => {
        applyEvaluation(agentId, prompt, evaluation)
        showToolNotification(
          'success',
          'Analysis complete',
          agent
            ? `${agent.name} scored ${Math.round(evaluation.score)}/100.`
            : `Prompt scored ${Math.round(evaluation.score)}/100.`,
        )
        setEvaluatingAgentIds((prev) => {
          const next = new Set(prev)
          next.delete(agentId)
          return next
        })
      })
      .catch((e) => {
        console.error('[handleAnalyze] evaluation failed', e instanceof Error ? e.message : e)
        showToolNotification(
          'error',
          'Analysis failed',
          e instanceof Error ? e.message : 'Prompt evaluation failed.',
        )
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
        const message = err.error ?? 'CTO unavailable — try again.'
        setCtoError(message)
        showToolNotification('error', 'AI CTO unavailable', message)
      } else {
        const report = (await res.json()) as CtoReport
        setCtoReport(report)
        setCtoFresh(true)
        showToolNotification('success', 'AI CTO updated', 'Fresh technical advice is ready.')
        setTimeout(() => setCtoFresh(false), 2500)
      }
    } catch {
      const message = 'CTO unavailable — try again.'
      setCtoError(message)
      showToolNotification('error', 'AI CTO unavailable', message)
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
      prevStageIndexRef.current = currentStageIndex
      scheduleAutoConsult()
    } else {
      prevStageIndexRef.current = currentStageIndex
    }
  }, [currentStageIndex, scheduleAutoConsult])

  // Trigger on first purchase of a new agent type
  useEffect(() => {
    let triggered = false
    for (const agent of agents) {
      if (agent.count > 0 && !purchasedAgentTypesRef.current.has(agent.id)) {
        purchasedAgentTypesRef.current.add(agent.id)
        triggered = true
      }
    }
    if (triggered) scheduleAutoConsult()
  }, [agents, scheduleAutoConsult])

  // ---- game loops ----

  // User generation loop
  useEffect(() => {
    if (gamePaused) return
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
  }, [agents, models, userbase, reputationUpgrades, gamePaused])

  // Revenue loop
  useEffect(() => {
    if (gamePaused) return
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
  }, [userbase, agents, models, reputationUpgrades, gamePaused])

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
      setReputation((r) => r + next.reputationGain)
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

  // Auto-show IPO overlay when player reaches the IPO stage
  const prevIsAtIPORef = useRef(false)
  useEffect(() => {
    const atIPO = currentStageIndex === FUNDING_STAGES.length - 1
    if (atIPO && !prevIsAtIPORef.current) {
      setIpoPanel(1)
      setGamePaused(true)
    }
    prevIsAtIPORef.current = atIPO
  }, [currentStageIndex])

  // Pivot — reset run, carry over reputation + upgrades
  const pivot = useCallback(() => {
    const ipoStage = FUNDING_STAGES[FUNDING_STAGES.length - 1]
    setReputation((r) => r + ipoStage.reputationGain)
    const initial = getInitialState(reputationUpgrades)
    setTokens(initial.tokens)
    setUserbase(initial.userbase)
    setAgents(initial.agents)
    setModels(initial.models)
    setTotalEarned(0)
    setCurrentStageIndex(0)
    setClickPower(1)
    setLifetimeRevenue(0)
    setLifetimeCosts(0)
    setIpoPanel(0)
    setGamePaused(false)
    setCtoReport(null)
    setCtoError(null)
  }, [reputationUpgrades])

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
  const totalAgents = agents.reduce((sum, agent) => sum + agent.count, 0)
  const purchasedUpgrades = reputationUpgrades.filter((upgrade) => upgrade.purchased).length
  const maxPromptQuality = agents.reduce((max, agent) => Math.max(max, agent.promptQuality), 0)

  const achievementMetrics: AchievementMetrics = useMemo(() => ({
    tokens,
    userbase,
    totalEarned,
    lifetimeRevenue,
    lifetimeCosts,
    usersPerSecond,
    profitPerSecond: passiveProfitPerSecond,
    elapsedGameSeconds,
    totalAgents,
    unlockedModels: unlockedModels.length,
    totalModels: models.length,
    purchasedUpgrades,
    totalUpgrades: reputationUpgrades.length,
    maxPromptQuality,
    currentStageIndex,
  }), [
    tokens,
    userbase,
    totalEarned,
    lifetimeRevenue,
    lifetimeCosts,
    usersPerSecond,
    passiveProfitPerSecond,
    elapsedGameSeconds,
    totalAgents,
    unlockedModels.length,
    models.length,
    purchasedUpgrades,
    reputationUpgrades.length,
    maxPromptQuality,
    currentStageIndex,
  ])

  const achievements = useMemo(() => buildAchievements(achievementMetrics), [achievementMetrics])

  useEffect(() => {
    const newlyUnlocked = achievements.filter(
      (achievement) => achievement.unlocked && !announcedAchievementIdsRef.current.has(achievement.id),
    )

    if (newlyUnlocked.length === 0) return

    for (const achievement of newlyUnlocked) {
      announcedAchievementIdsRef.current.add(achievement.id)
      const key = `${achievement.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setAchievementToasts((prev) => [...prev, { key, id: achievement.id, title: achievement.title, emoji: achievement.emoji }].slice(-4))
      setTimeout(() => {
        setAchievementToasts((prev) => prev.filter((toast) => toast.key !== key))
      }, 4200)
    }
  }, [achievements])

  usersPerSecondRef.current = usersPerSecond
  profitPerSecondRef.current = passiveProfitPerSecond

  const isAtIPO = currentStageIndex === FUNDING_STAGES.length - 1
  const totalAgentCount = agents.reduce((s, a) => s + a.count, 0)
  const ipoValuation = Math.floor(totalEarned * 10)
  const firstHiredAgent = agents.find((a) => a.count > 0)
  const ipoCompanyName = firstHiredAgent ? `${firstHiredAgent.name} & Co.` : companyName
  const ipoFlavorLine = IPO_FLAVOR_LINES[(totalAgentCount + currentStageIndex) % IPO_FLAVOR_LINES.length]
  const ipoReputationGain = FUNDING_STAGES[FUNDING_STAGES.length - 1].reputationGain

  // ---- modal derived ----

  const editingAgent = editingAgentId ? agents.find((a) => a.id === editingAgentId) ?? null : null

  return (
    <div className="flex flex-col h-screen" style={{ background: 'white' }}>
      {toolNotification && (
        <div className="pointer-events-none fixed right-5 top-5 z-[80]">
          <div
            key={toolNotification.id}
            className="min-w-[280px] max-w-[360px] rounded-[18px] border px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-sm"
            style={{
              background:
                toolNotification.tone === 'success'
                  ? 'rgba(240, 253, 244, 0.96)'
                  : toolNotification.tone === 'error'
                    ? 'rgba(254, 242, 242, 0.96)'
                    : 'rgba(248, 250, 252, 0.96)',
              borderColor:
                toolNotification.tone === 'success'
                  ? '#86efac'
                  : toolNotification.tone === 'error'
                    ? '#fca5a5'
                    : '#cbd5e1',
            }}
          >
            <p
              className="text-sm font-bold"
              style={{
                color:
                  toolNotification.tone === 'success'
                    ? '#166534'
                    : toolNotification.tone === 'error'
                      ? '#b91c1c'
                      : '#0f172a',
              }}
            >
              {toolNotification.title}
            </p>
            <p
              className="mt-1 text-sm leading-5"
              style={{
                color:
                  toolNotification.tone === 'success'
                    ? '#166534'
                    : toolNotification.tone === 'error'
                      ? '#991b1b'
                      : '#475569',
              }}
            >
              {toolNotification.body}
            </p>
          </div>
        </div>
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
        <div className="flex-1 flex flex-col overflow-hidden relative">
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
              cashHistory={cashHistory}
              userbaseHistory={userbaseHistory}
              usersPerSecondHistory={usersPerSecondHistory}
              profitPerSecondHistory={profitPerSecondHistory}
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
          <div className="px-4 py-3 absolute bottom-0 left-0 right-0" style={{ background: 'transparent' }}>
            <div className="mx-auto w-full max-w-[720px] flex justify-center">
              <CTOPanel
                collapsed={ctoCollapsed}
                onToggle={() => setCtoCollapsed((c) => !c)}
                report={ctoReport}
                loading={ctoLoading}
                error={ctoError}
                fresh={ctoFresh}
              />
            </div>
          </div>
          {activeTab === 'achievements' && (
            <AchievementsPane
              achievements={achievements}
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

<<<<<<< Updated upstream

      {achievementToasts.length > 0 && (
        <div className="pointer-events-none fixed right-5 top-20 z-[70] flex w-[320px] flex-col gap-2">
          {achievementToasts.map((toast) => (
            <div
              key={toast.key}
              className="rounded-xl px-3 py-3"
              style={{
                border: '1px solid var(--sds-color-text-brand-tertiary,#1fc46a)',
                background: 'rgba(255,255,255,0.96)',
                boxShadow: '0px 8px 24px rgba(0,0,0,0.12)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: 'var(--sds-color-text-brand-tertiary,#1fc46a)',
                  letterSpacing: '0.06em',
                }}
              >
                ACHIEVEMENT UNLOCKED
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-lg leading-none" aria-hidden>{toast.emoji}</span>
                <p
                  style={{
                    fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: 'black',
                  }}
                >
                  {toast.title}
                </p>
              </div>
            </div>
          ))}
=======
      {/* AI CTO Panel — fixed bottom-right, auto-consults only */}
      <CTOPanel
        collapsed={ctoCollapsed}
        onToggle={() => setCtoCollapsed((c) => !c)}
        report={ctoReport}
        loading={ctoLoading}
        error={ctoError}
        fresh={ctoFresh}
      />

      {/* ========= IPO OVERLAY — 3-panel flow ========= */}
      {ipoPanel === 1 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          role="dialog"
          aria-modal="true"
          aria-label="IPO Acquisition"
        >
          <div
            className="w-full max-w-[480px] bg-white p-8 text-center"
            style={{ borderRadius: 20, border: '1px solid #d9d9d9', boxShadow: '0px 8px 32px rgba(0,0,0,0.12)' }}
          >
            <span className="text-6xl" aria-hidden>🎉</span>
            <p
              className="mt-3 uppercase tracking-widest"
              style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 700, color: '#b3b3b3' }}
            >
              Acquisition
            </p>
            <h1
              className="mt-2"
              style={{ fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)', fontSize: 40, fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.8px', color: 'black' }}
            >
              Acquired for ${formatNumber(ipoValuation)}
            </h1>
            <p
              className="mt-3"
              style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 16, fontWeight: 400, lineHeight: 1.5, color: '#1e1e1e' }}
            >
              Congratulations — your AI empire is going public.
            </p>
            <p
              className="mt-2 italic"
              style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: '#b3b3b3' }}
            >
              {ipoFlavorLine}
            </p>
            <button
              type="button"
              onClick={() => setIpoPanel(2)}
              className="mt-6 px-6 cursor-pointer transition-all active:translate-y-[3px] active:shadow-none"
              style={{
                fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                fontSize: 16, fontWeight: 700, color: '#f5f5f5',
                background: '#1fc46a', borderRadius: 8, padding: '12px 24px',
                boxShadow: '0px 4px 0px 0px #00a657',
              }}
            >
              See your stats →
            </button>
          </div>
        </div>
      )}

      {ipoPanel === 2 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          role="dialog"
          aria-modal="true"
          aria-label="IPO Result Card"
        >
          <div
            className="w-full max-w-[480px] bg-white p-6"
            style={{ borderRadius: 20, border: '1px solid #d9d9d9', boxShadow: '0px 8px 32px rgba(0,0,0,0.12)' }}
          >
            <p
              className="uppercase tracking-widest"
              style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 700, color: '#b3b3b3' }}
            >
              Result Card
            </p>
            <h2
              className="mt-2"
              style={{ fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)', fontSize: 24, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.48px', color: 'black' }}
            >
              {ipoCompanyName}
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Valuation', value: `$${formatNumber(ipoValuation)}`, color: '#1fc46a' },
                { label: 'Revenue', value: `$${formatNumber(totalEarned)}`, color: '#3f81ea' },
                { label: 'Users', value: formatNumber(userbase), color: '#8b5cf6' },
                { label: 'Agents', value: String(totalAgentCount), color: '#f97316' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="px-3 py-3"
                  style={{ border: '1px solid #d9d9d9', borderRadius: 8, boxShadow: '0px 2px 0px 0px #cdcdcd' }}
                >
                  <p
                    style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 700, color: '#b3b3b3' }}
                  >
                    {stat.label}
                  </p>
                  <p
                    className="mt-1 tabular-nums"
                    style={{ fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)', fontSize: 20, fontWeight: 700, color: stat.color }}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {agents.some((a) => a.count > 0) && (
              <div
                className="mt-4 px-3 py-3"
                style={{ border: '1px solid #d9d9d9', borderRadius: 8, boxShadow: '0px 2px 0px 0px #cdcdcd' }}
              >
                <p
                  className="mb-2"
                  style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 700, color: '#b3b3b3' }}
                >
                  YOUR TEAM
                </p>
                <div className="flex flex-col gap-1">
                  {agents.filter((a) => a.count > 0).map((agent, idx) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between px-1 py-1.5"
                      style={{ background: idx % 2 === 0 ? '#f5f5f5' : '#e6e6e6', borderRadius: 4 }}
                    >
                      <span
                        style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 500, color: '#1e1e1e' }}
                      >
                        {agent.emoji} {agent.name}
                      </span>
                      <span
                        className="tabular-nums"
                        style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 700, color: '#b3b3b3' }}
                      >
                        x{agent.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="mt-4 flex items-center justify-between px-3 py-3"
              style={{ background: 'rgba(31,196,106,0.06)', border: '1px solid #1fc46a', borderRadius: 8 }}
            >
              <span
                style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 700, color: '#1e1e1e' }}
              >
                🏆 Reputation earned
              </span>
              <span
                className="tabular-nums"
                style={{ fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)', fontSize: 20, fontWeight: 700, color: '#1fc46a' }}
              >
                +{ipoReputationGain}
              </span>
            </div>

            <p
              className="mt-4 text-center"
              style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 400, color: '#b3b3b3' }}
            >
              AI Agent Empire · Bitcamp 2026
            </p>

            <button
              type="button"
              onClick={() => setIpoPanel(3)}
              className="w-full mt-4 cursor-pointer transition-all active:translate-y-[3px] active:shadow-none"
              style={{
                fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                fontSize: 16, fontWeight: 700, color: '#f5f5f5',
                background: '#1fc46a', borderRadius: 8, padding: 12,
                boxShadow: '0px 4px 0px 0px #00a657',
              }}
            >
              Claim reputation and upgrade →
            </button>
          </div>
        </div>
      )}

      {ipoPanel === 3 && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Reputation Shop"
        >
          <div
            className="w-full max-w-[480px] max-h-[90vh] overflow-auto bg-white p-6"
            style={{ borderRadius: 20, border: '1px solid #d9d9d9', boxShadow: '0px 8px 32px rgba(0,0,0,0.12)' }}
          >
            <div className="flex items-center justify-between pb-2 mb-4" style={{ borderBottom: '1px solid #d9d9d9' }}>
              <h2
                style={{ fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)', fontSize: 24, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.48px', color: 'black' }}
              >
                Reputation Shop
              </h2>
              <span
                className="rounded-full px-3 py-1 tabular-nums"
                style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 700, color: '#f5f5f5', background: '#1fc46a' }}
              >
                {formatNumber(reputation)} pts
              </span>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {reputationUpgrades.map((upgrade) => {
                const canBuy = !upgrade.purchased && reputation >= upgrade.cost
                return (
                  <button
                    key={upgrade.id}
                    type="button"
                    onClick={() => buyReputationUpgrade(upgrade.id)}
                    disabled={upgrade.purchased || reputation < upgrade.cost}
                    className="text-left w-full flex items-center justify-between gap-2 px-3 py-3 transition-all"
                    style={{
                      border: upgrade.purchased ? '1px solid #1fc46a' : '1px solid #d9d9d9',
                      borderRadius: 8,
                      boxShadow: upgrade.purchased ? 'none' : '0px 2px 0px 0px #cdcdcd',
                      background: upgrade.purchased ? 'rgba(31,196,106,0.06)' : canBuy ? 'white' : '#f5f5f5',
                      opacity: !upgrade.purchased && !canBuy ? 0.5 : 1,
                      cursor: upgrade.purchased ? 'default' : canBuy ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 700, color: '#1e1e1e' }}
                      >
                        {upgrade.name}
                      </p>
                      <p
                        style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 400, color: '#b3b3b3' }}
                      >
                        {upgrade.description}
                      </p>
                    </div>
                    {upgrade.purchased ? (
                      <span
                        className="shrink-0"
                        style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 12, fontWeight: 700, color: '#1fc46a' }}
                      >
                        ✓ Active
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 tabular-nums whitespace-nowrap"
                        style={{
                          fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                          fontSize: 12, fontWeight: 700,
                          color: canBuy ? '#f5f5f5' : '#b3b3b3',
                          background: canBuy ? '#1fc46a' : '#d9d9d9',
                        }}
                      >
                        {upgrade.cost} pts
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <p
              className="text-center mb-4"
              style={{ fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)', fontSize: 14, fontWeight: 400, lineHeight: 1.5, color: '#b3b3b3' }}
            >
              Your agents, cash, and users will reset.<br />Reputation and upgrades carry over.
            </p>

            <button
              type="button"
              onClick={pivot}
              className="w-full cursor-pointer transition-all active:translate-y-[3px] active:shadow-none"
              style={{
                fontFamily: 'var(--sds-typography-body-font-family, "Nunito", sans-serif)',
                fontSize: 16, fontWeight: 700, color: '#f5f5f5',
                background: '#1fc46a', borderRadius: 8, padding: 12,
                boxShadow: '0px 4px 0px 0px #00a657',
              }}
            >
              🔄 Start New Run
            </button>
          </div>
>>>>>>> Stashed changes
        </div>
      )}
    </div>
  )
}
