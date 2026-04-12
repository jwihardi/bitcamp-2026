'use client'

import { useState } from 'react'

// ---- Types ----

type Tab = 'stats' | 'upgrades' | 'achievements'

type ReputationUpgrade = {
  id: string
  name: string
  description: string
  cost: number
  effect: string
  purchased: boolean
}

// ---- Data ----

const INITIAL_REPUTATION_UPGRADES: ReputationUpgrade[] = [
  { id: 'click-boost-1', name: 'Marketing Expertise',  description: 'Clicks give 2× users',           cost: 2,  effect: 'clickMultiplier', purchased: false },
  { id: 'starting-cash', name: 'Angel Investors',       description: 'Start with $1,500',              cost: 5,  effect: 'startingCash',    purchased: false },
  { id: 'starting-users',name: 'Early Adopters',        description: 'Start with 150 users',           cost: 8,  effect: 'startingUsers',   purchased: false },
  { id: 'prompt-boost',  name: 'Prompt Mastery',        description: 'Start with 70% prompt quality',  cost: 12, effect: 'promptQuality',   purchased: false },
  { id: 'user-gen-boost',name: 'Growth Hacking',        description: 'All agents +25% user generation',cost: 18, effect: 'userGeneration',  purchased: false },
  { id: 'cost-reduction',name: 'Token Optimization',    description: 'Token costs reduced by 20%',     cost: 22, effect: 'costReduction',   purchased: false },
  { id: 'revenue-boost', name: 'Premium Pricing',       description: 'Revenue per user +50%',          cost: 35, effect: 'revenueBoost',    purchased: false },
  { id: 'model-unlock',  name: 'Industry Connections',  description: 'Start with Quanta-S unlocked',   cost: 28, effect: 'modelUnlock',     purchased: false },
]

type FundingStage = { index: number; label: string; active: boolean }

const FUNDING_STAGES: FundingStage[] = [
  { index: 1, label: 'Bootstrapped', active: true },
  { index: 2, label: 'Pre-Seed',     active: false },
  { index: 3, label: 'Seed Round',   active: false },
  { index: 4, label: 'Series A',     active: false },
  { index: 5, label: 'Series B',     active: false },
  { index: 6, label: 'Series C',     active: false },
  { index: 7, label: 'IPO',          active: false },
]

type AgentItem = { id: string; name: string; emoji: string; count: number; price: string; iconGradient: string; priceGradient: string }

const AGENTS: AgentItem[] = [
  { id: 'chatbot', name: 'Chatbot Agent',   emoji: '💬', count: 0, price: '$15',  iconGradient: 'linear-gradient(135deg, rgb(81,162,255) 0%, rgb(0,184,219) 100%)',   priceGradient: 'linear-gradient(135deg, rgb(43,127,255) 0%, rgb(0,184,219) 100%)' },
  { id: 'image',   name: 'Image Generator', emoji: '🎨', count: 0, price: '$120', iconGradient: 'linear-gradient(135deg, rgb(173,70,255) 0%, rgb(246,51,154) 100%)', priceGradient: 'linear-gradient(135deg, rgb(173,70,255) 0%, rgb(246,51,154) 100%)' },
]

type ModelItem = { id: string; name: string; costPerTok: string; multiplier: string; owned: boolean; price?: string }

const MODELS: ModelItem[] = [
  { id: 'gpt35',  name: 'GPT-3.5 Turbo', costPerTok: '$0.002/tok', multiplier: '1x',   owned: true },
  { id: 'gpt4',   name: 'GPT-4',         costPerTok: '$0.015/tok', multiplier: '1.3x', owned: false, price: '$500' },
  { id: 'sonnet', name: 'Claude Sonnet', costPerTok: '$0.02/tok',  multiplier: '1.5x', owned: false, price: '$5.00K' },
  { id: 'gpt4o',  name: 'GPT-4o',        costPerTok: '$0.035/tok', multiplier: '1.8x', owned: false, price: '$25.00K' },
  { id: 'opus',   name: 'Claude Opus',   costPerTok: '$0.08/tok',  multiplier: '2.2x', owned: false, price: '$100.00K' },
]

// ---- Sub-components ----

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[14px] text-[#4a5565]">{label}</p>
      <p className={`text-[14px] font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}

function SubStatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[14px] text-[#6a7282]">{label}</p>
      <p className="text-[14px] text-[#6a7282]">{value}</p>
    </div>
  )
}

// ---- Main page ----

export default function PreviewPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stats')
  const [users,     setUsers]     = useState(15)
  const [bounce,    setBounce]    = useState(false)

  // Reputation state — seeded at 10 so upgrades are interactive in preview
  const [reputation,         setReputation]         = useState(10)
  const [reputationUpgrades, setReputationUpgrades] = useState<ReputationUpgrade[]>(INITIAL_REPUTATION_UPGRADES)

  const handleClick = () => {
    setUsers((u) => u + 1)
    setBounce(true)
    window.setTimeout(() => setBounce(false), 150)
  }

  const buyReputationUpgrade = (upgradeId: string) => {
    const upgrade = reputationUpgrades.find((u) => u.id === upgradeId)
    if (!upgrade || upgrade.purchased || reputation < upgrade.cost) return
    setReputation((r) => r - upgrade.cost)
    setReputationUpgrades((prev) =>
      prev.map((u) => (u.id === upgradeId ? { ...u, purchased: true } : u)),
    )
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundImage: 'linear-gradient(148.787deg, rgb(240,249,255) 0%, rgb(255,255,255) 50%, rgb(250,245,255) 100%)' }}
    >
      {/* ============ HEADER ============ */}
      <header className="flex items-center justify-between border-b border-[#d9d9d9] px-[8px] py-[12px]">
        {/* Tabs */}
        <div className="flex items-center gap-[40px]">
          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className="flex items-center gap-[8px] py-[4px]"
            style={{ color: activeTab === 'stats' ? '#1fc46a' : '#b3b3b3', fontWeight: activeTab === 'stats' ? 700 : 600 }}
          >
            <span className="text-[20px]">📊</span>
            <span className="text-[16px] leading-none whitespace-nowrap">Stats</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upgrades')}
            className="flex items-center gap-[8px] py-[4px]"
            style={{ color: activeTab === 'upgrades' ? '#1fc46a' : '#b3b3b3', fontWeight: activeTab === 'upgrades' ? 700 : 600 }}
          >
            <span className="text-[20px]">⬆️</span>
            <span className="text-[16px] leading-none whitespace-nowrap">Upgrades</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('achievements')}
            className="flex items-center gap-[8px] py-[4px]"
            style={{ color: activeTab === 'achievements' ? '#1fc46a' : '#b3b3b3', fontWeight: activeTab === 'achievements' ? 700 : 600 }}
          >
            <span className="text-[20px]">⭐</span>
            <span className="text-[16px] leading-none whitespace-nowrap">Achievements</span>
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-[8px]">
          <div className="flex items-center gap-[4px] p-[8px]">
            <span className="text-[20px]">💵</span>
            <span className="text-[16px] font-bold text-[#1fc46a] tabular-nums">100,000</span>
          </div>
          <div className="flex items-center gap-[4px] p-[8px]">
            <span className="text-[20px]">👥</span>
            <span className="text-[16px] font-bold text-[#3f81ea] tabular-nums">{users.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1800px] px-6 pb-12 pt-8 lg:px-10">
        {/* Three column layout */}
        <div className="grid gap-4 lg:grid-cols-[438px_minmax(0,1fr)_minmax(0,1fr)]">

          {/* ============ LEFT COLUMN ============ */}
          <div className="flex flex-col gap-4">
            {/* Click to attract users */}
            <div className="flex h-[300px] flex-col items-center rounded-[24px] border-4 border-[#dab2ff] bg-white px-7 pb-1 pt-7 shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)]">
              <p className="text-center text-[16px] font-bold text-[#364153]">
                👆 Click to attract users!
              </p>
              <button
                type="button"
                onClick={handleClick}
                aria-label="Attract user"
                className={`mt-6 flex h-[160px] w-[160px] items-center justify-center rounded-full border-8 border-white text-[60px] shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] transition-transform active:scale-95 ${bounce ? 'scale-95' : 'scale-100'}`}
                style={{ backgroundImage: 'linear-gradient(135deg, rgb(194,122,255) 0%, rgb(251,100,182) 50%, rgb(173,70,255) 100%)' }}
              >
                <span aria-hidden>✨</span>
              </button>
              <p className="mt-4 text-center text-[18px] font-bold text-[#364153]">+1 users</p>
            </div>

            {/* Stats card */}
            <div className="flex flex-col gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white px-[25.6px] pb-[1.6px] pt-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-[24px] leading-none">📊</span>
                <h3 className="text-[18px] font-extrabold text-[#1e2939]">Stats</h3>
              </div>
              <div className="flex flex-col gap-3">
                <StatRow label="User Growth"  value="+0/s"  valueColor="text-[#9810fa]" />
                <StatRow label="Revenue"      value="+$9/s" valueColor="text-[#00a63e]" />
                <StatRow label="Token Costs"  value="-$0/s" valueColor="text-[#f54900]" />
                <div className="mt-1 border-t border-[#e5e7eb] pt-[13.6px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-bold text-[#364153]">Net Profit</p>
                    <p className="text-[14px] font-bold text-[#00a63e]">+$9/s</p>
                  </div>
                </div>
                <div className="mt-1 flex flex-col gap-2 border-t border-[#e5e7eb] pb-4 pt-[13.6px]">
                  <SubStatRow label="Total Earned" value="$347" />
                  <SubStatRow label="Total Agents" value="0" />
                </div>
              </div>
            </div>

            {/* Funding Stage */}
            <div className="flex flex-col gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white px-[25.6px] pb-5 pt-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-[20px] leading-none">📈</span>
                <h3 className="text-[18px] font-extrabold text-[#1e2939]">Funding Stage</h3>
              </div>
              <div className="flex flex-col gap-3">
                {FUNDING_STAGES.map((stage) => (
                  <div key={stage.index} className="flex h-10 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-bold ${stage.active ? 'text-white shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1)]' : 'bg-[#e5e7eb] text-[#99a1af]'}`}
                      style={stage.active ? { backgroundImage: 'linear-gradient(135deg, rgb(81,162,255) 0%, rgb(0,184,219) 100%)' } : undefined}
                    >
                      {stage.index}
                    </div>
                    <p className={`text-[14px] font-bold ${stage.active ? 'text-[#364153]' : 'text-[#99a1af]'}`}>
                      {stage.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============ MIDDLE COLUMN — tab-driven ============ */}
          {activeTab === 'upgrades' ? (
            /* ---- Upgrades pane ---- */
            <section className="flex flex-col gap-8 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white px-6 pb-3 pt-6 shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
              {/* Page title — matches Figma node 61:2557 */}
              <p
                className="text-[40px] font-bold leading-[1.2] tracking-[-0.8px] text-black shrink-0"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                Upgrades
              </p>

              {/* Reputation balance */}
              <div className="flex items-center justify-between rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]" aria-hidden>🏆</span>
                  <div>
                    <p className="text-[13px] font-bold text-[#92400e]">Reputation Points</p>
                    <p className="text-[11px] text-[#b45309]">Earned by advancing funding stages</p>
                  </div>
                </div>
                <div
                  className="rounded-full px-4 py-1.5"
                  style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #f97316)' }}
                >
                  <p className="text-[14px] font-bold text-white tabular-nums">{reputation} pts</p>
                </div>
              </div>

              {/* Upgrade cards */}
              <div className="flex flex-col gap-2">
                {reputationUpgrades.map((upgrade) => (
                  <button
                    key={upgrade.id}
                    type="button"
                    onClick={() => buyReputationUpgrade(upgrade.id)}
                    disabled={upgrade.purchased || reputation < upgrade.cost}
                    className={`w-full rounded-[16px] border-[1.6px] border-solid px-3 py-[10px] text-left transition-all ${
                      upgrade.purchased
                        ? 'cursor-default border-[#86efac] bg-[#f0fdf4]'
                        : reputation >= upgrade.cost
                          ? 'cursor-pointer border-[#dab2ff] bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.05)] hover:-translate-y-0.5'
                          : 'cursor-not-allowed border-[#e5e7eb] bg-[#f9fafb] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold leading-[18px] text-[#1e2939]">{upgrade.name}</p>
                        <p className="text-[11px] font-normal leading-[16px] text-[#6a7282]">{upgrade.description}</p>
                      </div>
                      {upgrade.purchased ? (
                        <span className="shrink-0 text-[11px] font-bold text-[#00a63e]">✓ Active</span>
                      ) : (
                        <div
                          className="shrink-0 rounded-full px-2 py-0.5"
                          style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #f97316)' }}
                        >
                          <p className="whitespace-nowrap text-[11px] font-bold text-white tabular-nums">{upgrade.cost} pts</p>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : activeTab === 'achievements' ? (
            /* ---- Achievements placeholder ---- */
            <section className="flex flex-col items-center justify-center gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white p-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
              <span className="text-[48px]">🏆</span>
              <p className="text-[18px] font-bold text-[#1e2939]">Achievements</p>
              <p className="text-[14px] text-[#6a7282]">Coming soon</p>
            </section>
          ) : (
            /* ---- Stats tab → AI Agents ---- */
            <section className="flex flex-col gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white p-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-[22px] leading-none">💼</span>
                <h2 className="text-[18px] font-extrabold text-[#1e2939]">AI Agents</h2>
              </div>
              <div className="flex flex-col gap-4">
                {AGENTS.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-4 transition-shadow hover:shadow-md">
                    <div
                      className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-[30px] shadow-md"
                      style={{ backgroundImage: agent.iconGradient }}
                    >
                      <span aria-hidden>{agent.emoji}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-[18px] font-bold text-[#1e2939]">{agent.name}</p>
                      <p className="text-[14px] text-[#6a7282]">×{agent.count}</p>
                    </div>
                    <button
                      type="button"
                      className="flex flex-none items-center gap-2 rounded-xl px-5 py-3 text-white shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5"
                      style={{ backgroundImage: agent.priceGradient }}
                    >
                      <span className="text-[16px] font-extrabold">{agent.price}</span>
                      <span className="text-[12px] font-bold uppercase tracking-wide opacity-90">Buy</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ============ RIGHT COLUMN — AI Models ============ */}
          <section className="flex flex-col gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white p-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2">
              <span className="text-[22px] leading-none">🤖</span>
              <h2 className="text-[18px] font-extrabold text-[#1e2939]">AI Models</h2>
            </div>
            <div className="flex flex-col gap-3">
              {MODELS.map((model) => (
                <div
                  key={model.id}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${model.owned ? 'border-[#05df72]/60' : 'border-[#e5e7eb] hover:border-[#c27bff]'}`}
                  style={model.owned ? { backgroundImage: 'linear-gradient(170.259deg, rgb(240,253,244) 0%, rgb(236,253,245) 100%)' } : undefined}
                >
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#f3f4f6] text-[20px]">
                    <span aria-hidden>🧠</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="truncate text-[15px] font-bold text-[#1e2939]">{model.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[12px] text-[#6a7282]">{model.costPerTok}</span>
                      <span className="text-[11px] font-bold text-[#9810fa]">{model.multiplier}</span>
                    </div>
                  </div>
                  {model.owned ? (
                    <div
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-white shadow"
                      style={{ backgroundImage: 'linear-gradient(150.499deg, rgb(5,223,114) 0%, rgb(0,188,125) 100%)' }}
                      aria-label="Owned"
                    >
                      <span className="text-[16px] font-bold">✓</span>
                    </div>
                  ) : (
                    <p className="flex-none text-[14px] font-extrabold text-[#1e2939]">{model.price}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
