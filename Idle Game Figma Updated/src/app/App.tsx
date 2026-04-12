import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Zap, Image, Code, Database, Network, Sparkles, X, Edit3, ChevronDown, Trophy, TrendingUp, Users, DollarSign, Star } from 'lucide-react';
import PromptEditor from './components/PromptEditor';
import PivotModal from './components/PivotModal';

interface Model {
  id: string;
  name: string;
  costPerToken: number;
  qualityMultiplier: number;
  unlockCost: number;
  unlocked: boolean;
}

interface Agent {
  id: string;
  name: string;
  icon: React.ElementType;
  baseCost: number;
  baseUsersPerSecond: number;
  baseTokensPerTask: number;
  count: number;
  multiplier: number;
  unlockThreshold: number;
  promptQuality: number;
  selectedModel: string;
  color: string;
  emoji: string;
}

interface Manager {
  id: string;
  name: string;
  agentId: string;
  cost: number;
  purchased: boolean;
}

interface FundingStage {
  id: string;
  name: string;
  userRequirement: number;
  revenueRequirement: number;
  profitRequirement: number;
  reputationGain: number;
}

interface SocialPost {
  id: string;
  username: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  message: string;
  timestamp: number;
}

interface ReputationUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: string;
  purchased: boolean;
}

const INITIAL_MODELS: Model[] = [
  { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', costPerToken: 0.002, qualityMultiplier: 1.0, unlockCost: 0, unlocked: true },
  { id: 'gpt-4', name: 'GPT-4', costPerToken: 0.015, qualityMultiplier: 1.3, unlockCost: 500, unlocked: false },
  { id: 'claude-sonnet', name: 'Claude Sonnet', costPerToken: 0.02, qualityMultiplier: 1.5, unlockCost: 5000, unlocked: false },
  { id: 'gpt-4o', name: 'GPT-4o', costPerToken: 0.035, qualityMultiplier: 1.8, unlockCost: 25000, unlocked: false },
  { id: 'claude-opus', name: 'Claude Opus', costPerToken: 0.08, qualityMultiplier: 2.2, unlockCost: 100000, unlocked: false },
];

const INITIAL_AGENTS: Agent[] = [
  { id: 'chatbot', name: 'Chatbot Agent', icon: Cpu, baseCost: 15, baseUsersPerSecond: 0.8, baseTokensPerTask: 400, count: 0, multiplier: 1.15, unlockThreshold: 0, promptQuality: 50, selectedModel: 'gpt-3.5', color: 'from-blue-500 to-cyan-500', emoji: '💬' },
  { id: 'image', name: 'Image Generator', icon: Image, baseCost: 120, baseUsersPerSecond: 6, baseTokensPerTask: 600, count: 0, multiplier: 1.15, unlockThreshold: 100, promptQuality: 50, selectedModel: 'gpt-3.5', color: 'from-purple-500 to-pink-500', emoji: '🎨' },
  { id: 'code', name: 'Code Assistant', icon: Code, baseCost: 1500, baseUsersPerSecond: 40, baseTokensPerTask: 2500, count: 0, multiplier: 1.15, unlockThreshold: 800, promptQuality: 50, selectedModel: 'gpt-3.5', color: 'from-green-500 to-emerald-500', emoji: '⚡' },
  { id: 'data', name: 'Data Analyst', icon: Database, baseCost: 18000, baseUsersPerSecond: 200, baseTokensPerTask: 2000, count: 0, multiplier: 1.15, unlockThreshold: 8000, promptQuality: 50, selectedModel: 'gpt-3.5', color: 'from-orange-500 to-amber-500', emoji: '📊' },
  { id: 'research', name: 'Research Agent', icon: Sparkles, baseCost: 200000, baseUsersPerSecond: 1000, baseTokensPerTask: 4000, count: 0, multiplier: 1.15, unlockThreshold: 80000, promptQuality: 50, selectedModel: 'gpt-3.5', color: 'from-indigo-500 to-violet-500', emoji: '🔬' },
  { id: 'orchestrator', name: 'ML Orchestrator', icon: Network, baseCost: 2000000, baseUsersPerSecond: 5000, baseTokensPerTask: 6000, count: 0, multiplier: 1.15, unlockThreshold: 800000, promptQuality: 50, selectedModel: 'gpt-3.5', color: 'from-red-500 to-rose-500', emoji: '🤖' },
];

const MANAGERS: Manager[] = [
  { id: 'chatbot-mgr', name: 'Script Manager', agentId: 'chatbot', cost: 1000, purchased: false },
  { id: 'image-mgr', name: 'Prompt Engineer', agentId: 'image', cost: 10000, purchased: false },
  { id: 'code-mgr', name: 'Senior Dev', agentId: 'code', cost: 100000, purchased: false },
  { id: 'data-mgr', name: 'Data Lead', agentId: 'data', cost: 1000000, purchased: false },
  { id: 'research-mgr', name: 'Research Director', agentId: 'research', cost: 10000000, purchased: false },
  { id: 'orchestrator-mgr', name: 'AI Architect', agentId: 'orchestrator', cost: 100000000, purchased: false },
];

const FUNDING_STAGES: FundingStage[] = [
  { id: 'bootstrap', name: 'Bootstrapped', userRequirement: 0, revenueRequirement: 0, profitRequirement: 0, reputationGain: 0 },
  { id: 'pre-seed', name: 'Pre-Seed', userRequirement: 150, revenueRequirement: 100, profitRequirement: 10, reputationGain: 1 },
  { id: 'seed', name: 'Seed Round', userRequirement: 1500, revenueRequirement: 800, profitRequirement: 50, reputationGain: 3 },
  { id: 'series-a', name: 'Series A', userRequirement: 15000, revenueRequirement: 8000, profitRequirement: 200, reputationGain: 8 },
  { id: 'series-b', name: 'Series B', userRequirement: 150000, revenueRequirement: 80000, profitRequirement: 1000, reputationGain: 15 },
  { id: 'series-c', name: 'Series C', userRequirement: 750000, revenueRequirement: 400000, profitRequirement: 5000, reputationGain: 25 },
  { id: 'ipo', name: 'IPO', userRequirement: 3000000, revenueRequirement: 1500000, profitRequirement: 20000, reputationGain: 60 },
];

const REPUTATION_UPGRADES: ReputationUpgrade[] = [
  { id: 'click-boost-1', name: 'Marketing Expertise', description: 'Clicks give 2x users', cost: 2, effect: 'clickMultiplier', purchased: false },
  { id: 'starting-cash', name: 'Angel Investors', description: 'Start with $1500', cost: 5, effect: 'startingCash', purchased: false },
  { id: 'starting-users', name: 'Early Adopters', description: 'Start with 150 users', cost: 8, effect: 'startingUsers', purchased: false },
  { id: 'prompt-boost', name: 'Prompt Mastery', description: 'Start with 70% prompt quality', cost: 12, effect: 'promptQuality', purchased: false },
  { id: 'user-gen-boost', name: 'Growth Hacking', description: 'All agents generate 25% more users', cost: 18, effect: 'userGeneration', purchased: false },
  { id: 'cost-reduction', name: 'Token Optimization', description: 'All token costs reduced by 20%', cost: 22, effect: 'costReduction', purchased: false },
  { id: 'revenue-boost', name: 'Premium Pricing', description: 'Revenue per user increased by 50%', cost: 35, effect: 'revenueBoost', purchased: false },
  { id: 'model-unlock', name: 'Industry Connections', description: 'Start with GPT-4 unlocked', cost: 28, effect: 'modelUnlock', purchased: false },
];

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  target?: number;
}

const REVENUE_PER_USER = 0.6;

const getInitialState = (reputationUpgrades: ReputationUpgrade[]) => {
  const hasUpgrade = (effect: string) => reputationUpgrades.some(u => u.effect === effect && u.purchased);

  const startingCash = hasUpgrade('startingCash') ? 1500 : 30;
  const startingUsers = hasUpgrade('startingUsers') ? 150 : 15;
  const basePromptQuality = hasUpgrade('promptQuality') ? 70 : 50;
  const hasModelUnlock = hasUpgrade('modelUnlock');

  return {
    tokens: startingCash,
    userbase: startingUsers,
    agents: INITIAL_AGENTS.map(a => ({ ...a, promptQuality: basePromptQuality })),
    models: INITIAL_MODELS.map(m => ({
      ...m,
      unlocked: m.id === 'gpt-3.5' || (m.id === 'gpt-4' && hasModelUnlock)
    }))
  };
};

export default function App() {
  const [reputation, setReputation] = useState(0);
  const [reputationUpgrades, setReputationUpgrades] = useState<ReputationUpgrade[]>(REPUTATION_UPGRADES);

  const initialState = getInitialState(reputationUpgrades);

  const [tokens, setTokens] = useState(initialState.tokens);
  const [userbase, setUserbase] = useState(initialState.userbase);
  const [agents, setAgents] = useState<Agent[]>(initialState.agents);
  const [managers, setManagers] = useState<Manager[]>(MANAGERS);
  const [models, setModels] = useState<Model[]>(initialState.models);
  const [clickPower, setClickPower] = useState(1);
  const [totalEarned, setTotalEarned] = useState(0);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showPivotModal, setShowPivotModal] = useState(false);
  const [lifetimeUsers, setLifetimeUsers] = useState(0);
  const [lifetimeRevenue, setLifetimeRevenue] = useState(0);
  const [serviceQuality, setServiceQuality] = useState(100);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [currentTip, setCurrentTip] = useState("");
  const [activeTab, setActiveTab] = useState<'stats' | 'upgrades' | 'achievements'>('stats');
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first-user', name: 'First User!', description: 'Reach 100 users', icon: '👤', unlocked: false, target: 100 },
    { id: 'user-milestone-1k', name: 'Going Viral', description: 'Reach 1,000 users', icon: '📈', unlocked: false, target: 1000 },
    { id: 'user-milestone-100k', name: 'Mass Adoption', description: 'Reach 100,000 users', icon: '🌐', unlocked: false, target: 100000 },
    { id: 'first-agent', name: 'Automated Future', description: 'Buy your first AI agent', icon: '🤖', unlocked: false },
    { id: 'agent-army', name: 'Agent Army', description: 'Own 50 total agents', icon: '⚡', unlocked: false, target: 50 },
    { id: 'perfect-quality', name: 'Perfection', description: 'Achieve 95%+ service quality', icon: '💎', unlocked: false },
    { id: 'all-models', name: 'Model Collector', description: 'Unlock all AI models', icon: '🧠', unlocked: false },
    { id: 'first-funding', name: 'Funded!', description: 'Reach Pre-Seed stage', icon: '💰', unlocked: false },
    { id: 'ipo-ready', name: 'IPO King', description: 'Reach IPO stage', icon: '🏆', unlocked: false },
    { id: 'first-pivot', name: 'Serial Entrepreneur', description: 'Complete your first pivot', icon: '🔄', unlocked: false },
    { id: 'prompt-master', name: 'Prompt Engineer', description: 'Get any agent to 100% prompt quality', icon: '✍️', unlocked: false },
    { id: 'money-maker', name: 'Cash Flow Positive', description: 'Earn $10,000 total revenue', icon: '💵', unlocked: false, target: 10000 },
  ]);

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
  };

  const getReputationBonus = (effect: string): number => {
    const upgrade = reputationUpgrades.find(u => u.effect === effect && u.purchased);
    if (!upgrade) return 0;

    switch (effect) {
      case 'clickMultiplier': return 2;
      case 'userGeneration': return 1.25;
      case 'costReduction': return 0.8;
      case 'revenueBoost': return 1.5;
      default: return 1;
    }
  };

  const hasReputationUpgrade = (effect: string): boolean => {
    return reputationUpgrades.some(u => u.effect === effect && u.purchased);
  };

  const getAgentQuality = (agent: Agent): number => {
    if (agent.count === 0) return 0;

    const model = models.find(m => m.id === agent.selectedModel);
    const modelQuality = model ? model.qualityMultiplier : 1;

    // Quality is based on prompt quality (0-100) and model multiplier
    // Prompt quality is the main factor (60% weight), model adds quality bonus (40% weight)
    const promptScore = agent.promptQuality * 0.7;
    const modelScore = ((modelQuality - 1) / 1.2) * 30; // Normalize model quality to 0-30 range

    return Math.min(100, promptScore + modelScore);
  };

  const calculateServiceQuality = (): number => {
    const activeAgents = agents.filter(a => a.count > 0);
    if (activeAgents.length === 0) return 100;

    // Weight by user generation - agents that bring more users matter more for quality
    const totalWeight = activeAgents.reduce((sum, a) => sum + getUsersPerSecond(a), 0);
    if (totalWeight === 0) return 100;

    const weightedQuality = activeAgents.reduce((sum, agent) => {
      const weight = getUsersPerSecond(agent);
      const quality = getAgentQuality(agent);
      return sum + (quality * weight);
    }, 0);

    return Math.max(0, Math.min(100, weightedQuality / totalWeight));
  };

  const getUserChurnRate = (quality: number): number => {
    // Quality thresholds for churn (per second as fraction of userbase)
    if (quality >= 75) return 0; // Excellent quality, no churn
    if (quality >= 65) return 0.005; // Good quality, minimal churn (0.5%/s)
    if (quality >= 55) return 0.015; // Acceptable quality, light churn (1.5%/s)
    if (quality >= 45) return 0.04; // Mediocre quality, moderate churn (4%/s)
    if (quality >= 35) return 0.08; // Poor quality, heavy churn (8%/s)
    return 0.15; // Terrible quality, massive churn (15%/s)
  };

  const getCost = (agent: Agent): number => {
    return Math.floor(agent.baseCost * Math.pow(agent.multiplier, agent.count));
  };

  const getUsersPerSecond = (agent: Agent): number => {
    const model = models.find(m => m.id === agent.selectedModel);
    const qualityBonus = model ? model.qualityMultiplier : 1;
    const userGenBonus = getReputationBonus('userGeneration') || 1;
    return agent.baseUsersPerSecond * agent.count * qualityBonus * userGenBonus;
  };

  const getTotalUsersPerSecond = (): number => {
    return agents.reduce((sum, agent) => sum + getUsersPerSecond(agent), 0);
  };

  const getRevenueFromUsers = (): number => {
    const revenueBonus = getReputationBonus('revenueBoost') || 1;
    return userbase * REVENUE_PER_USER * revenueBonus;
  };

  const getTokensUsed = (agent: Agent): number => {
    const promptEfficiency = agent.promptQuality / 100;
    const tokenMultiplier = 2 - promptEfficiency;
    return agent.baseTokensPerTask * tokenMultiplier;
  };

  const getOperatingCost = (agent: Agent): number => {
    const model = models.find(m => m.id === agent.selectedModel);
    const costPerToken = model ? model.costPerToken : 0.001;
    const tokensUsed = getTokensUsed(agent);
    const costReduction = getReputationBonus('costReduction') || 1;
    return tokensUsed * costPerToken * agent.count * costReduction;
  };

  const getTotalOperatingCost = (): number => {
    return agents.reduce((sum, agent) => sum + getOperatingCost(agent), 0);
  };

  const getNetIncome = (): number => {
    return getRevenueFromUsers() - getTotalOperatingCost();
  };

  const buyAgent = (agentId: string) => {
    setAgents(prev => {
      const agent = prev.find(a => a.id === agentId);
      if (!agent) return prev;

      const cost = getCost(agent);
      if (tokens < cost) return prev;

      setTokens(t => t - cost);
      return prev.map(a =>
        a.id === agentId ? { ...a, count: a.count + 1 } : a
      );
    });
  };

  const buyManager = (managerId: string) => {
    const manager = managers.find(m => m.id === managerId);
    if (!manager || manager.purchased || tokens < manager.cost) return;

    setTokens(t => t - manager.cost);
    setManagers(prev => prev.map(m =>
      m.id === managerId ? { ...m, purchased: true } : m
    ));
  };

  const unlockModel = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model || model.unlocked || tokens < model.unlockCost) return;

    setTokens(t => t - model.unlockCost);
    setModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, unlocked: true } : m
    ));
  };

  const changeAgentModel = (agentId: string, modelId: string) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, selectedModel: modelId } : a
    ));
  };

  const improvePrompt = (agentId: string, improvement: number) => {
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, promptQuality: Math.min(100, a.promptQuality + improvement) } : a
    ));
  };

  const buyReputationUpgrade = (upgradeId: string) => {
    const upgrade = reputationUpgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.purchased || reputation < upgrade.cost) return;

    setReputation(r => r - upgrade.cost);
    setReputationUpgrades(prev => prev.map(u =>
      u.id === upgradeId ? { ...u, purchased: true } : u
    ));
  };

  const advanceStage = useCallback(() => {
    if (currentStageIndex >= FUNDING_STAGES.length - 1) return;

    const nextStage = FUNDING_STAGES[currentStageIndex + 1];
    const currentProfit = getNetIncome();
    if (userbase >= nextStage.userRequirement &&
        totalEarned >= nextStage.revenueRequirement &&
        currentProfit >= nextStage.profitRequirement) {
      setCurrentStageIndex(currentStageIndex + 1);
      setReputation(r => r + nextStage.reputationGain);
    }
  }, [currentStageIndex, userbase, totalEarned]);

  const pivot = () => {
    const ipoStage = FUNDING_STAGES.find(s => s.id === 'ipo');
    if (!ipoStage) return;

    const totalReputation = reputation + ipoStage.reputationGain;

    // Update reputation first so getInitialState can use it
    setReputation(totalReputation);

    // Calculate new initial state based on upgrades
    const newState = getInitialState(reputationUpgrades);

    // Reset everything except reputation and upgrades
    setTokens(newState.tokens);
    setUserbase(newState.userbase);
    setTotalEarned(0);
    setLifetimeUsers(0);
    setLifetimeRevenue(0);
    setCurrentStageIndex(0);
    setServiceQuality(100);

    // Reset agents with new initial state
    setAgents(newState.agents.map(a => ({
      ...a,
      count: 0,
      selectedModel: 'gpt-3.5'
    })));

    // Reset managers
    setManagers(MANAGERS.map(m => ({ ...m, purchased: false })));

    // Reset models with new initial state
    setModels(newState.models);

    // Unlock first pivot achievement
    setAchievements(prev => prev.map(a =>
      a.id === 'first-pivot' ? { ...a, unlocked: true } : a
    ));

    setShowPivotModal(false);
  };

  const handleClick = useCallback(() => {
    const clickMultiplier = getReputationBonus('clickMultiplier') || 1;
    const users = clickPower * clickMultiplier;
    setUserbase(u => u + users);
    setLifetimeUsers(l => l + users);
  }, [clickPower, reputationUpgrades]);

  useEffect(() => {
    const usersPerSecond = getTotalUsersPerSecond();
    const quality = calculateServiceQuality();
    const churnRate = getUserChurnRate(quality);

    const interval = setInterval(() => {
      const usersGained = (usersPerSecond / 10) * gameSpeed;
      const usersLost = ((userbase * churnRate) / 10) * gameSpeed;
      const netUsers = usersGained - usersLost;

      setUserbase(u => Math.max(0, u + netUsers));
      setLifetimeUsers(l => l + Math.max(0, usersGained));
      setServiceQuality(quality);
    }, 100);
    return () => clearInterval(interval);
  }, [agents, reputationUpgrades, userbase, gameSpeed]);

  useEffect(() => {
    const revenue = getRevenueFromUsers();
    const costs = getTotalOperatingCost();
    const netIncome = revenue - costs;

    const interval = setInterval(() => {
      setTokens(t => t + (netIncome / 10) * gameSpeed);
      if (netIncome > 0) {
        const earned = (netIncome / 10) * gameSpeed;
        setTotalEarned(e => e + earned);
        setLifetimeRevenue(l => l + earned);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [userbase, agents, reputationUpgrades, gameSpeed]);

  useEffect(() => {
    const totalAgents = agents.reduce((sum, a) => sum + a.count, 0);
    setClickPower(1 + Math.floor(totalAgents * 0.5));
  }, [agents]);

  useEffect(() => {
    const nextStage = FUNDING_STAGES[currentStageIndex + 1];
    const currentProfit = getNetIncome();

    if (nextStage &&
        userbase >= nextStage.userRequirement &&
        totalEarned >= nextStage.revenueRequirement &&
        currentProfit >= nextStage.profitRequirement) {
      advanceStage();
    }
  }, [userbase, totalEarned, currentStageIndex, advanceStage]);

  // Check and unlock achievements
  useEffect(() => {
    setAchievements(prev => prev.map(ach => {
      if (ach.unlocked) return ach;

      switch (ach.id) {
        case 'first-user':
          return { ...ach, unlocked: userbase >= 100, progress: Math.min(userbase, 100) };
        case 'user-milestone-1k':
          return { ...ach, unlocked: userbase >= 1000, progress: Math.min(userbase, 1000) };
        case 'user-milestone-100k':
          return { ...ach, unlocked: userbase >= 100000, progress: Math.min(userbase, 100000) };
        case 'first-agent':
          return { ...ach, unlocked: agents.some(a => a.count > 0) };
        case 'agent-army':
          const totalAgents = agents.reduce((sum, a) => sum + a.count, 0);
          return { ...ach, unlocked: totalAgents >= 50, progress: Math.min(totalAgents, 50) };
        case 'perfect-quality':
          return { ...ach, unlocked: serviceQuality >= 95 };
        case 'all-models':
          return { ...ach, unlocked: models.every(m => m.unlocked) };
        case 'first-funding':
          return { ...ach, unlocked: currentStageIndex >= 1 };
        case 'ipo-ready':
          return { ...ach, unlocked: currentStageIndex >= 6 };
        case 'first-pivot':
          return ach; // This will be unlocked when pivot happens
        case 'prompt-master':
          return { ...ach, unlocked: agents.some(a => a.promptQuality >= 100) };
        case 'money-maker':
          return { ...ach, unlocked: totalEarned >= 10000, progress: Math.min(totalEarned, 10000) };
        default:
          return ach;
      }
    }));
  }, [userbase, agents, serviceQuality, models, currentStageIndex, totalEarned]);

  // Generate social media posts
  useEffect(() => {
    const generatePost = () => {
      const usernames = ['@techfan', '@startuplover', '@aiethusiast', '@skeptic99', '@earlyuser', '@developer', '@designer', '@productguru', '@entrepreneur', '@investor'];
      const positiveMessages = [
        "This AI service is incredible! 🚀",
        "Best AI platform I've ever used!",
        "The quality is outstanding! ⭐⭐⭐⭐⭐",
        "Can't believe how good this is!",
        "Finally, an AI that actually works!",
        "This is the future! 🔥",
        "Absolutely loving this product!",
        "Game changer! Everyone needs this!",
      ];
      const neutralMessages = [
        "It's okay, I guess...",
        "Trying out this new AI service",
        "Not bad, but could be better",
        "Decent service, nothing special",
        "It works as advertised",
        "Pretty average experience",
      ];
      const negativeMessages = [
        "This is terrible! Waste of time 😡",
        "Doesn't work as promised",
        "Quality has really gone downhill...",
        "I'm switching to a competitor",
        "Disappointed with the service",
        "Not worth the money",
        "Buggy and unreliable",
        "Customer support is nonexistent",
      ];

      let sentiment: 'positive' | 'neutral' | 'negative';
      let message: string;

      if (serviceQuality >= 75) {
        sentiment = Math.random() < 0.8 ? 'positive' : 'neutral';
        message = sentiment === 'positive' ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)] : neutralMessages[Math.floor(Math.random() * neutralMessages.length)];
      } else if (serviceQuality >= 55) {
        sentiment = Math.random() < 0.5 ? 'neutral' : (Math.random() < 0.7 ? 'positive' : 'negative');
        message = sentiment === 'positive' ? positiveMessages[Math.floor(Math.random() * positiveMessages.length)] :
                  sentiment === 'neutral' ? neutralMessages[Math.floor(Math.random() * neutralMessages.length)] :
                  negativeMessages[Math.floor(Math.random() * negativeMessages.length)];
      } else {
        sentiment = Math.random() < 0.7 ? 'negative' : 'neutral';
        message = sentiment === 'negative' ? negativeMessages[Math.floor(Math.random() * negativeMessages.length)] : neutralMessages[Math.floor(Math.random() * neutralMessages.length)];
      }

      const newPost: SocialPost = {
        id: Date.now().toString() + Math.random(),
        username: usernames[Math.floor(Math.random() * usernames.length)],
        sentiment,
        message,
        timestamp: Date.now(),
      };

      setSocialPosts(prev => [newPost, ...prev].slice(0, 20));
    };

    if (userbase > 10 && gameSpeed > 0) {
      const interval = setInterval(generatePost, 3000 / gameSpeed);
      return () => clearInterval(interval);
    }
  }, [serviceQuality, userbase, gameSpeed]);

  // Update revenue history for graph
  useEffect(() => {
    const interval = setInterval(() => {
      setRevenueHistory(prev => [...prev.slice(1), getNetIncome()]);
    }, 1000);
    return () => clearInterval(interval);
  }, [userbase, agents, reputationUpgrades]);

  // TerpAI tips based on game state
  useEffect(() => {
    const tips: string[] = [];

    // Quality tips
    if (serviceQuality < 50 && agents.some(a => a.count > 0)) {
      tips.push("😰 Yikes! Your service quality is really low. Have you tried improving your prompts? Bad prompts = unhappy users!");
    } else if (serviceQuality < 65 && agents.some(a => a.count > 0)) {
      tips.push("🤔 Your quality could use some work. Try the prompt engineering minigame or upgrade to better models!");
    } else if (serviceQuality >= 85) {
      tips.push("🎉 Wow! Your service quality is excellent! Users are loving it!");
    }

    // Prompt quality tips
    const lowQualityAgents = agents.filter(a => a.count > 0 && a.promptQuality < 60);
    if (lowQualityAgents.length > 0) {
      tips.push(`📝 Pro tip: ${lowQualityAgents[0].name} has low prompt quality (${lowQualityAgents[0].promptQuality}%). Click the Prompt button to improve it!`);
    }

    // Model upgrade tips
    const agentsOnBasicModel = agents.filter(a => a.count > 0 && a.selectedModel === 'gpt-3.5');
    if (agentsOnBasicModel.length > 0 && models.some(m => m.unlocked && m.id !== 'gpt-3.5')) {
      tips.push(`🧠 You have better models unlocked! Upgrade your ${agentsOnBasicModel[0].name} from GPT-3.5 for higher quality.`);
    }

    // Economic tips
    if (getNetIncome() < 0) {
      tips.push("💸 Warning! You're losing money! Your token costs are higher than your revenue. Improve prompts to reduce costs or grow your userbase.");
    } else if (tokens > 1000 && agents.every(a => a.count === 0)) {
      tips.push("💰 You have cash but no agents! Buy some AI agents to start attracting users automatically.");
    }

    // Churn tips
    if (userbase > 100 && getUserChurnRate(serviceQuality) > 0.05) {
      tips.push("📉 Users are leaving fast! Improve your service quality by optimizing prompts or upgrading models.");
    }

    // Funding tips
    if (currentStageIndex === FUNDING_STAGES.length - 1) {
      tips.push("🏆 Congratulations! You've reached IPO! Click the Pivot button to reset with reputation bonuses.");
    } else if (currentStageIndex < FUNDING_STAGES.length - 1) {
      const nextStage = FUNDING_STAGES[currentStageIndex + 1];
      const userProgress = (userbase / nextStage.userRequirement) * 100;
      const revenueProgress = (totalEarned / nextStage.revenueRequirement) * 100;
      const profitProgress = (getNetIncome() / nextStage.profitRequirement) * 100;

      if (userProgress >= 100 && revenueProgress >= 100 && profitProgress < 100) {
        tips.push(`📊 Investors want to see ${formatNumber(nextStage.profitRequirement)}/s profit! You're at ${formatNumber(getNetIncome())}/s. Optimize your costs!`);
      } else if (userProgress > revenueProgress + 20) {
        tips.push(`💡 You have lots of users but not enough revenue. Each user generates $${REVENUE_PER_USER * (getReputationBonus('revenueBoost') || 1)}/s. Keep growing!`);
      }
    }

    // Welcome tip
    if (agents.every(a => a.count === 0) && tokens < 100) {
      tips.push("👋 Welcome to AI Agent Empire! Click the big button to attract users, then buy AI agents to automate growth!");
    }

    // Pick a random tip or default
    if (tips.length > 0) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(randomTip);
    } else {
      setCurrentTip("✨ Everything's running smoothly! Keep optimizing your prompts and models for maximum profit.");
    }
  }, [serviceQuality, agents, models, getNetIncome, tokens, userbase, currentStageIndex, totalEarned]);

  return (
    <div className="size-full bg-gradient-to-br from-sky-50 via-white to-purple-50 overflow-auto">
      <div className="min-h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg shadow-sm border-b-4 border-green-400"
        >
          {/* Top Bar with Title and Stats */}
          <div className="border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">🤖</div>
                  <div>
                    <h1 className="text-xl font-extrabold text-gray-800">
                      AI Agent Empire
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold">
                        {FUNDING_STAGES[currentStageIndex].name}
                      </span>
                      {reputation > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100">
                          <Trophy className="w-3 h-3 text-yellow-600" />
                          <span className="text-xs font-bold text-yellow-700">{reputation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <div className="px-3 py-1.5 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      <div>
                        <div className="text-xs opacity-90">Cash</div>
                        <div className="text-lg font-bold tabular-nums">${formatNumber(tokens)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 text-white shadow-md">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <div>
                        <div className="text-xs opacity-90">Users</div>
                        <div className="text-lg font-bold tabular-nums">{formatNumber(userbase)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-md">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4" />
                      <div>
                        <div className="text-xs opacity-90">Quality</div>
                        <div className="text-lg font-bold tabular-nums">{Math.floor(serviceQuality)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-6 py-3 font-bold text-sm transition-all ${
                  activeTab === 'stats'
                    ? 'text-gray-800 border-b-4 border-green-400'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                STATS
              </button>
              <button
                onClick={() => setActiveTab('upgrades')}
                className={`px-6 py-3 font-bold text-sm transition-all ${
                  activeTab === 'upgrades'
                    ? 'text-gray-800 border-b-4 border-green-400'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                UPGRADES
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-6 py-3 font-bold text-sm transition-all ${
                  activeTab === 'achievements'
                    ? 'text-gray-800 border-b-4 border-green-400'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                ACHIEVEMENTS
              </button>
            </div>
          </div>
        </motion.div>

        <div className="flex-1 w-full px-4 py-6">
          <div className="max-w-[1800px] mx-auto">
            {/* Quality Feedback */}
            {serviceQuality < 60 && agents.some(a => a.count > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-300 rounded-3xl p-4 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="text-4xl flex-shrink-0">😰</div>
                  <div className="flex-1">
                    <h3 className="text-orange-700 font-bold mb-1">Uh oh! Quality is slipping</h3>
                    <p className="text-sm text-orange-800">
                      Your service quality is {Math.floor(serviceQuality)}%. Users are leaving at {formatNumber(userbase * getUserChurnRate(serviceQuality))}/s.
                      Try improving prompts or upgrading models!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {serviceQuality >= 85 && agents.some(a => a.count > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-3xl p-4 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="text-4xl flex-shrink-0">🎉</div>
                  <div className="flex-1">
                    <h3 className="text-green-700 font-bold mb-1">Amazing work!</h3>
                    <p className="text-sm text-green-800">
                      Your service quality is {Math.floor(serviceQuality)}%. Users love your product!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Three Column Layout */}
            <div className="grid grid-cols-12 gap-4">
              {/* LEFT PANEL */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                {/* Company Name */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 shadow-xl text-center"
                >
                  <div className="text-5xl mb-2">🚀</div>
                  <h2 className="text-2xl font-extrabold text-white">AI Empire Inc.</h2>
                  <div className="text-purple-100 text-sm mt-1">Building the Future</div>
                </motion.div>

                {/* Click Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl p-6 shadow-xl border-4 border-purple-300"
                >
                  <div className="text-center">
                    <div className="text-gray-700 font-bold mb-4">👆 Click to attract users!</div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleClick}
                      className="relative mb-4"
                    >
                      <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-purple-500 flex items-center justify-center shadow-2xl hover:shadow-purple-400/50 transition-all border-8 border-white mx-auto">
                        <div className="text-6xl">✨</div>
                      </div>
                    </motion.button>
                    <div className="text-gray-700 font-bold text-lg">
                      +{formatNumber(clickPower * (getReputationBonus('clickMultiplier') || 1))} users
                      {hasReputationUpgrade('clickMultiplier') && <span className="ml-2 px-2 py-1 rounded-full bg-yellow-200 text-yellow-700 text-xs">⚡ 2x</span>}
                    </div>
                  </div>
                </motion.div>

                {/* Funding Roadmap */}
                <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-200">
                  <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Funding Stage
                  </h3>

                  <div className="space-y-3">
                    {FUNDING_STAGES.map((stage, index) => {
                      const isCompleted = index < currentStageIndex;
                      const isCurrent = index === currentStageIndex;

                      return (
                        <div key={stage.id} className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                            isCompleted ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg' :
                            isCurrent ? 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg ring-4 ring-blue-200' :
                            'bg-gray-200 text-gray-400'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-bold ${
                              isCompleted || isCurrent ? 'text-gray-700' : 'text-gray-400'
                            }`}>
                              {stage.name}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {currentStageIndex < FUNDING_STAGES.length - 1 && (
                    <div className="mt-4 space-y-2">
                      <div className="bg-purple-50 rounded-2xl p-3 border-2 border-purple-200">
                        <div className="text-xs font-bold text-purple-700 mb-1">👥 Users</div>
                        <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (userbase / FUNDING_STAGES[currentStageIndex + 1].userRequirement) * 100)}%` }}
                            className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
                          />
                        </div>
                        <div className="text-xs text-purple-700 mt-1 tabular-nums">
                          {formatNumber(userbase)} / {formatNumber(FUNDING_STAGES[currentStageIndex + 1].userRequirement)}
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-2xl p-3 border-2 border-green-200">
                        <div className="text-xs font-bold text-green-700 mb-1">💰 Revenue</div>
                        <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (totalEarned / FUNDING_STAGES[currentStageIndex + 1].revenueRequirement) * 100)}%` }}
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                          />
                        </div>
                        <div className="text-xs text-green-700 mt-1 tabular-nums">
                          ${formatNumber(totalEarned)} / ${formatNumber(FUNDING_STAGES[currentStageIndex + 1].revenueRequirement)}
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-2xl p-3 border-2 border-blue-200">
                        <div className="text-xs font-bold text-blue-700 mb-1">📈 Profit/s (Investor Req)</div>
                        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (getNetIncome() / FUNDING_STAGES[currentStageIndex + 1].profitRequirement) * 100)}%` }}
                            className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full"
                          />
                        </div>
                        <div className="text-xs text-blue-700 mt-1 tabular-nums">
                          ${formatNumber(getNetIncome())} / ${formatNumber(FUNDING_STAGES[currentStageIndex + 1].profitRequirement)}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStageIndex === FUNDING_STAGES.length - 1 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPivotModal(true)}
                      className="w-full mt-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold shadow-xl hover:shadow-2xl transition-all"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="w-5 h-5" />
                        <span>Pivot!</span>
                      </div>
                    </motion.button>
                  )}
                </div>
              </div>

              {/* MIDDLE PANEL - Stats/Upgrades/Achievements */}
              <div className="col-span-12 lg:col-span-6 space-y-4">
                {/* TerpAI Assistant */}
                <motion.div
                  key={currentTip}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-3xl p-6 border-2 border-blue-200 shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl flex-shrink-0">🤖</div>
                    <div className="flex-1">
                      <h3 className="font-extrabold text-blue-700 mb-2">TerpAI says:</h3>
                      <p className="text-gray-700 leading-relaxed">{currentTip}</p>
                    </div>
                  </div>
                </motion.div>

                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    {/* Main Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-5 shadow-xl"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-4xl">👥</div>
                          <div className="flex-1">
                            <div className="text-purple-100 text-xs font-bold">User Growth</div>
                            <div className="text-white text-2xl font-extrabold tabular-nums">
                              +{formatNumber(getTotalUsersPerSecond())}/s
                            </div>
                          </div>
                        </div>
                        {userbase > 0 && getUserChurnRate(serviceQuality) > 0 && (
                          <div className="text-purple-100 text-xs">
                            Churn: -{formatNumber(userbase * getUserChurnRate(serviceQuality))}/s
                          </div>
                        )}
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl p-5 shadow-xl"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-4xl">💰</div>
                          <div className="flex-1">
                            <div className="text-green-100 text-xs font-bold">Revenue</div>
                            <div className="text-white text-2xl font-extrabold tabular-nums">
                              +${formatNumber(getRevenueFromUsers())}/s
                            </div>
                          </div>
                        </div>
                        {hasReputationUpgrade('revenueBoost') && (
                          <div className="text-green-100 text-xs">⚡ +50% Bonus Active</div>
                        )}
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-5 shadow-xl"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-4xl">🔥</div>
                          <div className="flex-1">
                            <div className="text-orange-100 text-xs font-bold">Token Costs</div>
                            <div className="text-white text-2xl font-extrabold tabular-nums">
                              -${formatNumber(getTotalOperatingCost())}/s
                            </div>
                          </div>
                        </div>
                        {hasReputationUpgrade('costReduction') && (
                          <div className="text-orange-100 text-xs">⚡ -20% Cost Reduction</div>
                        )}
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className={`bg-gradient-to-br ${getNetIncome() >= 0 ? 'from-blue-500 to-cyan-500' : 'from-red-500 to-pink-500'} rounded-3xl p-5 shadow-xl`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-4xl">{getNetIncome() >= 0 ? '📈' : '📉'}</div>
                          <div className="flex-1">
                            <div className="text-white/90 text-xs font-bold">Net Profit</div>
                            <div className="text-white text-2xl font-extrabold tabular-nums">
                              {getNetIncome() >= 0 ? '+' : ''}${formatNumber(getNetIncome())}/s
                            </div>
                          </div>
                        </div>
                        <div className="text-white/80 text-xs">
                          {getNetIncome() >= 0 ? 'Profitable!' : 'Losing Money!'}
                        </div>
                      </motion.div>
                    </div>

                    {/* Service Quality */}
                    <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-5 h-5 text-yellow-500" />
                          <span className="font-bold text-gray-800">Service Quality</span>
                        </div>
                        <span className={`text-2xl font-extrabold ${
                          serviceQuality >= 75 ? 'text-green-600' :
                          serviceQuality >= 55 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {Math.floor(serviceQuality)}%
                        </span>
                      </div>
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${serviceQuality}%` }}
                          className={`h-full rounded-full ${
                            serviceQuality >= 75 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                            serviceQuality >= 55 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                            'bg-gradient-to-r from-red-400 to-pink-500'
                          }`}
                        />
                      </div>
                      <div className="text-xs text-gray-600 mt-2">
                        {serviceQuality >= 75 ? '✨ Excellent - Users are thrilled!' :
                         serviceQuality >= 55 ? '👍 Good - Users are satisfied' :
                         serviceQuality >= 35 ? '😐 Mediocre - Users are leaving' :
                         '😰 Poor - Mass exodus!'}
                      </div>
                    </div>

                    {/* Agent Breakdown */}
                    {agents.some(a => a.count > 0) && (
                      <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-purple-500" />
                          Agent Performance
                        </h4>
                        <div className="space-y-2">
                          {agents.filter(a => a.count > 0).map(agent => (
                            <div key={agent.id} className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-lg flex-shrink-0`}>
                                {agent.emoji}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-gray-700">{agent.name} ×{agent.count}</span>
                                  <span className="text-purple-600 font-bold">+{formatNumber(getUsersPerSecond(agent))}/s</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                                  <div
                                    className={`h-full bg-gradient-to-r ${agent.color} rounded-full`}
                                    style={{ width: `${getAgentQuality(agent)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lifetime Stats */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-5 shadow-lg border-2 border-indigo-200">
                      <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-indigo-600" />
                        Lifetime Statistics
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-indigo-600 font-bold">Total Revenue</div>
                          <div className="text-2xl font-extrabold text-indigo-900 tabular-nums">
                            ${formatNumber(lifetimeRevenue)}
                          </div>
                        </div>
                        <div>
                          <div className="text-indigo-600 font-bold">Total Users</div>
                          <div className="text-2xl font-extrabold text-indigo-900 tabular-nums">
                            {formatNumber(lifetimeUsers)}
                          </div>
                        </div>
                        <div>
                          <div className="text-indigo-600 font-bold">Active Agents</div>
                          <div className="text-2xl font-extrabold text-indigo-900 tabular-nums">
                            {agents.reduce((s, a) => s + a.count, 0)}
                          </div>
                        </div>
                        <div>
                          <div className="text-indigo-600 font-bold">Models Unlocked</div>
                          <div className="text-2xl font-extrabold text-indigo-900 tabular-nums">
                            {models.filter(m => m.unlocked).length}/{models.length}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Profit History Graph */}
                    <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-200">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Profit History ($/s)
                      </h4>
                      <div className="flex items-end justify-between gap-1 h-32">
                        {revenueHistory.map((value, index) => {
                          const maxValue = Math.max(...revenueHistory, 1);
                          const height = (Math.max(0, value) / maxValue) * 100;
                          return (
                            <div key={index} className="flex-1 flex flex-col justify-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                className={`w-full rounded-t-lg ${
                                  value >= 0
                                    ? 'bg-gradient-to-t from-green-400 to-emerald-500'
                                    : 'bg-gradient-to-t from-red-400 to-pink-500'
                                }`}
                                style={{ minHeight: value !== 0 ? '4px' : '0' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-center text-xs text-gray-500">
                        Current: <span className={`font-bold ${getNetIncome() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${formatNumber(getNetIncome())}/s
                        </span>
                      </div>
                    </div>

                    {/* Social Media Feed */}
                    {socialPosts.length > 0 && (
                      <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <span className="text-xl">💬</span>
                          Social Media Buzz
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          <AnimatePresence initial={false}>
                            {socialPosts.slice(0, 8).map((post) => (
                              <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className={`p-3 rounded-2xl border-2 ${
                                  post.sentiment === 'positive'
                                    ? 'bg-green-50 border-green-200'
                                    : post.sentiment === 'negative'
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="text-2xl">
                                    {post.sentiment === 'positive' ? '😊' : post.sentiment === 'negative' ? '😡' : '😐'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold mb-1 ${
                                      post.sentiment === 'positive'
                                        ? 'text-green-700'
                                        : post.sentiment === 'negative'
                                        ? 'text-red-700'
                                        : 'text-gray-700'
                                    }`}>
                                      {post.username}
                                    </div>
                                    <div className="text-sm text-gray-700">{post.message}</div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'upgrades' && (
                  <div>
                    <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2 text-xl">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      Reputation Upgrades
                    </h3>
                    {reputation === 0 ? (
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl p-8 border-2 border-yellow-200">
                        <div className="text-center">
                          <div className="text-6xl mb-4">🏆</div>
                          <h4 className="text-xl font-bold text-gray-800 mb-2">No Reputation Yet</h4>
                          <p className="text-gray-600">
                            Reach funding milestones to earn reputation points. Use them to unlock permanent upgrades that persist across pivots!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-3xl p-5 border-2 border-yellow-300 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-6 h-6 text-yellow-700" />
                              <span className="font-bold text-yellow-800 text-lg">Available Reputation</span>
                            </div>
                            <span className="text-3xl font-extrabold text-yellow-700">{reputation}</span>
                          </div>
                        </div>

                        {reputationUpgrades.map((upgrade) => (
                          <motion.div
                            key={upgrade.id}
                            whileHover={{ scale: upgrade.purchased ? 1 : 1.02 }}
                            whileTap={{ scale: upgrade.purchased ? 1 : 0.98 }}
                            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer ${
                              upgrade.purchased
                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md'
                                : reputation >= upgrade.cost
                                ? 'bg-white border-yellow-400 shadow-lg hover:shadow-xl'
                                : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                            }`}
                            onClick={() => !upgrade.purchased && buyReputationUpgrade(upgrade.id)}
                          >
                            <div className="flex items-start gap-4">
                              <div className="text-4xl flex-shrink-0">⚡</div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-gray-800 mb-1 text-lg">{upgrade.name}</div>
                                <div className="text-gray-600">{upgrade.description}</div>
                              </div>
                              {upgrade.purchased ? (
                                <span className="px-4 py-2 rounded-full bg-green-400 text-white font-bold flex-shrink-0">✓</span>
                              ) : (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border-2 border-yellow-300 flex-shrink-0">
                                  <Trophy className="w-5 h-5 text-yellow-700" />
                                  <span className="font-bold text-yellow-700 text-lg">{upgrade.cost}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'achievements' && (
                  <div>
                    <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2 text-xl">
                      <Star className="w-6 h-6 text-yellow-500" />
                      Achievements
                    </h3>
                    <div className="space-y-3">
                      {achievements.map((achievement) => (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-5 rounded-3xl border-2 transition-all ${
                            achievement.unlocked
                              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`text-4xl flex-shrink-0 ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                              {achievement.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-bold mb-1 text-lg ${achievement.unlocked ? 'text-yellow-800' : 'text-gray-500'}`}>
                                {achievement.name}
                              </div>
                              <div className="text-gray-600 mb-2">{achievement.description}</div>
                              {!achievement.unlocked && achievement.target && achievement.progress !== undefined && (
                                <div className="mt-2">
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(100, (achievement.progress / achievement.target) * 100)}%` }}
                                      className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                                    />
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {formatNumber(achievement.progress)} / {formatNumber(achievement.target)}
                                  </div>
                                </div>
                              )}
                            </div>
                            {achievement.unlocked && (
                              <span className="px-3 py-1.5 rounded-full bg-yellow-400 text-white font-bold flex-shrink-0">✓</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Controls */}
                <div className="bg-white rounded-3xl p-4 border-2 border-gray-200 shadow-lg">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-gray-600 font-bold text-sm">Game Speed:</div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setGameSpeed(0)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          gameSpeed === 0
                            ? 'bg-red-400 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Pause"
                      >
                        <span className="text-2xl">⏸</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setGameSpeed(1)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          gameSpeed === 1
                            ? 'bg-green-400 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Normal Speed (1x)"
                      >
                        <span className="text-2xl">▶</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setGameSpeed(2)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          gameSpeed === 2
                            ? 'bg-blue-400 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Fast (2x)"
                      >
                        <span className="text-2xl">⏩</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setGameSpeed(5)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          gameSpeed === 5
                            ? 'bg-purple-400 text-white shadow-lg'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                        title="Ultra Fast (5x)"
                      >
                        <span className="text-2xl">⏭</span>
                      </motion.button>
                    </div>
                    <div className="text-gray-700 font-bold tabular-nums min-w-[40px]">{gameSpeed}x</div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                {/* AI Models Shop */}
                <div>
                  <h3 className="font-extrabold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Models Shop
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {models.map((model) => (
                      <motion.div
                        key={model.id}
                        whileHover={{ scale: model.unlocked ? 1 : 1.05 }}
                        whileTap={{ scale: model.unlocked ? 1 : 0.95 }}
                        className={`min-w-[140px] p-4 rounded-3xl border-2 transition-all ${
                          model.unlocked
                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md'
                            : tokens >= model.unlockCost
                            ? 'bg-white border-purple-300 shadow-lg cursor-pointer hover:shadow-xl'
                            : 'bg-gray-50 border-gray-200 opacity-50'
                        }`}
                        onClick={() => !model.unlocked && unlockModel(model.id)}
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">🧠</div>
                          <div className="text-xs font-bold text-gray-800 mb-2 leading-tight">
                            {model.name}
                          </div>
                          <div className="space-y-1 mb-2">
                            <div className="text-xs text-gray-600">${model.costPerToken}/tok</div>
                            <div className="text-xs text-purple-600 font-bold">{model.qualityMultiplier}x quality</div>
                          </div>
                          {model.unlocked ? (
                            <div className="px-2 py-1 rounded-full bg-green-400 text-white text-xs font-bold">
                              Unlocked ✓
                            </div>
                          ) : (
                            <div className="px-2 py-1 rounded-full bg-purple-100 border border-purple-300 text-purple-700 text-xs font-bold">
                              ${formatNumber(model.unlockCost)}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* AI Agents */}
                <div>
                  <h3 className="font-extrabold text-gray-800 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    AI Agents
                  </h3>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {agents.map((agent, index) => {
                        const cost = getCost(agent);
                        const usersPerSecond = getUsersPerSecond(agent);
                        const canAfford = tokens >= cost;
                        const isUnlocked = tokens >= agent.unlockThreshold || agent.count > 0;
                        const manager = managers.find(m => m.agentId === agent.id);

                        if (!isUnlocked) return null;

                        return (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-3xl p-4 shadow-md border-2 border-gray-200 hover:shadow-lg transition-all"
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                                {agent.emoji}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-gray-800 text-sm">{agent.name}</h4>
                                  {manager?.purchased && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-green-400 text-white text-xs font-bold">AUTO</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                  <span className="font-bold">×{agent.count}</span>
                                  {agent.count > 0 && (
                                    <>
                                      <span className="text-purple-600 font-bold">+{formatNumber(usersPerSecond)}/s</span>
                                      <span className={`font-bold ${
                                        getAgentQuality(agent) >= 75 ? 'text-green-600' :
                                        getAgentQuality(agent) >= 55 ? 'text-yellow-600' :
                                        'text-orange-600'
                                      }`}>
                                        {Math.floor(getAgentQuality(agent))}%
                                      </span>
                                    </>
                                  )}
                                </div>

                                {/* Controls */}
                                {agent.count > 0 && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <button
                                      onClick={() => setEditingAgent(agent.id)}
                                      className={`px-2 py-1 rounded-xl text-xs font-bold transition-all ${
                                        agent.promptQuality < 60
                                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      📝 {agent.promptQuality}%
                                    </button>

                                    <select
                                      value={agent.selectedModel}
                                      onChange={(e) => changeAgentModel(agent.id, e.target.value)}
                                      className="px-2 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold appearance-none cursor-pointer hover:bg-gray-200"
                                    >
                                      {models.filter(m => m.unlocked).map(model => (
                                        <option key={model.id} value={model.id}>
                                          {model.name.split(' ')[0]}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                {/* Buy/Manager Buttons */}
                                <div className="flex items-center gap-2">
                                  {manager && !manager.purchased && agent.count >= 10 && (
                                    <motion.button
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => buyManager(manager.id)}
                                      disabled={tokens < manager.cost}
                                      className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        tokens >= manager.cost
                                          ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-md'
                                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      }`}
                                    >
                                      Manager ${formatNumber(manager.cost)}
                                    </motion.button>
                                  )}

                                  <motion.button
                                    whileHover={canAfford ? { scale: 1.05 } : {}}
                                    whileTap={canAfford ? { scale: 0.95 } : {}}
                                    onClick={() => buyAgent(agent.id)}
                                    disabled={!canAfford}
                                    className={`flex-1 px-3 py-2 rounded-xl font-bold shadow-md transition-all ${
                                      canAfford
                                        ? `bg-gradient-to-r ${agent.color} text-white hover:shadow-lg`
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    <div className="text-sm tabular-nums">${formatNumber(cost)}</div>
                                  </motion.button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editingAgent && (
          <PromptEditor
            agentName={agents.find(a => a.id === editingAgent)?.name || ''}
            currentQuality={agents.find(a => a.id === editingAgent)?.promptQuality || 0}
            onClose={() => setEditingAgent(null)}
            onImprove={(improvement) => improvePrompt(editingAgent, improvement)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPivotModal && (
          <PivotModal
            onClose={() => setShowPivotModal(false)}
            onPivot={pivot}
            reputation={reputation}
            reputationGain={FUNDING_STAGES.find(s => s.id === 'ipo')?.reputationGain || 0}
            lifetimeUsers={lifetimeUsers}
            lifetimeRevenue={lifetimeRevenue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
