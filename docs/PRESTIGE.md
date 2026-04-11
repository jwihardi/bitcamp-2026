# PRESTIGE.md — Vibe Combinator

Prestige is the IPO → acquisition → new run loop. It's the long-term progression layer that gives players a reason to keep playing after their first win. Chips carry over. Upgrades persist. Each run should feel faster and more strategic than the last.

---

## IPO trigger

IPO triggers when `state.arr * VALUATION_MULTIPLE >= 100_000_000`.

With the default 10x multiple and no due diligence penalty, this means $10M ARR. With an active due diligence penalty (7x multiple), the player needs ~$14.3M ARR.

When triggered, dispatch `IPO_TRIGGERED` and set `state.phase = 'ipo'`. The tick engine pauses.

---

## Valuation calculation

```ts
function computeValuation(state: GameState): number {
  const multiple = state.pendingPenalties.find(
    p => p.type === 'due_diligence' && p.active
  ) ? 7 : VALUATION_MULTIPLE

  return Math.floor(state.arr * multiple)
}
```

---

## VC Chip award

```ts
function awardVcChips(valuation: number): number {
  return Math.floor(valuation / 10_000_000)  // 1 chip per $10M valuation
}
```

A $100M valuation = 10 chips. A $250M valuation (great prompts, no penalties) = 25 chips.

Add awarded chips to the persistent `state.vcChips`. This is one of the two values that must survive the reset (along with `upgrades`).

---

## IPO / acquisition screen

Full-screen overlay. Does not auto-dismiss — the player must click through.

### Panel 1: Acquisition announcement

- Headline: "Acquired for $[X]M"
- Subhead: "Congratulations — you're going public."
- A brief flavor text line (rotate through 3–4 options): e.g. "Your lean team and sharp prompts made all the difference."
- CTA: "See your stats →"

### Panel 2: Result card (shareable)

This is the screenshot-friendly summary. Style it distinctly — white card, clean layout, looks good on a phone screen.

Contents:
- Company name (use a fun generated name: "[AgentName] & Co." using the first agent hired)
- Final valuation: "$127M"
- Peak ARR: "$12.4M"
- Agents: list of agent name + role pairs with their icons
- Chaos events survived: count
- Rounds completed: e.g. "Pre-seed → IPO"
- VC chips earned this run: "+12 chips"
- Total VC chips: "34 chips total"
- Small footer: "Vibe Combinator · Bitcamp 2026"

CTA: "Claim chips and upgrade →"

### Panel 3: Chip shop

See Chip Shop section below. After purchasing, CTA: "Start new run →"

---

## Chip shop

The chip shop appears between runs (after IPO) and persists as a tab/button accessible from the main HUD once unlocked.

### Upgrade: Faster ticks

Reduces tick interval. Stacks with burn mode halving.

| Tier | Effect | Chip cost | Cumulative cost |
|------|--------|-----------|-----------------|
| 1 | 3000ms → 2500ms | 2 | 2 |
| 2 | 2500ms → 2000ms | 5 | 7 |
| 3 | 2000ms → 1500ms | 10 | 17 |

```ts
const TICK_INTERVALS = [3000, 2500, 2000, 1500]
// state.tickInterval = TICK_INTERVALS[upgrades.fasterTicks]
```

### Upgrade: Bigger starting budget

Adds $25k to initial runway per tier.

| Tier | Effect | Chip cost | Cumulative cost |
|------|--------|-----------|-----------------|
| 1 | +$25k runway | 1 | 1 |
| 2 | +$25k runway (total +$50k) | 3 | 4 |
| 3 | +$25k runway (total +$75k) | 7 | 11 |

```ts
const startingRunway = BASE_RUNWAY + (upgrades.biggerBudget * BUDGET_PER_TIER)
```

### Upgrade: Prompt templates

One-time unlock. Costs 3 chips. Adds a "Use template" button to each agent card that populates a role-appropriate starter prompt scoring 70+ on the heuristic.

See `PROMPT_GRADER.md` for template content.

---

## Reset logic

On "Start new run", reset state to `INITIAL_STATE` with the following overrides:

```ts
const newRunState: GameState = {
  ...INITIAL_STATE,
  runway: BASE_RUNWAY + (upgrades.biggerBudget * BUDGET_PER_TIER),
  tickInterval: TICK_INTERVALS[upgrades.fasterTicks],
  vcChips: state.vcChips,     // carry over (already incremented)
  upgrades: state.upgrades,   // carry over
}
```

Everything else resets: agents, ARR, runway (recalculated), users, features, round, tickCount, penalties

---

## Persistence

Use `localStorage` to persist the two carry-over values between browser sessions:

```ts
// On every chip spend or upgrade purchase:
localStorage.setItem('vibe_combinator_chips', JSON.stringify(state.vcChips))
localStorage.setItem('vibe_combinator_upgrades', JSON.stringify(state.upgrades))

// On app load:
const savedChips = JSON.parse(localStorage.getItem('vibe_combinator_chips') ?? '0')
const savedUpgrades = JSON.parse(localStorage.getItem('vibe_combinator_upgrades') ?? 'null') ?? INITIAL_UPGRADES
```

Do not persist run state (agents, ARR, etc.) — runs are ephemeral by design.

---

## Chip shop UI

Display each upgrade as a card with:
- Upgrade name and description
- Current tier (e.g. "Tier 1 / 3") or "Unlocked" for one-time upgrades
- Next tier effect: "+500ms faster ticks"
- Cost in chips: "5 chips"
- Purchase button — disabled if insufficient chips or max tier reached
- Chip balance shown prominently at the top: "You have 34 chips"

If the player has 0 chips and no purchasable upgrades, still show the shop with all items locked — let them see what they're playing toward.
