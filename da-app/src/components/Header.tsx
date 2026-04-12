'use client'

import { BarChart2, ChevronsUp, Star, DollarSign, Users } from 'lucide-react'
import { useGame } from '../context/GameContext'
import { HeaderButton } from './HeaderButton'

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
  return `$${n.toFixed(0)}`
}

export type HeaderTab = 'stats' | 'upgrades' | 'achievements'

type HeaderViewProps = {
  arr: number
  users: number
  activeTab?: HeaderTab
  onTabChange?: (tab: HeaderTab) => void
}

const COLOR_ACTIVE = '#1fc46a'
const COLOR_INACTIVE = '#b3b3b3'
const COLOR_USERS = '#3f81ea'
const COLOR_BORDER = '#d9d9d9'

export function HeaderView({
  arr,
  users,
  activeTab = 'stats',
  onTabChange,
}: HeaderViewProps) {
  return (
    <header
      className="flex items-center justify-center px-2 py-3 border-b"
      style={{ background: '#ffffff', borderColor: COLOR_BORDER }}
    >
      <div className="flex items-center gap-16">
        {/* Tabs */}
        <div className="flex items-center gap-10">
          <HeaderButton
            text="Stats"
            variant={activeTab === 'stats' ? 'Active' : 'Default'}
            icon={<BarChart2 size={32} strokeWidth={1.5} color={activeTab === 'stats' ? COLOR_ACTIVE : COLOR_INACTIVE} style={{ flexShrink: 0 }} />}
            onClick={() => onTabChange?.('stats')}
          />
          <HeaderButton
            text="Upgrades"
            variant={activeTab === 'upgrades' ? 'Active' : 'Default'}
            icon={<ChevronsUp size={32} strokeWidth={1.5} color={activeTab === 'upgrades' ? COLOR_ACTIVE : COLOR_INACTIVE} style={{ flexShrink: 0 }} />}
            onClick={() => onTabChange?.('upgrades')}
          />
          <HeaderButton
            text="Achievements"
            variant={activeTab === 'achievements' ? 'Active' : 'Default'}
            icon={<Star size={32} strokeWidth={1.5} color={activeTab === 'achievements' ? COLOR_ACTIVE : COLOR_INACTIVE} style={{ flexShrink: 0 }} />}
            onClick={() => onTabChange?.('achievements')}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center">
          <div className="flex items-center gap-1 px-2 py-2">
            <DollarSign size={24} strokeWidth={1.5} color={COLOR_ACTIVE} style={{ flexShrink: 0 }} />
            <span
              className="text-base font-bold leading-none whitespace-nowrap font-sans"
              style={{ color: COLOR_ACTIVE }}
            >
              {fmtMoney(arr)}
            </span>
          </div>

          <div className="flex items-center gap-1 h-10 px-2 py-2">
            <Users size={24} strokeWidth={1.5} color={COLOR_USERS} style={{ flexShrink: 0 }} />
            <span
              className="text-base font-bold leading-none whitespace-nowrap font-sans"
              style={{ color: COLOR_USERS }}
            >
              {users.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

export function Header() {
  const { state } = useGame()
  return <HeaderView arr={state.arr} users={state.users} />
}
