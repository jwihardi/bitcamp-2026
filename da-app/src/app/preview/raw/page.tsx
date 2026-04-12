'use client'

// Literal-as-possible translation of the Figma Dev Mode output for node 1:277,
// wired up with the game logic from `Idle Game Figma Updated/src/app/App.tsx`.
// Prompt editor modal translated from Figma node 1:302 (file 8fJY4RguNllbzKBEqOlL3i).
//
// Kept: absolute pixel positioning, gradients, borders, shadows, typography.
// Omitted: framer-motion (not installed — use CSS transitions), lucide-react
// (use emoji spans). PromptEditor uses the real /api/evaluate-idle endpoint.

import { useCallback, useEffect, useState } from 'react'
import type { PromptEvaluation } from '@/lib/types'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'
import {
  INITIAL_MODELS,
  INITIAL_AGENTS,
  FUNDING_STAGES,
  INITIAL_MANAGERS,
  INITIAL_REPUTATION_UPGRADES,
  PROMPT_CHALLENGES,
  REVENUE_PER_USER,
} from './game-config'
import type { Model, Agent, Manager, ReputationUpgrade } from './game-config'

// ============ Helpers ============

function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0'
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
  return Math.floor(num).toString()
}

// Call the idle-specific evaluator endpoint. Returns a PromptEvaluation or
// throws on error — caller surfaces the message to the user.
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
    } catch {
      // Keep the HTTP status message if the error body is malformed.
    }
    throw new Error(detail)
  }
  const data = (await response.json()) as PromptEvaluation
  return data
}

// Returns the initial run state based on which reputation upgrades are purchased.
function getInitialState(upgrades: ReputationUpgrade[]) {
  const has = (effect: string) => upgrades.some((u) => u.effect === effect && u.purchased)
  return {
    tokens: has('startingCash') ? 1500 : 0,
    userbase: has('startingUsers') ? 150 : 0,
    agents: INITIAL_AGENTS.map((a) => ({
      ...a,
      promptQuality: has('promptQuality') ? 70 : 50,
    })),
    models: INITIAL_MODELS.map((m) => ({
      ...m,
      unlocked: m.id === 'nimbus_1' || (m.id === 'quanta_s' && has('modelUnlock')),
    })),
  }
}

// ============ Component ============

export default function PreviewRawPage() {
  const [tokens, setTokens] = useState(() => getInitialState(INITIAL_REPUTATION_UPGRADES).tokens)
  const [userbase, setUserbase] = useState(
    () => getInitialState(INITIAL_REPUTATION_UPGRADES).userbase,
  )
  const [agents, setAgents] = useState<Agent[]>(
    () => getInitialState(INITIAL_REPUTATION_UPGRADES).agents,
  )
  const [models, setModels] = useState<Model[]>(
    () => getInitialState(INITIAL_REPUTATION_UPGRADES).models,
  )
  const [clickPower, setClickPower] = useState(1)
  const [totalEarned, setTotalEarned] = useState(0)
  const [currentStageIndex, setCurrentStageIndex] = useState(0)
  const [serviceQuality, setServiceQuality] = useState(100)
  const [editingAgentId, setEditingAgentId] = useState<IdleAgentType | null>(null)

  // New state from reference implementation
  const [gameSpeed, setGameSpeed] = useState<0 | 1 | 2 | 5>(1)
  const [reputation, setReputation] = useState(0)
  const [reputationUpgrades, setReputationUpgrades] = useState<ReputationUpgrade[]>(
    INITIAL_REPUTATION_UPGRADES,
  )
  const [managers, setManagers] = useState<Manager[]>(INITIAL_MANAGERS)
  const [lifetimeUsers, setLifetimeUsers] = useState(0)
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0)
  const [showPivotModal, setShowPivotModal] = useState(false)

  // ---- Reputation bonuses ----

  const getReputationBonus = useCallback(
    (effect: string): number => {
      if (!reputationUpgrades.some((u) => u.effect === effect && u.purchased)) return 0
      switch (effect) {
        case 'clickMultiplier': return 2
        case 'userGeneration':  return 1.25
        case 'costReduction':   return 0.8
        case 'revenueBoost':    return 1.5
        default: return 1
      }
    },
    [reputationUpgrades],
  )

  // ---- Derived ----

  const getCost = (agent: Agent): number =>
    Math.floor(agent.baseCost * Math.pow(agent.multiplier, agent.count))

  const getUsersPerSecond = useCallback(
    (agent: Agent): number => {
      const model = models.find((m) => m.id === agent.selectedModel)
      const qualityBonus = model ? model.qualityMultiplier : 1
      const reputationBonus = getReputationBonus('userGeneration') || 1
      return agent.baseUsersPerSecond * agent.count * qualityBonus * reputationBonus
    },
    [models, getReputationBonus],
  )

  const getTotalUsersPerSecond = useCallback(
    (): number => agents.reduce((sum, a) => sum + getUsersPerSecond(a), 0),
    [agents, getUsersPerSecond],
  )

  const getRevenueFromUsers = useCallback((): number => {
    const reputationBonus = getReputationBonus('revenueBoost') || 1
    return userbase * REVENUE_PER_USER * reputationBonus
  }, [userbase, getReputationBonus])

  const getTokensUsed = (agent: Agent): number => {
    const promptEfficiency = agent.promptQuality / 100
    const tokenMultiplier = 2 - promptEfficiency
    return agent.baseTokensPerTask * tokenMultiplier
  }

  const getOperatingCost = useCallback(
    (agent: Agent): number => {
      const model = models.find((m) => m.id === agent.selectedModel)
      const costPerToken = model ? model.costPerToken : 0.001
      const reputationBonus = getReputationBonus('costReduction') || 1
      return getTokensUsed(agent) * costPerToken * agent.count * reputationBonus
    },
    [models, getReputationBonus],
  )

  const getTotalOperatingCost = useCallback(
    (): number => agents.reduce((sum, a) => sum + getOperatingCost(a), 0),
    [agents, getOperatingCost],
  )

  const getNetIncome = useCallback(
    (): number => getRevenueFromUsers() - getTotalOperatingCost(),
    [getRevenueFromUsers, getTotalOperatingCost],
  )

  const getAgentQuality = useCallback(
    (agent: Agent): number => {
      if (agent.count === 0) return 0
      const model = models.find((m) => m.id === agent.selectedModel)
      const modelQuality = model ? model.qualityMultiplier : 1
      const promptScore = agent.promptQuality * 0.7
      const modelScore = ((modelQuality - 1) / 1.2) * 30
      return Math.min(100, promptScore + modelScore)
    },
    [models],
  )

  const calculateServiceQuality = useCallback((): number => {
    const active = agents.filter((a) => a.count > 0)
    if (active.length === 0) return 100
    const totalWeight = active.reduce((sum, a) => sum + getUsersPerSecond(a), 0)
    if (totalWeight === 0) return 100
    const weighted = active.reduce(
      (sum, a) => sum + getAgentQuality(a) * getUsersPerSecond(a),
      0,
    )
    return Math.max(0, Math.min(100, weighted / totalWeight))
  }, [agents, getUsersPerSecond, getAgentQuality])

  const getUserChurnRate = (quality: number): number => {
    if (quality >= 75) return 0
    if (quality >= 65) return 0.005
    if (quality >= 55) return 0.015
    if (quality >= 45) return 0.04
    if (quality >= 35) return 0.08
    return 0.15
  }

  // ---- Handlers ----

  const handleClick = useCallback(() => {
    const multiplier = getReputationBonus('clickMultiplier') || 1
    const gained = clickPower * multiplier
    setUserbase((u) => u + gained)
    setLifetimeUsers((l) => l + gained)
  }, [clickPower, getReputationBonus])

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

  const buyManager = (managerId: string) => {
    const mgr = managers.find((m) => m.id === managerId)
    if (!mgr || mgr.purchased || tokens < mgr.cost) return
    setTokens((t) => t - mgr.cost)
    setManagers((prev) => prev.map((m) => (m.id === managerId ? { ...m, purchased: true } : m)))
  }

  const buyReputationUpgrade = (upgradeId: string) => {
    const upgrade = reputationUpgrades.find((u) => u.id === upgradeId)
    if (!upgrade || upgrade.purchased || reputation < upgrade.cost) return
    setReputation((r) => r - upgrade.cost)
    setReputationUpgrades((prev) =>
      prev.map((u) => (u.id === upgradeId ? { ...u, purchased: true } : u)),
    )
  }

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
    setServiceQuality(100)
    setClickPower(1)
    setManagers(INITIAL_MANAGERS)
    setLifetimeUsers(0)
    setLifetimeRevenue(0)
    setShowPivotModal(false)
  }, [reputationUpgrades])

  // Called by the PromptEditor modal after a successful /api/evaluate-idle response.
  const applyEvaluation = (
    agentId: IdleAgentType,
    prompt: string,
    evaluation: PromptEvaluation,
  ) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, promptQuality: evaluation.score, lastEvaluation: evaluation, lastPrompt: prompt }
          : a,
      ),
    )
  }

  // ---- Game loops ----

  // User generation + churn
  useEffect(() => {
    if (gameSpeed === 0) return
    const usersPerSecond = getTotalUsersPerSecond()
    const quality = calculateServiceQuality()
    const churnRate = getUserChurnRate(quality)

    const interval = setInterval(() => {
      const gained = (usersPerSecond / 10) * gameSpeed
      const lost = ((userbase * churnRate) / 10) * gameSpeed
      setUserbase((u) => Math.max(0, u + gained - lost))
      setLifetimeUsers((l) => l + Math.max(0, gained - lost))
      setServiceQuality(quality)
    }, 100)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, models, userbase, gameSpeed, reputationUpgrades])

  // Revenue tick
  useEffect(() => {
    if (gameSpeed === 0) return
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
  }, [userbase, agents, models, gameSpeed, reputationUpgrades])

  // Click power scales with total agents
  useEffect(() => {
    const totalAgents = agents.reduce((sum, a) => sum + a.count, 0)
    setClickPower(1 + Math.floor(totalAgents * 0.5))
  }, [agents])

  // Auto-advance funding stage (now checks profitRequirement too)
  const advanceStage = useCallback(() => {
    const next = FUNDING_STAGES[currentStageIndex + 1]
    if (!next) return
    const currentProfit = getNetIncome()
    if (
      userbase >= next.userRequirement &&
      totalEarned >= next.revenueRequirement &&
      currentProfit >= next.profitRequirement
    ) {
      setCurrentStageIndex((i) => i + 1)
      setReputation((r) => r + next.reputationGain)
    }
  }, [currentStageIndex, userbase, totalEarned, getNetIncome])

  useEffect(() => {
    advanceStage()
  }, [userbase, totalEarned, currentStageIndex, advanceStage])

  // ---- Render data ----

  const currentStage = FUNDING_STAGES[currentStageIndex]
  const nextStage = FUNDING_STAGES[currentStageIndex + 1]
  const userProgress = nextStage
    ? Math.min(100, (userbase / nextStage.userRequirement) * 100)
    : 100
  const revenueProgress = nextStage
    ? Math.min(100, (totalEarned / nextStage.revenueRequirement) * 100)
    : 100
  const netIncome = getNetIncome()
  const profitProgress = nextStage && nextStage.profitRequirement > 0
    ? Math.min(100, (netIncome / nextStage.profitRequirement) * 100)
    : 100

  const visibleAgents = agents.filter((a) => tokens >= a.unlockThreshold || a.count > 0)
  const totalAgentCount = agents.reduce((s, a) => s + a.count, 0)
  const unlockedModels = models.filter((m) => m.unlocked)
  const isAtIPO = currentStageIndex === FUNDING_STAGES.length - 1

  const SPEED_OPTIONS: Array<0 | 1 | 2 | 5> = [0, 1, 2, 5]
  const SPEED_LABELS: Record<number, string> = { 0: '⏸ 0×', 1: '▶ 1×', 2: '⏩ 2×', 5: '⏭ 5×' }

  return (
    <div
      className="relative size-full min-h-[1399px] min-w-[2032px] select-none"
      data-name="Idle Game UI Design (Copy)"
      data-node-id="1:277"
      style={{
        backgroundImage:
          'linear-gradient(148.787deg, rgb(240, 249, 255) 0%, rgb(255, 255, 255) 50%, rgb(250, 245, 255) 100%), linear-gradient(90deg, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)',
      }}
    >
      <div
        className="absolute content-stretch flex flex-col items-start left-0 pl-[115.6px] pt-[119.988px] top-0 w-[2031.2px]"
        data-name="Container"
      >
        <div className="relative shrink-0 w-[1800px]">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">

            {/* ========= QUALITY ALERT BANNER ========= */}
            {serviceQuality < 60 && agents.some((a) => a.count > 0) && (
              <div className="absolute -top-[60px] left-0 right-0 z-10 flex items-center gap-[12px] bg-[#fffbeb] border-[2px] border-[#fcd34d] border-solid rounded-[16px] px-[20px] py-[12px]">
                <span className="text-[24px]" aria-hidden>⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] text-[#92400e]">
                    Service Quality Warning — {Math.floor(serviceQuality)}%
                  </p>
                  <p className="font-normal text-[12px] text-[#b45309]">
                    Users are churning at {(getUserChurnRate(serviceQuality) * 100).toFixed(1)}%/s. Improve agent prompt quality to reduce churn.
                  </p>
                </div>
              </div>
            )}

            {/* ========= LEFT COLUMN ========= */}
            <div
              className="absolute content-stretch flex flex-col gap-[16px] items-start left-0 top-0 w-[438px]"
              data-node-id="1:280"
            >
              {/* Click to attract users */}
              <div
                className="bg-white border-4 border-[#dab2ff] border-solid content-stretch flex flex-col h-[300px] items-center pb-[4px] pt-[28px] px-[28px] relative rounded-[24px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)] shrink-0 w-full"
                data-node-id="1:281"
              >
                <p className="font-bold leading-[24px] text-[#364153] text-[16px] text-center">
                  👆 Click to attract users!
                </p>
                <button
                  type="button"
                  onClick={handleClick}
                  aria-label="Attract user"
                  className="mt-[16px] size-[160px] rounded-full border-8 border-white shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundImage:
                      'linear-gradient(135deg, rgb(194, 122, 255) 0%, rgb(251, 100, 182) 50%, rgb(173, 70, 255) 100%)',
                  }}
                >
                  <span className="text-[60px] leading-none text-[#0a0a0a]" aria-hidden>
                    ✨
                  </span>
                </button>
                <p className="mt-[16px] font-bold leading-[28px] text-[#364153] text-[18px] text-center tabular-nums">
                  +{formatNumber(clickPower * (getReputationBonus('clickMultiplier') || 1))} users
                </p>
              </div>

              {/* Stats */}
              <div
                className="bg-white border-[#e5e7eb] border-[1.6px] border-solid content-stretch flex flex-col gap-[16px] items-start pb-[20px] pt-[25.6px] px-[25.6px] relative rounded-[24px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 w-full"
                data-node-id="1:291"
              >
                <div className="relative shrink-0 w-full flex items-center gap-[8px]">
                  <span className="text-[24px] leading-[32px]" aria-hidden>📊</span>
                  <p className="font-extrabold leading-[27px] text-[#1e2939] text-[18px]">Stats</p>
                </div>

                <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                  <StatRow
                    label="User Growth"
                    value={`+${formatNumber(getTotalUsersPerSecond())}/s`}
                    valueClass="text-[#9810fa]"
                  />
                  <StatRow
                    label="Revenue"
                    value={`+$${formatNumber(getRevenueFromUsers())}/s`}
                    valueClass="text-[#00a63e]"
                  />
                  <StatRow
                    label="Token Costs"
                    value={`-$${formatNumber(getTotalOperatingCost())}/s`}
                    valueClass="text-[#f54900]"
                  />
                  <div className="border-[#e5e7eb] border-solid border-t-[1.6px] content-stretch flex items-center justify-between pt-[13.6px] relative shrink-0 w-full">
                    <p className="font-bold leading-[20px] text-[#364153] text-[14px]">Net Profit</p>
                    <p
                      className={`font-bold leading-[20px] text-[14px] tabular-nums ${
                        netIncome >= 0 ? 'text-[#00a63e]' : 'text-[#e7000b]'
                      }`}
                    >
                      {netIncome >= 0 ? '+' : ''}${formatNumber(netIncome)}/s
                    </p>
                  </div>
                  <div className="border-[#e5e7eb] border-solid border-t-[1.6px] content-stretch flex flex-col gap-[8px] items-start pt-[13.6px] relative shrink-0 w-full">
                    <SubStatRow label="Total Earned" value={`$${formatNumber(totalEarned)}`} />
                    <SubStatRow label="Total Agents" value={formatNumber(totalAgentCount)} />
                    {lifetimeUsers > 0 && (
                      <>
                        <div className="border-[#e5e7eb] border-solid border-t-[1.6px] w-full pt-[8px]" />
                        <SubStatRow label="Lifetime Users" value={formatNumber(lifetimeUsers)} />
                        <SubStatRow label="Lifetime Revenue" value={`$${formatNumber(lifetimeRevenue)}`} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Speed Controls */}
              <div
                className="bg-white border-[#e5e7eb] border-[1.6px] border-solid content-stretch flex flex-col gap-[12px] items-start pb-[20px] pt-[25.6px] px-[25.6px] relative rounded-[24px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 w-full"
              >
                <div className="relative shrink-0 w-full flex items-center gap-[8px]">
                  <span className="text-[20px] leading-[28px]" aria-hidden>⚡</span>
                  <p className="font-extrabold leading-[27px] text-[#1e2939] text-[18px]">Game Speed</p>
                </div>
                <div className="flex gap-[8px] w-full">
                  {SPEED_OPTIONS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setGameSpeed(speed)}
                      className={`flex-1 h-[40px] rounded-[12px] font-bold text-[13px] leading-[16px] transition-colors ${
                        gameSpeed === speed
                          ? 'text-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)]'
                          : 'bg-[#f3f4f6] text-[#4a5565] hover:bg-[#e5e7eb]'
                      }`}
                      style={
                        gameSpeed === speed
                          ? { backgroundImage: 'linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(0, 184, 219) 100%)' }
                          : undefined
                      }
                    >
                      {SPEED_LABELS[speed]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Funding Stage */}
              <div
                className="bg-white border-[#e5e7eb] border-[1.6px] border-solid content-stretch flex flex-col gap-[16px] items-start pb-[20px] pt-[25.6px] px-[25.6px] relative rounded-[24px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 w-full"
                data-node-id="1:328"
              >
                <div className="relative shrink-0 w-full flex items-center gap-[8px]">
                  <span className="text-[18px]" aria-hidden>📈</span>
                  <p className="font-extrabold leading-[27px] text-[#1e2939] text-[18px]">
                    Funding Stage
                  </p>
                </div>

                <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                  {FUNDING_STAGES.map((stage, index) => {
                    const isCompleted = index < currentStageIndex
                    const isCurrent = index === currentStageIndex
                    const circleStyle = isCompleted
                      ? { backgroundImage: 'linear-gradient(135deg, rgb(5, 223, 114) 0%, rgb(0, 188, 125) 100%)' }
                      : isCurrent
                        ? { backgroundImage: 'linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(0, 184, 219) 100%)' }
                        : undefined
                    return (
                      <div
                        key={stage.id}
                        className="content-stretch flex gap-[12px] h-[40px] items-center relative shrink-0 w-full"
                      >
                        <div
                          className={
                            isCompleted || isCurrent
                              ? 'relative rounded-full shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 size-[40px]'
                              : 'bg-[#e5e7eb] relative rounded-full shrink-0 size-[40px]'
                          }
                          style={circleStyle}
                        >
                          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center relative size-full">
                            <p
                              className={`font-bold leading-[20px] text-[14px] whitespace-nowrap ${
                                isCompleted || isCurrent ? 'text-white' : 'text-[#99a1af]'
                              }`}
                            >
                              {isCompleted ? '✓' : index + 1}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`font-bold leading-[20px] text-[14px] whitespace-nowrap ${
                            isCompleted || isCurrent ? 'text-[#364153]' : 'text-[#99a1af]'
                          }`}
                        >
                          {stage.name}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {nextStage && (
                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                    {/* Users progress */}
                    <div className="bg-[#faf5ff] border-[#e9d4ff] border-[1.6px] border-solid content-stretch flex flex-col gap-[4px] items-start pb-[10px] pt-[13.6px] px-[13.6px] relative rounded-[16px] shrink-0 w-full">
                      <p className="font-bold leading-[16px] text-[#8200db] text-[12px]">👥 Users</p>
                      <div className="bg-[#e9d4ff] content-stretch flex flex-col h-[8px] items-start overflow-clip relative rounded-full shrink-0 w-full">
                        <div
                          className="h-[8px] rounded-full shrink-0 transition-[width] duration-200"
                          style={{
                            width: `${userProgress}%`,
                            backgroundImage: 'linear-gradient(to right, #c27aff, #f6339a)',
                          }}
                        />
                      </div>
                      <p className="font-normal leading-[16px] text-[#8200db] text-[12px] tabular-nums">
                        {formatNumber(userbase)} / {formatNumber(nextStage.userRequirement)}
                      </p>
                    </div>

                    {/* Revenue progress */}
                    <div className="bg-[#f0fdf4] border-[#b9f8cf] border-[1.6px] border-solid content-stretch flex flex-col gap-[4px] items-start pb-[10px] pt-[13.6px] px-[13.6px] relative rounded-[16px] shrink-0 w-full">
                      <p className="font-bold leading-[16px] text-[#008236] text-[12px]">💰 Revenue</p>
                      <div className="bg-[#b9f8cf] content-stretch flex flex-col h-[8px] items-start overflow-clip relative rounded-full shrink-0 w-full">
                        <div
                          className="h-[8px] rounded-full shrink-0 transition-[width] duration-200"
                          style={{
                            width: `${revenueProgress}%`,
                            backgroundImage: 'linear-gradient(to right, #05df72, #00bc7d)',
                          }}
                        />
                      </div>
                      <p className="font-normal leading-[16px] text-[#008236] text-[12px] tabular-nums">
                        ${formatNumber(totalEarned)} / ${formatNumber(nextStage.revenueRequirement)}
                      </p>
                    </div>

                    {/* Profit/s progress (new) */}
                    {nextStage.profitRequirement > 0 && (
                      <div className="bg-[#eff6ff] border-[#bfdbfe] border-[1.6px] border-solid content-stretch flex flex-col gap-[4px] items-start pb-[10px] pt-[13.6px] px-[13.6px] relative rounded-[16px] shrink-0 w-full">
                        <p className="font-bold leading-[16px] text-[#1d4ed8] text-[12px]">📈 Profit/s</p>
                        <div className="bg-[#bfdbfe] content-stretch flex flex-col h-[8px] items-start overflow-clip relative rounded-full shrink-0 w-full">
                          <div
                            className="h-[8px] rounded-full shrink-0 transition-[width] duration-200"
                            style={{
                              width: `${Math.max(0, profitProgress)}%`,
                              backgroundImage: 'linear-gradient(to right, #3b82f6, #6366f1)',
                            }}
                          />
                        </div>
                        <p className="font-normal leading-[16px] text-[#1d4ed8] text-[12px] tabular-nums">
                          ${formatNumber(netIncome)}/s / ${formatNumber(nextStage.profitRequirement)}/s
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pivot button — shown only at IPO */}
                {isAtIPO && (
                  <button
                    type="button"
                    onClick={() => setShowPivotModal(true)}
                    className="w-full h-[44px] rounded-[16px] font-bold text-[14px] text-white shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5 cursor-pointer"
                    style={{ backgroundImage: 'linear-gradient(to right, #f97316, #ef4444)' }}
                  >
                    🔄 Pivot &amp; Prestige
                  </button>
                )}
              </div>

              {/* Reputation Upgrades — visible when reputation > 0 */}
              {reputation > 0 && (
                <div className="bg-white border-[#e5e7eb] border-[1.6px] border-solid content-stretch flex flex-col gap-[12px] items-start pb-[20px] pt-[25.6px] px-[25.6px] relative rounded-[24px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 w-full">
                  <div className="relative shrink-0 w-full flex items-center justify-between gap-[8px]">
                    <div className="flex items-center gap-[8px]">
                      <span className="text-[20px] leading-[28px]" aria-hidden>🏆</span>
                      <p className="font-extrabold leading-[27px] text-[#1e2939] text-[18px]">
                        Reputation Shop
                      </p>
                    </div>
                    <div
                      className="rounded-full px-[10px] py-[3px]"
                      style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #f97316)' }}
                    >
                      <p className="font-bold text-[12px] text-white tabular-nums">{formatNumber(reputation)} pts</p>
                    </div>
                  </div>

                  <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full">
                    {reputationUpgrades.map((upgrade) => (
                      <button
                        key={upgrade.id}
                        type="button"
                        onClick={() => buyReputationUpgrade(upgrade.id)}
                        disabled={upgrade.purchased || reputation < upgrade.cost}
                        className={`text-left w-full border-[1.6px] border-solid rounded-[16px] px-[12px] py-[10px] transition-all ${
                          upgrade.purchased
                            ? 'bg-[#f0fdf4] border-[#86efac] cursor-default'
                            : reputation >= upgrade.cost
                              ? 'bg-white border-[#dab2ff] hover:-translate-y-0.5 cursor-pointer shadow-[0px_4px_6px_0px_rgba(0,0,0,0.05)]'
                              : 'bg-[#f9fafb] border-[#e5e7eb] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-[8px]">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[13px] text-[#1e2939] leading-[18px]">
                              {upgrade.name}
                            </p>
                            <p className="font-normal text-[11px] text-[#6a7282] leading-[16px]">
                              {upgrade.description}
                            </p>
                          </div>
                          {upgrade.purchased ? (
                            <span className="font-bold text-[11px] text-[#00a63e] shrink-0">✓ Active</span>
                          ) : (
                            <div
                              className="rounded-full px-[8px] py-[2px] shrink-0"
                              style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #f97316)' }}
                            >
                              <p className="font-bold text-[11px] text-white tabular-nums whitespace-nowrap">
                                {upgrade.cost} pts
                              </p>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ========= MIDDLE COLUMN — AI Agents ========= */}
            <div
              className="absolute content-stretch flex flex-col gap-[12px] items-start left-[454px] top-0 w-[892px]"
              data-node-id="1:385"
            >
              <div className="h-[31.988px] relative shrink-0 w-full">
                <span
                  className="absolute left-0 top-[3.99px] size-[24px] flex items-center justify-center text-[20px]"
                  aria-hidden
                >
                  💼
                </span>
                <p className="absolute font-extrabold leading-[32px] left-[32px] text-[#1e2939] text-[24px] top-[-2px] whitespace-nowrap">
                  AI Agents
                </p>
              </div>

              {visibleAgents.map((agent) => {
                const cost = getCost(agent)
                const canAfford = tokens >= cost
                const ups = getUsersPerSecond(agent)
                const quality = getAgentQuality(agent)
                const mgr = managers.find((m) => m.agentId === agent.id)
                const hasManager = mgr?.purchased ?? false
                const canBuyManager = mgr && !mgr.purchased && agent.count >= 10

                return (
                  <div
                    key={agent.id}
                    className="bg-white border-[#e5e7eb] border-[1.6px] border-solid content-stretch flex flex-col items-start pb-[17.6px] pt-[17.6px] px-[17.6px] relative rounded-[24px] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)] shrink-0 w-full transition-shadow hover:shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]"
                  >
                    <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full">
                      {/* Icon */}
                      <div
                        className="relative rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 size-[64px] flex items-center justify-center"
                        style={{ backgroundImage: agent.iconGrad }}
                      >
                        <span className="text-[30px] leading-[36px] text-[#0a0a0a]" aria-hidden>
                          {agent.emoji}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[8px]">
                          <p className="font-bold leading-[27px] text-[#1e2939] text-[18px] whitespace-nowrap">
                            {agent.name}
                          </p>
                          {hasManager && (
                            <span className="font-bold text-[11px] text-white px-[8px] py-[2px] rounded-full" style={{ backgroundImage: 'linear-gradient(to right, #8b5cf6, #ec4899)' }}>
                              AUTO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-[12px] text-[14px] text-[#4a5565]">
                          <span className="font-bold tabular-nums">×{agent.count}</span>
                          {agent.count > 0 && (
                            <>
                              <span className="text-[#9810fa] font-bold tabular-nums">
                                +{formatNumber(ups)}/s
                              </span>
                              <span
                                className={`font-bold tabular-nums ${
                                  quality >= 75
                                    ? 'text-[#00a63e]'
                                    : quality >= 55
                                      ? 'text-[#d08700]'
                                      : 'text-[#f54900]'
                                }`}
                              >
                                {Math.floor(quality)}%
                              </span>
                            </>
                          )}
                        </div>

                        {/* Prompt button + model selector row */}
                        {agent.count > 0 && (
                          <div className="mt-[8px] flex items-center gap-[8px] flex-wrap">
                            <button
                              type="button"
                              onClick={() => setEditingAgentId(agent.id)}
                              className={`h-[31.188px] px-[13.6px] rounded-[16px] border-[1.6px] border-solid font-bold text-[12px] leading-[16px] transition-colors ${
                                agent.promptQuality < 60
                                  ? 'bg-[#fff7ed] border-[#fed7aa] text-[#9a3412] hover:bg-[#ffedd5]'
                                  : 'bg-[#faf5ff] border-[#e9d4ff] text-[#8200db] hover:bg-[#f3e8ff]'
                              }`}
                            >
                              📝 Prompt ({Math.floor(agent.promptQuality)}%)
                            </button>

                            {/* Per-agent model selector */}
                            {unlockedModels.length > 1 && (
                              <select
                                value={agent.selectedModel}
                                onChange={(e) => changeAgentModel(agent.id, e.target.value)}
                                className="h-[31.188px] px-[10px] rounded-[16px] border-[1.6px] border-[#e9d4ff] border-solid bg-[#faf5ff] text-[#8200db] font-bold text-[12px] leading-[16px] cursor-pointer focus:outline-none focus:border-[#c27aff]"
                              >
                                {unlockedModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                        {/* Manager buy button */}
                        {canBuyManager && mgr && (
                          <div className="mt-[8px]">
                            <button
                              type="button"
                              onClick={() => buyManager(mgr.id)}
                              disabled={tokens < mgr.cost}
                              className={`h-[31.188px] px-[13.6px] rounded-[16px] font-bold text-[12px] leading-[16px] text-white transition-transform ${
                                tokens >= mgr.cost ? 'hover:-translate-y-0.5 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                              }`}
                              style={{ backgroundImage: 'linear-gradient(to right, #8b5cf6, #ec4899)' }}
                            >
                              👔 Hire {mgr.name} (${formatNumber(mgr.cost)})
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Buy Button */}
                      <button
                        type="button"
                        onClick={() => buyAgent(agent.id)}
                        disabled={!canAfford}
                        className={`shrink-0 w-[120px] h-[67.988px] rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-transform flex flex-col items-center justify-center gap-[2px] ${
                          canAfford
                            ? 'cursor-pointer hover:-translate-y-0.5'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                        style={{
                          backgroundImage: canAfford
                            ? agent.buttonGrad
                            : 'linear-gradient(to right, #d1d5db, #9ca3af)',
                        }}
                      >
                        <span className="font-bold leading-[28px] text-[18px] text-center text-white tabular-nums">
                          ${formatNumber(cost)}
                        </span>
                        <span className="font-bold leading-[16px] text-[12px] text-center text-white opacity-90 uppercase tracking-wide">
                          Buy
                        </span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ========= RIGHT COLUMN — AI Models ========= */}
            <div
              className="absolute content-stretch flex flex-col gap-[12px] items-start left-[1362px] top-0 w-[438px]"
              data-node-id="1:427"
            >
              <div className="h-[27px] relative shrink-0 w-full">
                <span
                  className="absolute left-0 top-[3.5px] size-[20px] flex items-center justify-center text-[16px]"
                  aria-hidden
                >
                  🧠
                </span>
                <p className="absolute font-extrabold leading-[27px] left-[28px] text-[#1e2939] text-[18px] top-[-1.2px] whitespace-nowrap">
                  AI Models
                </p>
              </div>

              <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
                {models.map((model) => {
                  const canAfford = tokens >= model.unlockCost
                  const ownedStyle = {
                    backgroundImage:
                      'linear-gradient(170.259deg, rgb(240, 253, 244) 0%, rgb(236, 253, 245) 100%)',
                  } as const
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => unlockModel(model.id)}
                      disabled={model.unlocked || !canAfford}
                      className={`text-left border-[1.6px] border-solid content-stretch flex flex-col items-start pb-[17.6px] pt-[17.6px] px-[17.6px] relative rounded-[24px] shrink-0 w-full transition-all ${
                        model.unlocked
                          ? 'border-[#7bf1a8] shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1),0px_2px_4px_0px_rgba(0,0,0,0.1)] cursor-default'
                          : canAfford
                            ? 'bg-white border-[#dab2ff] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 cursor-pointer'
                            : 'bg-[#f9fafb] border-[#e5e7eb] opacity-50 cursor-not-allowed'
                      }`}
                      style={model.unlocked ? ownedStyle : undefined}
                    >
                      <div className="content-stretch flex gap-[12px] items-center relative shrink-0 w-full">
                        <span className="text-[30px] leading-[36px] shrink-0" aria-hidden>🧠</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold leading-[20px] text-[#1e2939] text-[14px] whitespace-nowrap">
                            {model.name}
                          </p>
                          <div className="flex items-center gap-[8px] mt-[4px]">
                            <span className="font-normal leading-[16px] text-[#4a5565] text-[12px] whitespace-nowrap">
                              ${model.costPerToken}/tok
                            </span>
                            <span className="font-bold leading-[16px] text-[#9810fa] text-[12px] whitespace-nowrap">
                              {model.qualityMultiplier}×
                            </span>
                          </div>
                        </div>
                        {model.unlocked ? (
                          <div className="bg-[#05df72] relative rounded-full shrink-0 px-[8px] py-[4px]">
                            <p className="font-bold leading-[16px] text-[12px] text-white whitespace-nowrap">✓</p>
                          </div>
                        ) : (
                          <div className="bg-[#f3e8ff] border-[#dab2ff] border-[0.8px] border-solid relative rounded-full shrink-0 px-[8px] py-[4px]">
                            <p className="font-bold leading-[16px] text-[#8200db] text-[12px] whitespace-nowrap tabular-nums">
                              ${formatNumber(model.unlockCost)}
                            </p>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========= PROMPT EDITOR MODAL ========= */}
      {editingAgentId && (() => {
        const editing = agents.find((a) => a.id === editingAgentId)
        if (!editing) return null
        return (
          <PromptEditorModal
            agent={editing}
            stage={currentStage.name}
            users={Math.floor(userbase)}
            revenue={Math.floor(totalEarned)}
            agentCount={totalAgentCount}
            onClose={() => setEditingAgentId(null)}
            onEvaluated={(prompt, evaluation) =>
              applyEvaluation(editing.id, prompt, evaluation)
            }
          />
        )
      })()}

      {/* ========= PIVOT MODAL ========= */}
      {showPivotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-sm p-4"
          onClick={() => setShowPivotModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pivot and Prestige"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-4 border-[#fed7aa] border-solid rounded-[24px] shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] w-full max-w-[480px] p-[36px]"
          >
            <div className="flex items-center gap-[12px] mb-[24px]">
              <span className="text-[40px] leading-[40px]" aria-hidden>🔄</span>
              <div>
                <p className="font-extrabold text-[24px] text-[#1e2939] leading-[32px]">Pivot &amp; Prestige</p>
                <p className="font-normal text-[14px] text-[#4a5565] leading-[20px]">Reset your run and carry over reputation</p>
              </div>
            </div>

            <div className="bg-[#fff7ed] border-[1.6px] border-[#fed7aa] border-solid rounded-[16px] px-[20px] py-[16px] mb-[24px] flex flex-col gap-[8px]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[14px] text-[#92400e]">Reputation gained</span>
                <span className="font-extrabold text-[16px] text-[#f97316] tabular-nums">
                  +{FUNDING_STAGES[FUNDING_STAGES.length - 1].reputationGain} pts
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-normal text-[13px] text-[#b45309]">Lifetime users</span>
                <span className="font-bold text-[13px] text-[#92400e] tabular-nums">{formatNumber(lifetimeUsers)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-normal text-[13px] text-[#b45309]">Lifetime revenue</span>
                <span className="font-bold text-[13px] text-[#92400e] tabular-nums">${formatNumber(lifetimeRevenue)}</span>
              </div>
            </div>

            <p className="font-normal text-[13px] text-[#6a7282] leading-[20px] mb-[24px]">
              Your agents, cash, and users will reset. Reputation points and purchased upgrades carry over to your next run.
            </p>

            <div className="flex gap-[12px]">
              <button
                type="button"
                onClick={() => setShowPivotModal(false)}
                className="flex-1 h-[44px] rounded-[16px] bg-[#f3f4f6] text-[#4a5565] font-bold text-[14px] hover:bg-[#e5e7eb] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={pivot}
                className="flex-1 h-[44px] rounded-[16px] font-bold text-[14px] text-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5 cursor-pointer"
                style={{ backgroundImage: 'linear-gradient(to right, #f97316, #ef4444)' }}
              >
                Confirm Pivot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========= TOP HEADER BAR ========= */}
      <div
        className="absolute bg-[rgba(255,255,255,0.9)] border-[#05df72] border-b-4 border-solid content-stretch flex flex-col h-[95.988px] items-start left-0 pb-[4px] pt-[16px] px-[391.6px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] top-0 w-[2031.2px] backdrop-blur-lg"
        data-node-id="1:507"
      >
        <div className="h-[59.987px] relative shrink-0 w-full">
          {/* Logo + title + stage pill + reputation badge */}
          <div className="absolute content-stretch flex gap-[12px] h-[55.975px] items-center left-0 top-[2px]">
            <span className="text-[48px] leading-[48px]" aria-hidden>🤖</span>
            <div className="flex flex-col gap-[4px]">
              <p className="font-extrabold leading-[32px] text-[#1e2939] text-[24px] whitespace-nowrap">
                AI Agent Empire
              </p>
              <div className="flex items-center gap-[8px]">
                <div
                  className="rounded-full px-[8px] py-[2px] w-fit"
                  style={{ backgroundImage: 'linear-gradient(to right, #05df72, #00bc7d)' }}
                >
                  <p className="font-bold leading-[16px] text-[12px] text-white whitespace-nowrap">
                    {currentStage.name}
                  </p>
                </div>
                {reputation > 0 && (
                  <div
                    className="rounded-full px-[8px] py-[2px] w-fit"
                    style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #f97316)' }}
                  >
                    <p className="font-bold leading-[16px] text-[12px] text-white whitespace-nowrap">
                      🏆 {formatNumber(reputation)} rep
                    </p>
                  </div>
                )}
                {gameSpeed === 0 && (
                  <div className="rounded-full px-[8px] py-[2px] w-fit bg-[#f3f4f6] border-[1px] border-[#e5e7eb]">
                    <p className="font-bold leading-[16px] text-[12px] text-[#6a7282] whitespace-nowrap">⏸ Paused</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Header stats */}
          <div className="absolute h-[59.987px] left-[925.24px] top-0 flex gap-[8px]">
            <HeaderStat
              icon="💵"
              label="Cash"
              value={`$${formatNumber(tokens)}`}
              gradient="linear-gradient(150.499deg, rgb(5, 223, 114) 0%, rgb(0, 188, 125) 100%)"
            />
            <HeaderStat
              icon="👥"
              label="Users"
              value={formatNumber(userbase)}
              gradient="linear-gradient(145.982deg, rgb(194, 122, 255) 0%, rgb(246, 51, 154) 100%)"
            />
            <HeaderStat
              icon="⭐"
              label="Quality"
              value={`${Math.floor(serviceQuality)}%`}
              gradient="linear-gradient(151.797deg, rgb(81, 162, 255) 0%, rgb(0, 184, 219) 100%)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ Small sub-components ============

function StatRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass: string
}) {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-between relative shrink-0 w-full">
      <p className="font-normal leading-[20px] text-[#4a5565] text-[14px]">{label}</p>
      <p className={`font-bold leading-[20px] text-[14px] tabular-nums ${valueClass}`}>{value}</p>
    </div>
  )
}

function SubStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="content-stretch flex h-[20px] items-center justify-between relative shrink-0 w-full">
      <p className="font-normal leading-[20px] text-[#6a7282] text-[14px]">{label}</p>
      <p className="font-normal leading-[20px] text-[#6a7282] text-[14px] tabular-nums">{value}</p>
    </div>
  )
}

function HeaderStat({
  icon,
  label,
  value,
  gradient,
}: {
  icon: string
  label: string
  value: string
  gradient: string
}) {
  return (
    <div
      className="content-stretch flex flex-col h-[59.987px] items-start pt-[8px] px-[16px] rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] min-w-[106px]"
      style={{ backgroundImage: gradient }}
    >
      <div className="content-stretch flex gap-[8px] h-[43.987px] items-center relative shrink-0 w-full">
        <span className="shrink-0 size-[20px] flex items-center justify-center text-[16px] text-white" aria-hidden>
          {icon}
        </span>
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="font-normal leading-[16px] text-[12px] text-white opacity-90">{label}</p>
          <p className="font-bold leading-[28px] text-[20px] text-white tabular-nums whitespace-nowrap">
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============ Prompt Editor Modal ============
// Translated from Figma node 1:302 (file 8fJY4RguNllbzKBEqOlL3i). The modal
// card is 672px wide, absolute-positioned pixel values preserved. The
// "Analyze Prompt" button calls /api/evaluate-idle — the idle-game variant
// of the evaluator — and uses the returned score as the agent's new promptQuality.
function PromptEditorModal({
  agent,
  stage,
  users,
  revenue,
  agentCount,
  onClose,
  onEvaluated,
}: {
  agent: Agent
  stage: string
  users: number
  revenue: number
  agentCount: number
  onClose: () => void
  onEvaluated: (prompt: string, evaluation: PromptEvaluation) => void
}) {
  const [prompt, setPrompt] = useState(agent.lastPrompt)
  const [result, setResult] = useState<PromptEvaluation | null>(agent.lastEvaluation)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Challenge is picked once per modal open (not on every render).
  const [challenge] = useState(
    () => PROMPT_CHALLENGES[Math.floor(Math.random() * PROMPT_CHALLENGES.length)],
  )

  const tokenEstimate = Math.floor(prompt.length * 0.75)

  const analyze = async () => {
    if (!prompt.trim()) {
      setError('Write a prompt first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const evaluation = await evaluateIdlePrompt(prompt, agent.id, {
        stage,
        users,
        revenue,
        agentCount,
      })
      setResult(evaluation)
      onEvaluated(prompt, evaluation)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  const displayQuality = result?.score ?? agent.promptQuality

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)] backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Prompt editor for ${agent.name}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border-4 border-[#dab2ff] border-solid rounded-[24px] shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] w-full max-w-[672px] max-h-[90vh] overflow-auto p-[36px]"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-[24px]">
          <div className="flex flex-col gap-[4px]">
            <div className="flex items-center gap-[8px]">
              <span className="text-[40px] leading-[40px]" aria-hidden>✍️</span>
              <p className="font-extrabold leading-[36px] text-[#1e2939] text-[28px]">
                Prompt Engineering
              </p>
            </div>
            <p className="font-normal leading-[24px] text-[#4a5565] text-[16px] pl-[48px]">
              {agent.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prompt editor"
            className="size-[40px] rounded-full bg-[#e5e7eb] hover:bg-[#d1d5db] flex items-center justify-center transition-colors text-[#364153] text-[20px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Challenge card */}
        <div
          className="border-[2px] border-[#bfdbfe] border-solid rounded-[24px] px-[21.6px] py-[21.6px] mb-[24px]"
          style={{ backgroundImage: 'linear-gradient(to right, #eff6ff, #faf5ff)' }}
        >
          <div className="flex items-start gap-[12px]">
            <span className="text-[30px] leading-[36px] shrink-0" aria-hidden>💡</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-[24px] text-[#1e2939] text-[16px] mb-[4px]">
                Challenge: {challenge.task}
              </p>
              <p className="font-normal leading-[20px] text-[#4a5565] text-[14px] mb-[12px]">
                Write an efficient prompt. Good prompts use fewer tokens and get better results!
              </p>
              <div className="flex flex-wrap gap-[8px]">
                {challenge.hints.map((hint) => (
                  <span
                    key={hint}
                    className="font-bold text-[12px] leading-[16px] px-[12px] py-[6px] rounded-full bg-white border-[2px] border-[#bfdbfe] border-solid text-[#1d4ed8]"
                  >
                    {hint}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Prompt label + token counter */}
        <div className="flex items-center justify-between mb-[8px]">
          <p className="font-bold leading-[24px] text-[#1e2939] text-[16px]">Your Prompt</p>
          <p className="font-normal leading-[16px] text-[#6a7282] text-[12px] tabular-nums">
            ~{tokenEstimate} tokens
          </p>
        </div>

        {/* Textarea */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Write your prompt here..."
          className="w-full h-[128px] bg-white border-[2px] border-[#d1d5db] border-solid rounded-[16px] p-[16px] text-[#1e2939] text-[14px] leading-[20px] placeholder:text-[#9ca3af] focus:border-[#c27aff] focus:outline-none resize-none font-medium"
        />

        {/* Error / result feedback */}
        {error && (
          <p className="mt-[12px] text-[#b91c1c] text-[13px] font-bold">{error}</p>
        )}
        {result && !error && (
          <div
            className={`mt-[12px] border-[2px] border-solid rounded-[16px] p-[16px] ${
              result.score >= 70
                ? 'bg-[#f0fdf4] border-[#86efac]'
                : result.score >= 50
                  ? 'bg-[#eff6ff] border-[#bfdbfe]'
                  : 'bg-[#fff7ed] border-[#fed7aa]'
            }`}
          >
            <div className="flex items-center justify-between mb-[8px]">
              <p className="font-bold text-[14px] text-[#1e2939]">Evaluation Result</p>
              <span
                className={`font-extrabold text-[20px] tabular-nums ${
                  result.score >= 70
                    ? 'text-[#00a63e]'
                    : result.score >= 50
                      ? 'text-[#1d4ed8]'
                      : 'text-[#f97316]'
                }`}
              >
                {result.score}/100
              </span>
            </div>
            {result.explanation && (
              <p className="font-normal text-[13px] text-[#4a5565] leading-[20px] mb-[10px]">
                {result.explanation}
              </p>
            )}
            <div className="flex gap-[16px] flex-wrap">
              <span className="font-bold text-[12px] text-[#6a7282]">
                ⚡ {formatNumber(result.estimatedTokensPerTick)} tok/tick
              </span>
              <span className="font-bold text-[12px] text-[#6a7282]">
                💰 ${formatNumber(result.estimatedRevenuePerTick)}/tick
              </span>
              <span className="font-bold text-[12px] text-[#6a7282]">
                📊 {result.tokenEfficiency.toFixed(2)} $/tok
              </span>
            </div>
          </div>
        )}

        {/* Current Prompt Quality */}
        <div className="mt-[20px] mb-[20px]">
          <div className="flex items-center justify-between mb-[6px]">
            <p className="font-bold text-[13px] text-[#1e2939]">Current Prompt Quality</p>
            <p className="font-bold text-[13px] text-[#1e2939] tabular-nums">{Math.floor(displayQuality)}%</p>
          </div>
          <div className="bg-[#e5e7eb] h-[8px] rounded-full overflow-clip">
            <div
              className="h-[8px] rounded-full transition-[width] duration-300"
              style={{
                width: `${displayQuality}%`,
                backgroundImage: 'linear-gradient(to right, #05df72, #00bc7d)',
              }}
            />
          </div>
        </div>

        {/* Analyze button */}
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className={`w-full h-[52px] rounded-[16px] font-bold text-[16px] text-white shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-transform ${
            loading ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 cursor-pointer'
          }`}
          style={{ backgroundImage: 'linear-gradient(to right, #c27aff, #f6339a)' }}
        >
          {loading ? '⏳ Analyzing...' : '🔍 Analyze Prompt'}
        </button>
      </div>
    </div>
  )
}
