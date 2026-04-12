'use client'

import { MoneyPile } from './MoneyPile'

type LeftPanelProps = {
  percentage: number
  userCount: number
  passiveProfitPerSecond: number
  companyName: string
  onCompanyNameChange: (name: string) => void
  onGoldButtonClick: () => void
}

export function LeftPanel({
  percentage,
  userCount,
  passiveProfitPerSecond,
  companyName,
  onCompanyNameChange,
  onGoldButtonClick,
}: LeftPanelProps) {
  return (
    <MoneyPile
      percentage={percentage}
      userCount={userCount}
      companyName={companyName}
      onCompanyNameChange={onCompanyNameChange}
      passiveProfitPerSecond={passiveProfitPerSecond}
      onGoldButtonClick={onGoldButtonClick}
    />
  )
}
