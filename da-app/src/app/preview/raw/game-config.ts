// game-config.ts — single source of truth for all idle-game constants and types.
// Pure TypeScript, no React. Import from this module to edit agents, models,
// funding stages, managers, or reputation upgrades in one place.

import type { PromptEvaluation } from '@/lib/types'
import type { IdleAgentType } from '@/app/api/evaluate-idle/route'

// ============ Types ============

export interface Model {
  id: string
  name: string
  costPerToken: number
  qualityMultiplier: number
  unlockCost: number
  unlocked: boolean
}

export interface Agent {
  // id doubles as the idle-agent type identifier sent to /api/evaluate-idle,
  // so the evaluator grades a Chatbot Agent *as* a chatbot — not remapped
  // into a generic sales/marketing/engineering/finance role.
  id: IdleAgentType
  name: string
  emoji: string
  baseCost: number
  baseUsersPerSecond: number
  baseTokensPerTask: number
  count: number
  multiplier: number
  unlockThreshold: number
  promptQuality: number
  selectedModel: string
  iconGrad: string
  buttonGrad: string
  lastEvaluation: PromptEvaluation | null
  lastPrompt: string
}

export interface FundingStage {
  id: string
  name: string
  userRequirement: number
  revenueRequirement: number
  /** Minimum net income ($/s) required to advance. New in parity update. */
  profitRequirement: number
  reputationGain: number
}

export interface Manager {
  id: string
  name: string
  agentId: IdleAgentType
  cost: number
  purchased: boolean
}

export interface ReputationUpgrade {
  id: string
  name: string
  description: string
  cost: number
  /** Identifies what this upgrade affects in getReputationBonus(). */
  effect: string
  purchased: boolean
}

// ============ Models ============

// Fictional LLM tiers — names match docs/PRESTIGE.md + src/lib/constants.ts.
// Oracle Apex is the 5th, frontier-grade tier unique to the preview screen.
export const INITIAL_MODELS: Model[] = [
  { id: 'nimbus_1',     name: 'Nimbus-1',     costPerToken: 0.002, qualityMultiplier: 1.0, unlockCost: 0,      unlocked: true  },
  { id: 'quanta_s',     name: 'Quanta-S',     costPerToken: 0.015, qualityMultiplier: 1.3, unlockCost: 500,    unlocked: false },
  { id: 'synapse_pro',  name: 'Synapse Pro',  costPerToken: 0.02,  qualityMultiplier: 1.5, unlockCost: 5000,   unlocked: false },
  { id: 'oracle_ultra', name: 'Oracle Ultra', costPerToken: 0.035, qualityMultiplier: 1.8, unlockCost: 25000,  unlocked: false },
  { id: 'oracle_apex',  name: 'Oracle Apex',  costPerToken: 0.08,  qualityMultiplier: 2.2, unlockCost: 100000, unlocked: false },
]

// ============ Agents ============

// Each agent's id *is* its idle-agent type — the grader treats a Chatbot Agent
// as a chatbot, an Image Generator as an image generator, etc.
export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'chatbot', name: 'Chatbot Agent', emoji: '💬',
    baseCost: 15, baseUsersPerSecond: 0.8, baseTokensPerTask: 400,
    count: 0, multiplier: 1.15, unlockThreshold: 0, promptQuality: 50, selectedModel: 'nimbus_1',
    iconGrad: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(0, 184, 219) 100%)',
    buttonGrad: 'linear-gradient(to right, #2b7fff, #00b8db)',
    lastEvaluation: null, lastPrompt: '',
  },
  {
    id: 'image', name: 'Image Generator', emoji: '🎨',
    baseCost: 120, baseUsersPerSecond: 6, baseTokensPerTask: 600,
    count: 0, multiplier: 1.15, unlockThreshold: 100, promptQuality: 50, selectedModel: 'nimbus_1',
    iconGrad: 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(246, 51, 154) 100%)',
    buttonGrad: 'linear-gradient(to right, #ad46ff, #f6339a)',
    lastEvaluation: null, lastPrompt: '',
  },
  {
    id: 'code', name: 'Code Assistant', emoji: '⚡',
    baseCost: 1500, baseUsersPerSecond: 40, baseTokensPerTask: 2500,
    count: 0, multiplier: 1.15, unlockThreshold: 800, promptQuality: 50, selectedModel: 'nimbus_1',
    iconGrad: 'linear-gradient(135deg, rgb(34, 197, 94) 0%, rgb(16, 185, 129) 100%)',
    buttonGrad: 'linear-gradient(to right, #22c55e, #10b981)',
    lastEvaluation: null, lastPrompt: '',
  },
  {
    id: 'data', name: 'Data Analyst', emoji: '📊',
    baseCost: 18000, baseUsersPerSecond: 200, baseTokensPerTask: 2000,
    count: 0, multiplier: 1.15, unlockThreshold: 8000, promptQuality: 50, selectedModel: 'nimbus_1',
    iconGrad: 'linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(245, 158, 11) 100%)',
    buttonGrad: 'linear-gradient(to right, #f97316, #f59e0b)',
    lastEvaluation: null, lastPrompt: '',
  },
  {
    id: 'research', name: 'Research Agent', emoji: '🔬',
    baseCost: 200000, baseUsersPerSecond: 1000, baseTokensPerTask: 4000,
    count: 0, multiplier: 1.15, unlockThreshold: 80000, promptQuality: 50, selectedModel: 'nimbus_1',
    iconGrad: 'linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(139, 92, 246) 100%)',
    buttonGrad: 'linear-gradient(to right, #6366f1, #8b5cf6)',
    lastEvaluation: null, lastPrompt: '',
  },
  {
    id: 'orchestrator', name: 'ML Orchestrator', emoji: '🤖',
    baseCost: 2000000, baseUsersPerSecond: 5000, baseTokensPerTask: 6000,
    count: 0, multiplier: 1.15, unlockThreshold: 800000, promptQuality: 50, selectedModel: 'nimbus_1',
    iconGrad: 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(244, 63, 94) 100%)',
    buttonGrad: 'linear-gradient(to right, #ef4444, #f43f5e)',
    lastEvaluation: null, lastPrompt: '',
  },
]

// ============ Funding Stages ============

// profitRequirement is the minimum net income ($/s) required alongside users
// and totalEarned before the stage advances. Values from the reference App.tsx.
export const FUNDING_STAGES: FundingStage[] = [
  { id: 'bootstrap', name: 'Bootstrapped', userRequirement: 0,       revenueRequirement: 0,       profitRequirement: 0,     reputationGain: 0  },
  { id: 'pre-seed',  name: 'Pre-Seed',     userRequirement: 150,     revenueRequirement: 100,     profitRequirement: 10,    reputationGain: 1  },
  { id: 'seed',      name: 'Seed Round',   userRequirement: 1500,    revenueRequirement: 800,     profitRequirement: 50,    reputationGain: 3  },
  { id: 'series-a',  name: 'Series A',     userRequirement: 15000,   revenueRequirement: 8000,    profitRequirement: 200,   reputationGain: 8  },
  { id: 'series-b',  name: 'Series B',     userRequirement: 150000,  revenueRequirement: 80000,   profitRequirement: 1000,  reputationGain: 15 },
  { id: 'series-c',  name: 'Series C',     userRequirement: 750000,  revenueRequirement: 400000,  profitRequirement: 5000,  reputationGain: 25 },
  { id: 'ipo',       name: 'IPO',          userRequirement: 3000000, revenueRequirement: 1500000, profitRequirement: 20000, reputationGain: 60 },
]

// ============ Managers ============

// Managers auto-optimize an agent type. Unlock condition: agent.count >= 10.
export const INITIAL_MANAGERS: Manager[] = [
  { id: 'chatbot-mgr',      name: 'Script Manager',    agentId: 'chatbot',      cost: 1_000,       purchased: false },
  { id: 'image-mgr',        name: 'Prompt Engineer',   agentId: 'image',        cost: 10_000,      purchased: false },
  { id: 'code-mgr',         name: 'Senior Dev',        agentId: 'code',         cost: 100_000,     purchased: false },
  { id: 'data-mgr',         name: 'Data Lead',         agentId: 'data',         cost: 1_000_000,   purchased: false },
  { id: 'research-mgr',     name: 'Research Director', agentId: 'research',     cost: 10_000_000,  purchased: false },
  { id: 'orchestrator-mgr', name: 'AI Architect',      agentId: 'orchestrator', cost: 100_000_000, purchased: false },
]

// ============ Reputation Upgrades ============

// Purchased with reputation points earned on stage advance.
// effect strings are matched in getReputationBonus() inside the component.
export const INITIAL_REPUTATION_UPGRADES: ReputationUpgrade[] = [
  { id: 'click-boost-1', name: 'Marketing Expertise',  description: 'Clicks give 2× users',                  cost: 2,  effect: 'clickMultiplier', purchased: false },
  { id: 'starting-cash', name: 'Angel Investors',       description: 'Start with $1,500',                     cost: 5,  effect: 'startingCash',    purchased: false },
  { id: 'starting-users',name: 'Early Adopters',        description: 'Start with 150 users',                  cost: 8,  effect: 'startingUsers',   purchased: false },
  { id: 'prompt-boost',  name: 'Prompt Mastery',        description: 'Start with 70% prompt quality',         cost: 12, effect: 'promptQuality',   purchased: false },
  { id: 'user-gen-boost',name: 'Growth Hacking',        description: 'All agents +25% user generation',       cost: 18, effect: 'userGeneration',  purchased: false },
  { id: 'cost-reduction',name: 'Token Optimization',    description: 'Token costs reduced by 20%',            cost: 22, effect: 'costReduction',   purchased: false },
  { id: 'revenue-boost', name: 'Premium Pricing',       description: 'Revenue per user +50%',                 cost: 35, effect: 'revenueBoost',    purchased: false },
  { id: 'model-unlock',  name: 'Industry Connections',  description: 'Start with Quanta-S unlocked',          cost: 28, effect: 'modelUnlock',     purchased: false },
]

// ============ Prompt Challenges ============

// Flavor hints shown in the prompt editor (picked at random on modal open).
// The actual grade comes from the API — these are just inspiration hints.
export const PROMPT_CHALLENGES = [
  {
    task: 'Summarize a long document',
    hints: ['Be specific', 'Use action verbs', 'Avoid filler words'],
  },
  {
    task: 'Generate creative content',
    hints: ['Define format', 'Specify tone', 'Set constraints'],
  },
  {
    task: 'Analyze data patterns',
    hints: ['Be precise', 'Request specific metrics', 'Define success'],
  },
]

// ============ Economy ============

export const REVENUE_PER_USER = 0.6
