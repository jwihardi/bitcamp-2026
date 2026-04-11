# AGENT_SLOT.md — Vibe Combinator

The agent slot is the primary interactive surface of the game. Each hired agent occupies one slot, displayed as a card. Empty slots show a hire button. The player spends most of their time in this UI writing and refining prompts.

---

## Agent card anatomy

Each agent card shows, in order:

1. **Icon** — player-chosen from a fixed set (see below)
2. **Name** — player-assigned text, editable inline
3. **Role badge** — color-coded pill (Sales / Marketing / Engineering / Finance)
4. **Quality score badge** — 0–100, color-coded, with drift warning if < 40
5. **Token count** — live count, colored by threshold
6. **Prompt textarea** — the main editing surface
7. **"Grade with AI" button** — triggers Claude API grade, shows cached state
8. **Off-task indicator** — shown for the current tick if the agent drifted
9. **Fire button** — removes the agent from the slot (with a confirmation)

---

## Hiring flow

Empty slots show a card with a "Hire agent" button. Clicking it opens an inline form (not a modal) within the card:

1. **Choose role** — four buttons (Sales, Marketing, Engineering, Finance), one selectable
2. **Choose icon** — a small grid of 6 icons, one selectable
3. **Set name** — text input, placeholder "Name your agent"
4. **Confirm** — "Hire" button creates the agent with an empty prompt and score of 0

On hire, deduct the first tick's salary immediately from runway to give the player a sense of cost.

---

## Icon set

Use simple SVG or emoji icons. Keep it to 6 options:

```ts
const AGENT_ICONS = {
  robot:     '🤖',
  briefcase: '💼',
  chart:     '📊',
  wrench:    '🔧',
  lightbulb: '💡',
  rocket:    '🚀',
}
```

---

## Role badge colors

```ts
const ROLE_COLORS: Record<AgentRole, string> = {
  sales:       'bg-blue-100 text-blue-800',
  marketing:   'bg-purple-100 text-purple-800',
  engineering: 'bg-teal-100 text-teal-800',
  finance:     'bg-amber-100 text-amber-800',
}
```

---

## Prompt textarea behavior

- **Min height**: 80px, auto-expands to content
- **Placeholder**: role-specific. Examples:
  - Sales: "Tell your agent how to close deals..."
  - Engineering: "Tell your agent what to build and how..."
- **On change**: recompute heuristic score and token count immediately
- **On blur**: if score dropped since last blur, show a subtle yellow flash on the score badge
- If `promptTemplates` upgrade is purchased, show a small "Use template" link below the textarea

---

## Off-task state

When `agent.isOffTask` is true (set by the tick engine for one tick):

- The card gets a red left border or a subtle red tint
- A banner appears: `"[AgentName] went off-task this tick — no output"`
- The banner auto-dismisses at the next tick
- Do not lock or disable the card during off-task — the player should still be able to edit the prompt

---

## Firing an agent

Clicking the fire button shows an inline confirmation within the card:
> "Fire [Name]? Their slot opens immediately."
> [Confirm] [Cancel]

On confirm:
- Remove agent from `state.agents`
- The slot reverts to the empty "Hire agent" state
- If in burn mode, fire a tip card: "Firing agents reduces burn. It also reduces revenue — find the balance."

---

## Slot grid layout

Display slots in a 2-column grid on desktop, 1-column on mobile. Locked slots (beyond `agentSlots`) are shown as grayed-out cards with a lock icon and the round that unlocks them: "Unlocks at Series A".

```
[ Agent Card ]  [ Agent Card ]
[ Hire Agent ]  [ Locked: Series A ]
```

Total slots shown is always the max for the final round (8), so the player can always see what's coming.

---

## Animations

- **On hire**: card fades in from 0 opacity over 300ms
- **On fire**: card shrinks and fades out over 200ms
- **On off-task**: red flash on the card border for 500ms
- **On score improvement**: green pulse on the score badge for 400ms

Keep all animations CSS-based (`transition`, `@keyframes`). No animation libraries needed.
