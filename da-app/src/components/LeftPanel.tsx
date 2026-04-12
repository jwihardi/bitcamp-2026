'use client'

import { MoneyPile } from './MoneyPile'

type LeftPanelProps = {
  percentage: number
  userCount: number
  usersPerSecond: number
  companyName: string
  onGoldButtonClick: () => void
}

export function LeftPanel({ percentage, userCount, usersPerSecond, companyName, onGoldButtonClick }: LeftPanelProps) {
  return (
    <MoneyPile
      percentage={percentage}
      userCount={userCount}
      companyName={companyName}
      usersPerSecond={usersPerSecond}
      onGoldButtonClick={onGoldButtonClick}
    />
  )
}
