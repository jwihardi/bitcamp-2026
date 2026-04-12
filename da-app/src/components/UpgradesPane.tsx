import type { ReputationUpgrade } from '@/app/game-config'

type UpgradesPaneProps = {
  reputation: number
  upgrades: ReputationUpgrade[]
  onBuy: (id: string) => void
}

export function UpgradesPane({ reputation, upgrades, onBuy }: UpgradesPaneProps) {
  return (
    <div className="flex flex-col gap-8 px-6 pb-3 pt-6">
      {/* Page title — Figma node 61:2557 */}
      <p
        className="text-[40px] font-bold leading-[1.2] tracking-[-0.8px] text-black shrink-0"
        style={{ fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)' }}
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
        {upgrades.map((upgrade) => (
          <button
            key={upgrade.id}
            type="button"
            onClick={() => onBuy(upgrade.id)}
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
                  <p className="whitespace-nowrap text-[11px] font-bold text-white tabular-nums">
                    {upgrade.cost} pts
                  </p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
