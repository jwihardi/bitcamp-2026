'use client'

import { Button } from './Button'
import { Text } from './Text'

export type CtoReport = {
  health: 'healthy' | 'warning' | 'critical'
  verdict: string
  advice: string[]
  lesson: { topic: string; body: string }
  promptCoaching: {
    agentName: string
    quality: number
    summary: string
    tips: string[]
  }[]
}

type CTOPanelProps = {
  collapsed: boolean
  onToggle: () => void
  report: CtoReport | null
  loading: boolean
  error: string | null
  fresh: boolean
}

const COLORS = {
  border: 'var(--sds-color-border-default-default,#d9d9d9)',
  surface: 'var(--sds-color-background-default-default,#ffffff)',
  surfaceSubtle: 'var(--sds-color-background-neutral-tertiary,#e3e3e3)',
  text: 'var(--sds-color-text-default-default,#1e1e1e)',
  textMuted: 'var(--sds-color-text-default-tertiary,#b3b3b3)',
  brand: 'var(--sds-color-background-brand-default,#1fc46a)',
  brandOn: 'var(--sds-color-text-brand-on-brand,#f5f5f5)',
  warning: 'var(--sds-color-background-neutral-secondary,#cdcdcd)',
  critical: 'var(--sds-color-background-negative-default,#ef4444)',
}

export function CTOPanel({
  collapsed,
  onToggle,
  report,
  loading,
  error,
  fresh,
}: CTOPanelProps) {
  const healthLabel = report?.health ?? null
  const healthColor = report
    ? report.health === 'healthy'
      ? COLORS.brand
      : report.health === 'warning'
        ? COLORS.warning
        : COLORS.critical
    : null

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between gap-3 px-1 py-1">
        <Button
          label="AI CTO"
          size="Small"
          variant="Neutral"
          iconStart={<span className="text-[16px]">🧑‍💻</span>}
          onClick={onToggle}
        />
        {healthLabel && healthColor && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
            style={{ background: healthColor, color: COLORS.brandOn }}
          >
            {healthLabel}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="absolute bottom-full left-0 right-0 mb-3 flex justify-center">
          <div
            className="w-full max-w-[720px] border rounded-[16px] overflow-hidden shadow-[0px_12px_30px_0px_rgba(0,0,0,0.15)]"
            style={{ background: COLORS.surface, borderColor: COLORS.border }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">🧑‍💻</span>
                <Text size="md" weight="bold" style={{ color: COLORS.text }}>
                  AI CTO
                </Text>
                {healthLabel && healthColor && (
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
                    style={{ background: healthColor, color: COLORS.brandOn }}
                  >
                    {healthLabel}
                  </span>
                )}
              </div>
              <Button label="Close" size="Small" variant="Subtle" onClick={onToggle} />
            </div>

            <div className="px-4 pb-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
              {fresh && (
                <div
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2"
                  style={{ background: COLORS.surfaceSubtle, border: `1px solid ${COLORS.border}` }}
                >
                  <span className="text-[13px]">✓</span>
                  <Text size="sm" weight="semibold" style={{ color: COLORS.text }}>
                    Updated
                  </Text>
                </div>
              )}

              <Text size="sm" style={{ color: COLORS.textMuted }} className="text-center">
                Auto-consults on stage advance &amp; new agents
              </Text>

              {error && (
                <div
                  className="rounded-[12px] px-3 py-2"
                  style={{ background: COLORS.surfaceSubtle, border: `1px solid ${COLORS.border}` }}
                >
                  <Text size="sm" weight="bold" style={{ color: COLORS.text }}>
                    {error}
                  </Text>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: COLORS.border, borderTopColor: COLORS.textMuted }}
                  />
                  <Text size="sm" style={{ color: COLORS.textMuted }}>
                    Consulting CTO...
                  </Text>
                </div>
              )}

              {report && !loading && (
                <>
                  <Text
                    as="p"
                    size="sm"
                    style={{
                      color: COLORS.text,
                      fontStyle: 'italic',
                      borderLeft: `3px solid ${COLORS.border}`,
                      paddingLeft: 10,
                    }}
                  >
                    {report.verdict}
                  </Text>

                  <div className="flex flex-col gap-2">
                    {report.advice.map((item, i) => (
                      <div
                        key={i}
                        className="rounded-[12px] px-3 py-2 flex gap-2 items-start"
                        style={{ background: COLORS.surfaceSubtle, border: `1px solid ${COLORS.border}` }}
                      >
                        <span
                          className="font-extrabold text-[12px] shrink-0 w-[20px] h-[20px] rounded-full flex items-center justify-center"
                          style={{ background: COLORS.brand, color: COLORS.brandOn }}
                        >
                          {i + 1}
                        </span>
                        <Text as="p" size="sm" style={{ color: COLORS.text }}>
                          {item}
                        </Text>
                      </div>
                    ))}
                  </div>

                  <div
                    className="rounded-[14px] px-3 py-3"
                    style={{ background: COLORS.surfaceSubtle, border: `1px solid ${COLORS.border}` }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[16px]">💡</span>
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide"
                        style={{ background: COLORS.brand, color: COLORS.brandOn }}
                      >
                        {report.lesson.topic}
                      </span>
                    </div>
                    <Text as="p" size="sm" style={{ color: COLORS.text }}>
                      {report.lesson.body}
                    </Text>
                  </div>

                  {report.promptCoaching.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <Text size="sm" className="text-center" style={{ color: COLORS.textMuted }}>
                        Prompt Coaching
                      </Text>
                      {report.promptCoaching.map((entry) => (
                        <div
                          key={entry.agentName}
                          className="rounded-[14px] px-3 py-3"
                          style={{ background: COLORS.surfaceSubtle, border: `1px solid ${COLORS.border}` }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <Text size="sm" weight="bold" style={{ color: COLORS.text }}>
                              {entry.agentName}
                            </Text>
                            <span
                              className="text-[11px] font-extrabold px-2 py-1 rounded-full"
                              style={{ background: COLORS.brand, color: COLORS.brandOn }}
                            >
                              {entry.quality}%
                            </span>
                          </div>
                          <Text as="p" size="sm" style={{ color: COLORS.text }}>
                            {entry.summary}
                          </Text>
                          <div className="flex flex-col gap-1 mt-2">
                            {entry.tips.map((tip, i) => (
                              <div key={`${entry.agentName}-${i}`} className="flex gap-2 items-start">
                                <span className="text-[12px]" style={{ color: COLORS.textMuted }}>•</span>
                                <Text as="p" size="sm" style={{ color: COLORS.text }}>
                                  {tip}
                                </Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!report && !loading && (
                <Text size="sm" className="text-center" style={{ color: COLORS.textMuted }}>
                  Your AI CTO gives strategic advice on growing your agent empire and teaches startup tech concepts.
                </Text>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
