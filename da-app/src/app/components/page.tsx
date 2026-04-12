'use client'

import { MoneyPile } from '@/components/MoneyPile'
import { HeaderView } from '@/components/Header'
import { ProgressStep } from '@/components/ProgressStep'
import { ProgressStem } from '@/components/ProgressStem'
import { ProgressBar } from '@/components/ProgressBar'
import { FundingProgress } from '@/components/FundingProgress'
import { HeaderButton } from '@/components/HeaderButton'
import { ModelShopItem } from '@/components/ModelShopItem'
import { GoldButton } from '@/components/GoldButton'
import { AgentItem } from '@/components/AgentItem'
import { Button } from '@/components/Button'
import { MODELS } from '@/lib/constants'
import type { Agent } from '@/lib/types'

const SAMPLE_AGENT: Agent = {
  id: 'demo-1',
  name: 'Sales Bot',
  icon: 'robot',
  role: 'sales',
  prompt: '',
  tokenCount: 0,
  qualityScore: 99,
  driftRisk: false,
  isOffTask: false,
  modelId: 'nimbus_1',
  evalResult: null,
  evalPromptSnapshot: null,
}

export default function ComponentsPage() {
  return (
    <main className="p-8 flex flex-col gap-8">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Header</h2>
        <HeaderView arr={2_400_000} users={12_500} />
      </section>
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">ProgressStep</h2>
        <div className="flex gap-4 items-center">
          <ProgressStep variant="default" />
          <ProgressStep variant="unmet" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">ProgressStem</h2>
        <div className="flex flex-col gap-3">
          <ProgressStem variant="default" className="w-48" />
          <ProgressStem variant="unmet" className="w-48" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">ProgressBar</h2>
        <div className="flex flex-col gap-3 w-60">
          <ProgressBar value={100} color="#ffc800" />
          <ProgressBar value={60} color="#ffc800" />
          <ProgressBar value={25} color="#ffc800" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">HeaderButton</h2>
        <div className="flex gap-6 items-center">
          <HeaderButton text="Button" variant="Default" />
          <HeaderButton text="Button" variant="Active" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">GoldButton</h2>
        <div className="flex gap-8 items-center">
          <GoldButton />
          <GoldButton size={96} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">ModelShopItem</h2>
        <div className="flex gap-4 items-start flex-wrap">
          {Object.values(MODELS).map((model) => (
            <ModelShopItem key={model.id} model={model} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">MoneyPile</h2>
        <div className="flex gap-6 items-start flex-wrap">
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="flex flex-col gap-1 items-center">
              <span className="text-xs text-neutral-400">{pct}%</span>
              <div className="w-[360px]">
                <MoneyPile
                  percentage={pct}
                  companyName="Sales Bot & Co."
                  passiveProfitPerSecond={pct * 300}
                  onGoldButtonClick={() => console.log('gold button clicked', pct)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">FundingProgress</h2>
        <div className="flex flex-col gap-6 w-full max-w-2xl">
          <FundingProgress stage={0} />
          <FundingProgress stage={2} />
          <FundingProgress stage={5} />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">Button</h2>
        <div className="flex flex-col gap-4">
          {/* Medium */}
          <div className="flex gap-3 items-center flex-wrap">
            <Button label="Primary" variant="Primary" size="Medium" />
            <Button label="Neutral" variant="Neutral" size="Medium" />
            <Button label="Subtle"  variant="Subtle"  size="Medium" />
            <Button label="Disabled" variant="Primary" size="Medium" disabled />
            <Button label="Disabled" variant="Neutral" size="Medium" disabled />
            <Button label="Disabled" variant="Subtle"  size="Medium" disabled />
          </div>
          {/* Small */}
          <div className="flex gap-3 items-center flex-wrap">
            <Button label="Primary" variant="Primary" size="Small" />
            <Button label="Neutral" variant="Neutral" size="Small" />
            <Button label="Subtle"  variant="Subtle"  size="Small" />
            <Button label="Disabled" variant="Primary" size="Small" disabled />
            <Button label="Disabled" variant="Neutral" size="Small" disabled />
            <Button label="Disabled" variant="Subtle"  size="Small" disabled />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">AgentItem</h2>
        <div className="flex flex-col gap-4 w-[423px]">
          <AgentItem agent={SAMPLE_AGENT} />
          <AgentItem agent={{ ...SAMPLE_AGENT, id: 'demo-2', name: 'Growth Hacker', icon: 'rocket', role: 'marketing', qualityScore: 42, modelId: 'quanta_s' }} />
          <AgentItem agent={{ ...SAMPLE_AGENT, id: 'demo-3', name: 'Code Monkey', icon: 'wrench', role: 'engineering', qualityScore: 15, modelId: 'synapse_pro' }} />
        </div>
      </section>
    </main>
  )
}
