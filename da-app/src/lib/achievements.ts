export type AchievementMetrics = {
  tokens: number
  userbase: number
  totalEarned: number
  lifetimeRevenue: number
  lifetimeCosts: number
  usersPerSecond: number
  profitPerSecond: number
  elapsedGameSeconds: number
  totalAgents: number
  unlockedModels: number
  totalModels: number
  purchasedUpgrades: number
  totalUpgrades: number
  maxPromptQuality: number
  currentStageIndex: number
}

export type Achievement = {
  id: string
  title: string
  description: string
  emoji: string
  color: string
  progressValue: number
  targetValue: number
  formatter?: (value: number) => string
  unlocked: boolean
}

export function formatCompact(num: number): string {
  if (!Number.isFinite(num)) return '0'
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return Math.floor(num).toString()
}

export function formatMoney(num: number): string {
  return `$${formatCompact(num)}`
}

export function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function withUnlocked(achievement: Omit<Achievement, 'unlocked'>): Achievement {
  return {
    ...achievement,
    unlocked: achievement.progressValue >= achievement.targetValue,
  }
}

export function buildAchievements(metrics: AchievementMetrics): Achievement[] {
  return [
    withUnlocked({
      id: 'earn-10k',
      title: 'First $10K',
      description: 'Reach $10K all-time earnings in this run.',
      emoji: '💸',
      color: '#65a30d',
      progressValue: metrics.totalEarned,
      targetValue: 10_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'earn-100k',
      title: 'First $100K',
      description: 'Reach $100K all-time earnings in this run.',
      emoji: '💵',
      color: '#16a34a',
      progressValue: metrics.totalEarned,
      targetValue: 100_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'earn-1m',
      title: 'Millionaire Run',
      description: 'Reach $1M all-time earnings in this run.',
      emoji: '🪙',
      color: '#059669',
      progressValue: metrics.totalEarned,
      targetValue: 1_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'earn-10m',
      title: 'Eight Figure Operator',
      description: 'Reach $10M all-time earnings in this run.',
      emoji: '💰',
      color: '#0d9488',
      progressValue: metrics.totalEarned,
      targetValue: 10_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'earn-25m',
      title: 'Quarter-Hundred Million',
      description: 'Reach $25M all-time earnings in this run.',
      emoji: '🪄',
      color: '#0f766e',
      progressValue: metrics.totalEarned,
      targetValue: 25_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'earn-50m',
      title: 'Fifty Million Club',
      description: 'Reach $50M all-time earnings in this run.',
      emoji: '👑',
      color: '#134e4a',
      progressValue: metrics.totalEarned,
      targetValue: 50_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'cash-50k',
      title: 'Cash Buffer',
      description: 'Hold $50K in the bank at once.',
      emoji: '💳',
      color: '#06b6d4',
      progressValue: metrics.tokens,
      targetValue: 50_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'cash-250k',
      title: 'Treasury Builder',
      description: 'Hold $250K in the bank at once.',
      emoji: '💼',
      color: '#0891b2',
      progressValue: metrics.tokens,
      targetValue: 250_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'cash-mountain',
      title: 'Cash Mountain',
      description: 'Hold $1M in the bank at once.',
      emoji: '🏦',
      color: '#0ea5a4',
      progressValue: metrics.tokens,
      targetValue: 1_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'users-10k',
      title: 'Crowd Starter',
      description: 'Grow to 10,000 users.',
      emoji: '🧲',
      color: '#60a5fa',
      progressValue: metrics.userbase,
      targetValue: 10_000,
      formatter: formatCompact,
    }),
    withUnlocked({
      id: 'users-100k',
      title: 'Viral Breakout',
      description: 'Grow to 100,000 users.',
      emoji: '🌐',
      color: '#3b82f6',
      progressValue: metrics.userbase,
      targetValue: 100_000,
      formatter: formatCompact,
    }),
    withUnlocked({
      id: 'user-million',
      title: 'Mass Adoption',
      description: 'Grow to 1,000,000 users.',
      emoji: '🌎',
      color: '#3f81ea',
      progressValue: metrics.userbase,
      targetValue: 1_000_000,
      formatter: formatCompact,
    }),
    withUnlocked({
      id: 'stage-series-a',
      title: 'Round Chaser',
      description: 'Reach the Series A funding stage.',
      emoji: '📣',
      color: '#a78bfa',
      progressValue: metrics.currentStageIndex,
      targetValue: 3,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'stage-series-c',
      title: 'Late Stage Builder',
      description: 'Reach the Series C funding stage.',
      emoji: '🏗️',
      color: '#8b5cf6',
      progressValue: metrics.currentStageIndex,
      targetValue: 5,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'stage-ipo',
      title: 'Public Dream',
      description: 'Reach the IPO funding stage.',
      emoji: '🚀',
      color: '#8b5cf6',
      progressValue: metrics.currentStageIndex,
      targetValue: 6,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'models-2',
      title: 'Model Shopper',
      description: 'Unlock 2 models in the shop.',
      emoji: '🛒',
      color: '#fb923c',
      progressValue: metrics.unlockedModels,
      targetValue: Math.min(2, metrics.totalModels),
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'models-4',
      title: 'Model Strategist',
      description: 'Unlock 4 models in the shop.',
      emoji: '🧠',
      color: '#f97316',
      progressValue: metrics.unlockedModels,
      targetValue: Math.min(4, metrics.totalModels),
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'all-models',
      title: 'Model Collector',
      description: 'Unlock every available model in the shop.',
      emoji: '🧩',
      color: '#f97316',
      progressValue: metrics.unlockedModels,
      targetValue: metrics.totalModels,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'upgrades-2',
      title: 'Upgrade Curious',
      description: 'Purchase 2 reputation upgrades.',
      emoji: '🧪',
      color: '#fb7185',
      progressValue: metrics.purchasedUpgrades,
      targetValue: Math.min(2, metrics.totalUpgrades),
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'upgrades-5',
      title: 'Upgrade Investor',
      description: 'Purchase 5 reputation upgrades.',
      emoji: '📚',
      color: '#f43f5e',
      progressValue: metrics.purchasedUpgrades,
      targetValue: Math.min(5, metrics.totalUpgrades),
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'all-upgrades',
      title: 'Prestige Scholar',
      description: 'Purchase every reputation upgrade.',
      emoji: '🏆',
      color: '#ef4444',
      progressValue: metrics.purchasedUpgrades,
      targetValue: metrics.totalUpgrades,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'agents-10',
      title: 'First Team',
      description: 'Own 10 agents across all types.',
      emoji: '👥',
      color: '#2dd4bf',
      progressValue: metrics.totalAgents,
      targetValue: 10,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'agents-25',
      title: 'Scaling Team',
      description: 'Own 25 agents across all types.',
      emoji: '🧱',
      color: '#14b8a6',
      progressValue: metrics.totalAgents,
      targetValue: 25,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'agents-50',
      title: 'Agency Empire',
      description: 'Own 50 agents across all types.',
      emoji: '🤝',
      color: '#14b8a6',
      progressValue: metrics.totalAgents,
      targetValue: 50,
      formatter: (value) => `${Math.floor(value)}`,
    }),
    withUnlocked({
      id: 'prompt-70',
      title: 'Prompt Tinkerer',
      description: 'Hit 70% prompt quality on any agent.',
      emoji: '📝',
      color: '#c084fc',
      progressValue: metrics.maxPromptQuality,
      targetValue: 70,
      formatter: (value) => `${Math.floor(value)}%`,
    }),
    withUnlocked({
      id: 'prompt-85',
      title: 'Prompt Specialist',
      description: 'Hit 85% prompt quality on any agent.',
      emoji: '🔮',
      color: '#a855f7',
      progressValue: metrics.maxPromptQuality,
      targetValue: 85,
      formatter: (value) => `${Math.floor(value)}%`,
    }),
    withUnlocked({
      id: 'prompt-95',
      title: 'Prompt Wizard',
      description: 'Hit 95% prompt quality on any agent.',
      emoji: '✨',
      color: '#a855f7',
      progressValue: metrics.maxPromptQuality,
      targetValue: 95,
      formatter: (value) => `${Math.floor(value)}%`,
    }),
    withUnlocked({
      id: 'ups-500',
      title: 'Steady Traffic',
      description: 'Reach 500 users per second.',
      emoji: '🚦',
      color: '#60a5fa',
      progressValue: metrics.usersPerSecond,
      targetValue: 500,
      formatter: (value) => `${formatCompact(value)}/s`,
    }),
    withUnlocked({
      id: 'ups-5k',
      title: 'Hyper Growth',
      description: 'Reach 5,000 users per second.',
      emoji: '🛰️',
      color: '#3b82f6',
      progressValue: metrics.usersPerSecond,
      targetValue: 5_000,
      formatter: (value) => `${formatCompact(value)}/s`,
    }),
    withUnlocked({
      id: 'ups-20k',
      title: 'Growth Machine',
      description: 'Reach 20,000 users per second.',
      emoji: '📈',
      color: '#2563eb',
      progressValue: metrics.usersPerSecond,
      targetValue: 20_000,
      formatter: (value) => `${formatCompact(value)}/s`,
    }),
    withUnlocked({
      id: 'profit-500',
      title: 'Profitable',
      description: 'Generate $500 net profit per second.',
      emoji: '✅',
      color: '#4ade80',
      progressValue: metrics.profitPerSecond,
      targetValue: 500,
      formatter: (value) => `${formatMoney(value)}/s`,
    }),
    withUnlocked({
      id: 'profit-5k',
      title: 'Profit Surge',
      description: 'Generate $5,000 net profit per second.',
      emoji: '💹',
      color: '#22c55e',
      progressValue: metrics.profitPerSecond,
      targetValue: 5_000,
      formatter: (value) => `${formatMoney(value)}/s`,
    }),
    withUnlocked({
      id: 'profit-50k',
      title: 'Profit Engine',
      description: 'Generate $50,000 net profit per second.',
      emoji: '⚙️',
      color: '#16a34a',
      progressValue: metrics.profitPerSecond,
      targetValue: 50_000,
      formatter: (value) => `${formatMoney(value)}/s`,
    }),
    withUnlocked({
      id: 'costs-100k',
      title: 'Burn Begin',
      description: 'Accumulate $100K in lifetime operating costs.',
      emoji: '🧯',
      color: '#fb7185',
      progressValue: metrics.lifetimeCosts,
      targetValue: 100_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'costs-1m',
      title: 'Spend to Scale',
      description: 'Accumulate $1M in lifetime operating costs.',
      emoji: '🔥',
      color: '#dc2626',
      progressValue: metrics.lifetimeCosts,
      targetValue: 1_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'costs-10m',
      title: 'Enterprise Burn',
      description: 'Accumulate $10M in lifetime operating costs.',
      emoji: '🌋',
      color: '#b91c1c',
      progressValue: metrics.lifetimeCosts,
      targetValue: 10_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'runtime-5m',
      title: 'Warm-Up Run',
      description: 'Keep one run alive for 5 minutes.',
      emoji: '⏱️',
      color: '#fbbf24',
      progressValue: metrics.elapsedGameSeconds,
      targetValue: 300,
      formatter: formatDuration,
    }),
    withUnlocked({
      id: 'runtime-15m',
      title: 'Long Haul',
      description: 'Keep one run alive for 15 minutes.',
      emoji: '⌛',
      color: '#f59e0b',
      progressValue: metrics.elapsedGameSeconds,
      targetValue: 900,
      formatter: formatDuration,
    }),
    withUnlocked({
      id: 'runtime-30m',
      title: 'Marathon Founder',
      description: 'Keep one run alive for 30 minutes.',
      emoji: '⏳',
      color: '#f59e0b',
      progressValue: metrics.elapsedGameSeconds,
      targetValue: 1_800,
      formatter: formatDuration,
    }),
    withUnlocked({
      id: 'lifetime-1m',
      title: 'Revenue Rookie',
      description: 'Accumulate $1M lifetime revenue.',
      emoji: '📍',
      color: '#22c55e',
      progressValue: metrics.lifetimeRevenue,
      targetValue: 1_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'lifetime-10m',
      title: 'Revenue Veteran',
      description: 'Accumulate $10M lifetime revenue.',
      emoji: '📌',
      color: '#16a34a',
      progressValue: metrics.lifetimeRevenue,
      targetValue: 10_000_000,
      formatter: formatMoney,
    }),
    withUnlocked({
      id: 'lifetime-20m',
      title: 'Revenue Titan',
      description: 'Accumulate $20M lifetime revenue.',
      emoji: '📊',
      color: '#0f766e',
      progressValue: metrics.lifetimeRevenue,
      targetValue: 20_000_000,
      formatter: formatMoney,
    }),
  ]
}
