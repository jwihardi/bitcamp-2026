import { Fragment } from 'react'
import { ProgressStep } from './ProgressStep'
import { ProgressStem } from './ProgressStem'

const STAGES = ['Bootstrap', 'Pre-seed', 'Series A', 'Series B', 'Series C', 'IPO']

type Props = {
  /** 0=Bootstrap, 1=Pre-seed, 2=Series A, 3=Series B, 4=Series C, 5=IPO */
  stage: number
}

export function FundingProgress({ stage }: Props) {
  return (
    <div className="flex items-start w-full">
      {STAGES.map((label, i) => (
        <Fragment key={label}>
          <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 36 }}>
            <ProgressStep variant={i <= stage ? 'default' : 'unmet'} />
            <span className="text-sm leading-[1.4] text-black whitespace-nowrap font-normal font-sans">
              {label}
            </span>
          </div>
          {i < STAGES.length - 1 && (
            <div className="flex-1 flex flex-col pt-[12px]">
              <ProgressStem
                className="pointer-events-none w-full"
                variant={i + 1 <= stage ? 'default' : 'unmet'}
              />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
}
