# TIP_CARDS.md — Vibe Combinator

Tip cards are static, pre-written contextual hints that appear at key moments. They exist to teach real financial/startup concepts and to give players actionable guidance when they're struggling. They are not live AI responses — they are pre-written and triggered by game conditions.

---

## Tip card shape

```ts
type TipCard = {
  id: string              // unique, used to prevent re-firing
  trigger: TipTrigger
  title: string
  body: string            // 1–3 sentences
  concept?: string        // optional real-world concept label, e.g. "Burn rate"
  dismissLabel: string    // label for the dismiss button, default "Got it"
}
```

---

## Display behavior

- Tip cards slide in from the bottom-right corner as a small card (not a full-screen overlay)
- They do not pause the game
- The player dismisses by clicking the button or clicking outside the card
- Each tip fires at most once per run — track fired tip IDs in component state
- At most one tip card is shown at a time; queue additional tips if multiple triggers fire simultaneously

---

## Trigger types

```ts
type TipTrigger =
  | 'first_agent_hired'
  | 'first_tick'
  | 'first_low_score'          // any agent drops below 40
  | 'first_drift'              // first off-task event
  | 'entered_burn_mode'
  | 'round_advance_seed'
  | 'round_advance_series_a'
  | 'round_advance_series_b'
  | 'runway_below_25k'
  | 'first_agent_fired'
  | 'ipo_triggered'
```

---

## Tip card definitions

```ts
const TIP_CARDS: TipCard[] = [
  {
    id: 'first_agent_hired',
    trigger: 'first_agent_hired',
    title: 'Your first agent is live',
    body: 'Write them a prompt. The more specific and concise it is, the better they\'ll perform. A 500-word prompt isn\'t better — it\'s noisier.',
    concept: 'Prompt engineering',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_tick',
    trigger: 'first_tick',
    title: 'Your runway is ticking',
    body: 'Runway is how long you can survive before running out of cash. Every tick costs you money in agent salaries. ARR is what saves you.',
    concept: 'Runway',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_low_score',
    trigger: 'first_low_score',
    title: 'That prompt needs work',
    body: 'Scores below 40 put your agent at risk of going off-task — wasting a tick entirely. Shorter, more specific prompts score higher.',
    concept: 'Prompt quality',
    dismissLabel: 'I\'ll fix it',
  },
  {
    id: 'first_drift',
    trigger: 'first_drift',
    title: 'Your agent went off-task',
    body: 'Vague prompts cause drift. When an agent goes off-task, they produce nothing that tick — burning salary with zero return.',
    concept: 'Agent drift',
    dismissLabel: 'Got it',
  },
  {
    id: 'entered_burn_mode',
    trigger: 'entered_burn_mode',
    title: 'You\'re in burn mode',
    body: 'You\'re running out of time on this milestone. Ticks are faster, costs are higher. Fix your worst prompts or fire an agent to cut burn.',
    concept: 'Burn rate',
    dismissLabel: 'Got it',
  },
  {
    id: 'round_advance_seed',
    trigger: 'round_advance_seed',
    title: 'Seed round closed',
    body: 'You\'ve unlocked 2 new agent slots. Seed rounds mean investors believe in your growth story — now you have to execute it.',
    concept: 'Seed funding',
    dismissLabel: 'Let\'s go',
  },
  {
    id: 'round_advance_series_a',
    trigger: 'round_advance_series_a',
    title: 'Series A unlocked',
    body: 'Series A investors are betting on your growth trajectory. You now need users, not just revenue. Add a Marketing agent if you haven\'t.',
    concept: 'Series A',
    dismissLabel: 'Got it',
  },
  {
    id: 'round_advance_series_b',
    trigger: 'round_advance_series_b',
    title: 'Series B — scaling up',
    body: 'Series B is about proving you can scale what\'s working. Your cost per new dollar of ARR should be dropping. That\'s called improving unit economics.',
    concept: 'Unit economics',
    dismissLabel: 'Got it',
  },
  {
    id: 'runway_below_25k',
    trigger: 'runway_below_25k',
    title: 'Runway critical',
    body: 'Under $25k means you\'re weeks from zero. Cut your lowest-performing agent or find a way to spike ARR fast. CAC might be killing you.',
    concept: 'CAC (Customer Acquisition Cost)',
    dismissLabel: 'Got it',
  },
  {
    id: 'first_agent_fired',
    trigger: 'first_agent_fired',
    title: 'Agent fired',
    body: 'Cutting headcount reduces burn immediately. Painful, but sometimes the only move. Real startups call this a "right-sizing."',
    concept: 'Headcount management',
    dismissLabel: 'Understood',
  },
  {
    id: 'ipo_triggered',
    trigger: 'ipo_triggered',
    title: 'IPO incoming',
    body: 'You hit $100M valuation. Your company is going public — or more likely, getting acquired. That\'s a win either way. Time to prestige.',
    concept: 'Valuation',
    dismissLabel: 'Let\'s go',
  },
]
```

---

## Trigger evaluation (runs every tick and on player actions)

```ts
function evaluateTipTriggers(state: GameState, firedTipIds: Set<string>): TipCard | null {
  for (const tip of TIP_CARDS) {
    if (firedTipIds.has(tip.id)) continue

    const shouldFire = (() => {
      switch (tip.trigger) {
        case 'first_agent_hired':   return state.agents.length === 1
        case 'first_tick':          return state.tickCount === 1
        case 'first_low_score':     return state.agents.some(a => a.qualityScore < 40)
        case 'first_drift':         return state.agents.some(a => a.isOffTask)
        case 'entered_burn_mode':   return state.phase === 'burn_mode'
        case 'round_advance_seed':  return state.round === 'seed'
        case 'round_advance_series_a': return state.round === 'series_a'
        case 'round_advance_series_b': return state.round === 'series_b'
        case 'runway_below_25k':    return state.runway < 25_000
        case 'first_agent_fired':   return /* set a flag when agent is fired */ false
        case 'ipo_triggered':       return state.phase === 'ipo'
        default: return false
      }
    })()

    if (shouldFire) return tip
  }
  return null
}
```

Track fired tip IDs in a `useRef` or component state (not in global game state — tips are UI-only and don't need to be part of the reducer).

---

## UI design

Each tip card is a compact card (max-width 320px) anchored to the bottom-right of the screen:

- **Top**: concept label in a small pill badge (e.g. "Burn rate") — shown only if `concept` is set
- **Title**: 14px medium weight
- **Body**: 13px regular, 2–3 lines max
- **Bottom**: dismiss button (right-aligned)

Use a slide-up animation (translateY from 20px, 250ms ease-out). On dismiss, slide back down and fade.

Do not stack multiple tip cards — queue them and show the next after the current is dismissed.
