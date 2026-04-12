'use client'

import { MoneyPile } from './MoneyPile'

type LeftPanelProps = {
  percentage: number
  userCount: number
  passiveProfitPerSecond: number
  companyName: string
  onGoldButtonClick: () => void
}

export function LeftPanel({
  percentage,
  userCount,
  passiveProfitPerSecond,
  companyName,
  onGoldButtonClick,
}: LeftPanelProps) {
  return (
    <MoneyPile
      percentage={percentage}
      userCount={userCount}
      companyName={companyName}
      passiveProfitPerSecond={passiveProfitPerSecond}
      onGoldButtonClick={onGoldButtonClick}
    />
  )
}
