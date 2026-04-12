'use client'

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

export function CTOPanel({
  collapsed,
  onToggle,
  report,
  loading,
  error,
  fresh,
}: CTOPanelProps) {
  const healthDot = report
    ? report.health === 'critical' ? '🔴'
      : report.health === 'warning' ? '🟡'
      : '🟢'
    : null

  const serifTitle: React.CSSProperties = {
    fontFamily: 'var(--sds-typography-family-serif, "Noto Serif", serif)',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: 'white',
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, width: 360, zIndex: 50 }}>
      {collapsed ? (
        /* ── Collapsed pill ── */
        <button
          type="button"
          onClick={onToggle}
          className="w-full h-[52px] rounded-[20px] font-bold text-[14px] text-white shadow-[0px_10px_25px_0px_rgba(0,0,0,0.2)] flex items-center justify-center gap-[10px] transition-transform hover:-translate-y-0.5 cursor-pointer"
          style={{ backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
        >
          <span className="text-[18px]">🧑‍💻</span>
          <span style={serifTitle}>AI CTO</span>
          {healthDot && <span className="text-[14px]">{healthDot}</span>}
        </button>
      ) : (
        /* ── Expanded panel ── */
        <div className="bg-white border-[#e2e8f0] border-[1.6px] border-solid rounded-[24px] shadow-[0px_25px_50px_0px_rgba(0,0,0,0.2)] overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-[20px] py-[14px]"
            style={{ backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}
          >
            <div className="flex items-center gap-[10px]">
              <span className="text-[20px]">🧑‍💻</span>
              <p style={serifTitle}>AI CTO</p>
              {report && (
                <span
                  className={`text-[10px] font-bold px-[8px] py-[2px] rounded-full uppercase tracking-wide ${
                    report.health === 'healthy'
                      ? 'bg-emerald-500 text-white'
                      : report.health === 'warning'
                        ? 'bg-amber-400 text-white'
                        : 'bg-red-500 text-white'
                  }`}
                >
                  {report.health}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="text-white opacity-60 hover:opacity-100 text-[22px] leading-none transition-opacity cursor-pointer"
              aria-label="Collapse CTO panel"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="px-[18px] py-[16px] flex flex-col gap-[12px] max-h-[70vh] overflow-y-auto">

            {/* Fresh flash */}
            {fresh && (
              <div className="flex items-center gap-[6px] bg-[#f0fdf4] border border-[#bbf7d0] border-solid rounded-[10px] px-[12px] py-[8px]">
                <span className="text-[13px]">✓</span>
                <p className="text-[12px] text-[#15803d] font-semibold">Updated</p>
              </div>
            )}

            <p className="text-[11px] text-[#94a3b8] text-center">
              Auto-consults on stage advance &amp; new agents
            </p>

            {/* Error */}
            {error && (
              <div className="bg-[#fef2f2] border border-[#fecaca] border-solid rounded-[12px] px-[12px] py-[10px]">
                <p className="text-[12px] text-[#b91c1c] font-bold leading-[18px]">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-[8px] py-[16px]">
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin"
                  style={{ borderColor: '#cbd5e1', borderTopColor: '#475569' }}
                />
                <p className="text-[12px] text-[#94a3b8]">Consulting CTO...</p>
              </div>
            )}

            {/* Report */}
            {report && !loading && (
              <>
                {/* Verdict */}
                <p className="text-[13px] text-[#475569] italic leading-[20px] border-l-[3px] border-[#e2e8f0] pl-[10px]">
                  {report.verdict}
                </p>

                {/* Advice */}
                <div className="flex flex-col gap-[8px]">
                  {report.advice.map((item, i) => (
                    <div
                      key={i}
                      className="bg-[#f8fafc] border border-[#e2e8f0] border-solid rounded-[12px] px-[12px] py-[10px] flex gap-[10px] items-start"
                    >
                      <span
                        className="font-extrabold text-[13px] text-white shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center"
                        style={{ backgroundImage: 'linear-gradient(135deg, #1e293b, #475569)' }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[12px] text-[#334155] leading-[18px]">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Lesson */}
                <div className="bg-[#fffbeb] border border-[#fde68a] border-solid rounded-[14px] px-[14px] py-[12px]">
                  <div className="flex items-center gap-[6px] mb-[8px]">
                    <span className="text-[16px]">💡</span>
                    <span
                      className="font-bold text-[10px] text-white px-[8px] py-[2px] rounded-full uppercase tracking-wide"
                      style={{ backgroundImage: 'linear-gradient(to right, #d97706, #b45309)' }}
                    >
                      {report.lesson.topic}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#78350f] leading-[18px]">{report.lesson.body}</p>
                </div>

                {/* Prompt coaching */}
                {report.promptCoaching.length > 0 && (
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[11px] text-[#94a3b8] text-center uppercase tracking-[0.18em]">
                      Prompt Coaching
                    </p>
                    {report.promptCoaching.map((entry) => (
                      <div
                        key={entry.agentName}
                        className="bg-[#f8fafc] border border-[#e2e8f0] border-solid rounded-[14px] px-[14px] py-[12px]"
                      >
                        <div className="flex items-center justify-between gap-[12px] mb-[8px]">
                          <p className="font-bold text-[13px] text-[#1e293b]">{entry.agentName}</p>
                          <span
                            className={`text-[11px] font-extrabold px-[8px] py-[3px] rounded-full ${
                              entry.quality >= 70
                                ? 'bg-[#dcfce7] text-[#15803d]'
                                : entry.quality >= 40
                                  ? 'bg-[#fef3c7] text-[#b45309]'
                                  : 'bg-[#fee2e2] text-[#b91c1c]'
                            }`}
                          >
                            {entry.quality}%
                          </span>
                        </div>
                        <p className="text-[12px] text-[#475569] leading-[18px] mb-[8px]">{entry.summary}</p>
                        <div className="flex flex-col gap-[6px]">
                          {entry.tips.map((tip, i) => (
                            <div key={`${entry.agentName}-${i}`} className="flex gap-[8px] items-start">
                              <span className="text-[12px] text-[#64748b] leading-[18px]">•</span>
                              <p className="text-[12px] text-[#334155] leading-[18px]">{tip}</p>
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
              <p className="text-[12px] text-[#94a3b8] text-center leading-[18px] py-[4px]">
                Your AI CTO gives strategic advice on growing your agent empire and teaches startup tech concepts.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
