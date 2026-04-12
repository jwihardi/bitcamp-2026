'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  INITIAL_MODELS,
  INITIAL_AGENTS,
  FUNDING_STAGES,
  INITIAL_REPUTATION_UPGRADES,
  REVENUE_PER_USER,
} from '../game-config'
import type { Model, Agent, ReputationUpgrade } from '../game-config'
import { GameProvider } from '@/context/GameContext'
import { HeaderView } from '@/components/Header'
import { LeftPanel } from '@/components/LeftPanel'
import { RightPanel } from '@/components/RightPanel'

// ---- copied from page.tsx ----

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
  const [reputationUpgrades] = useState<ReputationUpgrade[]>(INITIAL_REPUTATION_UPGRADES)
  const [tokens, setTokens] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).tokens)
  const [userbase, setUserbase] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).userbase)
  const [agents] = useState<Agent[]>(() => getInitialState(INITIAL_REPUTATION_UPGRADES).agents)
  const [models] = useState<Model[]>(() => getInitialState(INITIAL_REPUTATION_UPGRADES).models)
  const [clickPower, setClickPower] = useState(1)
  const [totalEarned, setTotalEarned] = useState(0)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)

  const gameSpeed = 1

  // ---- reputation bonuses (copied from page.tsx) ----

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

  // ---- derived (copied from page.tsx) ----

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

  // ---- click handler (copied from page.tsx) ----

  const handleClick = useCallback(() => {
    const multiplier = getReputationBonus('clickMultiplier') || 1
    const gained = clickPower * multiplier
    setUserbase((u) => u + gained)
  }, [clickPower, getReputationBonus])

  // ---- game loops (copied from page.tsx) ----

  // User generation loop
  useEffect(() => {
    if (gameSpeed === 0) return
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
    if (gameSpeed === 0) return
    const revenue = getRevenueFromUsers()
    const costs = getTotalOperatingCost()
    const netIncome = revenue - costs

    const interval = setInterval(() => {
      const earned = (netIncome / 10) * gameSpeed
      setTokens((t) => t + earned)
      if (netIncome > 0) setTotalEarned((e) => e + earned)
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
  }, [currentStageIndex, userbase, totalEarned, getRevenueFromUsers, getTotalOperatingCost])

  useEffect(() => {
    advanceStage()
  }, [userbase, totalEarned, currentStageIndex, advanceStage])

  // ---- MoneyPile props ----

  const nextStage = FUNDING_STAGES[currentStageIndex + 1]
  const percentage = nextStage
    ? Math.min(100, (userbase / nextStage.userRequirement) * 100)
    : 100

  const usersPerSecond = getTotalUsersPerSecond()

  const companyName = (() => {
    const firstHired = agents.find((a) => a.count > 0)
    return firstHired ? `${firstHired.name} & Co.` : 'Your Company'
  })()

  return (
    <div className="flex flex-col h-screen" style={{ background: 'white' }}>
      {/* Header reads from idle game state, not GameContext */}
      <HeaderView arr={tokens} users={Math.floor(userbase)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — MoneyPile wired to page.tsx game mechanics */}
        <div className="border-r" style={{ borderColor: '#d9d9d9', width: '360px', flexShrink: 0 }}>
          <LeftPanel
            percentage={percentage}
            userCount={Math.floor(userbase)}
            usersPerSecond={usersPerSecond}
            companyName={companyName}
            onGoldButtonClick={handleClick}
          />
        </div>
        {/* Center pane */}
        <div className="flex-1" />
        {/* Right pane — still uses GameContext for agent/model shop */}
        <GameProvider>
          <RightPanel />
        </GameProvider>
      </div>
    </div>
  )
}
