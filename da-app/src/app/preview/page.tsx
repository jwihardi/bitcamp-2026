'use client'

import { useState } from 'react'

// ---- Static data from the Figma design ----

type FundingStage = {
  index: number
  label: string
  active: boolean
}

const FUNDING_STAGES: FundingStage[] = [
  { index: 1, label: 'Bootstrapped', active: true },
  { index: 2, label: 'Pre-Seed', active: false },
  { index: 3, label: 'Seed Round', active: false },
  { index: 4, label: 'Series A', active: false },
  { index: 5, label: 'Series B', active: false },
  { index: 6, label: 'Series C', active: false },
  { index: 7, label: 'IPO', active: false },
]

type AgentItem = {
  id: string
  name: string
  emoji: string
  count: number
  price: string
  iconGradient: string
  priceGradient: string
}

const AGENTS: AgentItem[] = [
  {
    id: 'chatbot',
    name: 'Chatbot Agent',
    emoji: '💬',
    count: 0,
    price: '$15',
    iconGradient: 'linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(0, 184, 219) 100%)',
    priceGradient: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(0, 184, 219) 100%)',
  },
  {
    id: 'image',
    name: 'Image Generator',
    emoji: '🎨',
    count: 0,
    price: '$120',
    iconGradient: 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(246, 51, 154) 100%)',
    priceGradient: 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(246, 51, 154) 100%)',
  },
]

type ModelItem = {
  id: string
  name: string
  costPerTok: string
  multiplier: string
  owned: boolean
  price?: string
}

const MODELS: ModelItem[] = [
  { id: 'gpt35', name: 'GPT-3.5 Turbo', costPerTok: '$0.002/tok', multiplier: '1x', owned: true },
  { id: 'gpt4', name: 'GPT-4', costPerTok: '$0.015/tok', multiplier: '1.3x', owned: false, price: '$500' },
  { id: 'sonnet', name: 'Claude Sonnet', costPerTok: '$0.02/tok', multiplier: '1.5x', owned: false, price: '$5.00K' },
  { id: 'gpt4o', name: 'GPT-4o', costPerTok: '$0.035/tok', multiplier: '1.8x', owned: false, price: '$25.00K' },
  { id: 'opus', name: 'Claude Opus', costPerTok: '$0.08/tok', multiplier: '2.2x', owned: false, price: '$100.00K' },
]

// ---- Reusable pieces ----

function HeaderStat({
  value,
  label,
  gradient,
}: {
  value: string
  label: string
  gradient: string
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-full px-5 py-2 shadow-lg"
      style={{ backgroundImage: gradient }}
    >
      <div className="flex flex-col items-center leading-tight">
        <span className="text-[18px] font-extrabold text-white">{value}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/90">
          {label}
        </span>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor: string
}) {
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
  const [users, setUsers] = useState(15)
  const [bounce, setBounce] = useState(false)

  const handleClick = () => {
    setUsers((u) => u + 1)
    setBounce(true)
    window.setTimeout(() => setBounce(false), 150)
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundImage:
          'linear-gradient(148.787deg, rgb(240, 249, 255) 0%, rgb(255, 255, 255) 50%, rgb(250, 245, 255) 100%)',
      }}
    >
      <div className="mx-auto max-w-[1800px] px-6 pb-12 pt-8 lg:px-10 lg:pt-10">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-[28px] shadow-md"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, rgb(194, 122, 255) 0%, rgb(81, 162, 255) 100%)',
              }}
            >
              🤖
            </div>
            <div className="flex flex-col">
              <h1 className="text-[24px] font-extrabold leading-tight text-[#1e2939]">
                AI Agent Empire
              </h1>
              <span
                className="mt-1 inline-flex w-fit items-center rounded-full px-3 py-0.5 text-[11px] font-bold text-white shadow-sm"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, rgb(5, 223, 114) 0%, rgb(0, 188, 125) 100%)',
                }}
              >
                Bootstrapped
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HeaderStat
              value="$377"
              label="Cash"
              gradient="linear-gradient(150.499deg, rgb(5, 223, 114) 0%, rgb(0, 188, 125) 100%)"
            />
            <HeaderStat
              value={String(users)}
              label="Users"
              gradient="linear-gradient(145.982deg, rgb(194, 122, 255) 0%, rgb(246, 51, 154) 100%)"
            />
            <HeaderStat
              value="100%"
              label="Quality"
              gradient="linear-gradient(151.797deg, rgb(81, 162, 255) 0%, rgb(0, 184, 219) 100%)"
            />
          </div>
        </header>

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
                className={`mt-6 flex h-[160px] w-[160px] items-center justify-center rounded-full border-8 border-white text-[60px] shadow-[0px_25px_50px_0px_rgba(0,0,0,0.25)] transition-transform active:scale-95 ${
                  bounce ? 'scale-95' : 'scale-100'
                }`}
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, rgb(194, 122, 255) 0%, rgb(251, 100, 182) 50%, rgb(173, 70, 255) 100%)',
                }}
              >
                <span aria-hidden>✨</span>
              </button>
              <p className="mt-4 text-center text-[18px] font-bold text-[#364153]">+1 users</p>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white px-[25.6px] pb-[1.6px] pt-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2">
                <span className="text-[24px] leading-none">📊</span>
                <h3 className="text-[18px] font-extrabold text-[#1e2939]">Stats</h3>
              </div>
              <div className="flex flex-col gap-3">
                <StatRow label="User Growth" value="+0/s" valueColor="text-[#9810fa]" />
                <StatRow label="Revenue" value="+$9/s" valueColor="text-[#00a63e]" />
                <StatRow label="Token Costs" value="-$0/s" valueColor="text-[#f54900]" />
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
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[14px] font-bold ${
                        stage.active
                          ? 'text-white shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]'
                          : 'bg-[#e5e7eb] text-[#99a1af]'
                      }`}
                      style={
                        stage.active
                          ? {
                              backgroundImage:
                                'linear-gradient(135deg, rgb(81, 162, 255) 0%, rgb(0, 184, 219) 100%)',
                            }
                          : undefined
                      }
                    >
                      {stage.index}
                    </div>
                    <p
                      className={`text-[14px] font-bold ${
                        stage.active ? 'text-[#364153]' : 'text-[#99a1af]'
                      }`}
                    >
                      {stage.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ============ MIDDLE COLUMN — AI Agents ============ */}
          <section className="flex flex-col gap-4 rounded-[24px] border-[1.6px] border-[#e5e7eb] bg-white p-[25.6px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2">
              <span className="text-[22px] leading-none">💼</span>
              <h2 className="text-[18px] font-extrabold text-[#1e2939]">AI Agents</h2>
            </div>

            <div className="flex flex-col gap-4">
              {AGENTS.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-4 transition-shadow hover:shadow-md"
                >
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
                    <span className="text-[12px] font-bold uppercase tracking-wide opacity-90">
                      Buy
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </section>

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
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${
                    model.owned
                      ? 'border-[#05df72]/60'
                      : 'border-[#e5e7eb] hover:border-[#c27bff]'
                  }`}
                  style={
                    model.owned
                      ? {
                          backgroundImage:
                            'linear-gradient(170.259deg, rgb(240, 253, 244) 0%, rgb(236, 253, 245) 100%)',
                        }
                      : undefined
                  }
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
                      style={{
                        backgroundImage:
                          'linear-gradient(150.499deg, rgb(5, 223, 114) 0%, rgb(0, 188, 125) 100%)',
                      }}
                      aria-label="Owned"
                    >
                      <span className="text-[16px] font-bold">✓</span>
                    </div>
                  ) : (
                    <p className="flex-none text-[14px] font-extrabold text-[#1e2939]">
                      {model.price}
                    </p>
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
