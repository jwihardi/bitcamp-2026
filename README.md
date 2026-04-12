# Vibe Combinator

> **Build the AI startup. Write the prompts. Don't go bankrupt.**

A browser-based startup simulation game where your prompts are your product. Hire AI agents, write instructions for each one, and race through funding rounds before your runway hits zero. Built at **Bitcamp 2026**.

---

## What It Is

You're the founder of a scrappy AI startup. You have $50,000 and no team.

You hire agents — Sales, Marketing, Engineering, Finance — and write prompts that tell each one what to do. The better your prompts, the more revenue they generate. Every 3 seconds a tick fires. Your agents work. Your runway shrinks. Hit the milestone and raise your next round, or run out of money and it's over.

The twist: **TerpAI reads your prompts and scores them**. The score directly changes how much your agent earns each tick. You learn prompt engineering by playing a game that punishes bad prompts and rewards sharp ones.

---

## Game Loop

```
Write a prompt → Agent generates revenue → Runway ticks down →
Hit milestone → Raise your round → Get more agent slots →
Repeat until IPO or bankruptcy
```

**Funding rounds:** Pre-Seed ($100K ARR) → Seed ($500K ARR + 1 feature) → Series A ($2M ARR + 1K users) → Series B ($10M ARR + 3 features) → IPO ($100M valuation)

Each round has a hard timer. Miss it = game over.

---

## Key Mechanics

| Mechanic | What it teaches |
|---|---|
| Agent prompts | Prompt engineering, specificity, conciseness |
| Token cost per tick | Token economics, cost per inference |
| Burn rate & runway | Startup finance fundamentals |
| Funding round milestones | ARR, user growth, feature velocity |
| AI prompt evaluation | How LLMs interpret instructions |
| AI CFO consultations | Burn rate, CAC, unit economics, valuation |
| Model tiers (Nimbus → Oracle) | Quality/cost tradeoffs in AI products |
| Agent drift | Why vague prompts produce unpredictable outputs |
| Prestige upgrades | Compounding advantage, strategic reinvestment |

### Agent Roles

- **Sales** — generates ARR. Needs revenue-focused, targeted prompts.
- **Marketing** — grows users + some ARR. Needs audience-specific framing.
- **Engineering** — ships features. Needs scoped technical instructions.
- **Finance** — reduces burn rate. Needs cost-cutting, efficiency language.

### LLM Model Tiers

| Model | Cost/token | Quality cap | Unlock |
|---|---|---|---|
| Nimbus-1 | $5 | 55% | Default |
| Quanta-S | $12 | 75% | 3 VC Chips |
| Synapse Pro | $25 | 90% | 7 VC Chips |
| Oracle Ultra | $45 | 100% | 15 VC Chips |

A bloated 200-word prompt on Oracle Ultra burns 10x more runway per tick than a tight 30-word prompt on Nimbus-1. Token economics are real.

### Burn Mode

When you hit the final 20% of a round timer without meeting your milestone: ticks double in speed, the screen pulses red. You have seconds to fire a bad agent or push a better prompt.

### Prestige

Hit IPO → earn VC Chips (1 per $10M valuation) → spend on permanent upgrades across runs:
- Faster tick intervals
- Bigger starting runway
- Prompt templates (70+ score starters)
- Unlock higher-tier LLM models

---

## AI Features

### Prompt Evaluator
Hit **Evaluate** on any agent card. Costs $200 runway. TerpAI scores your prompt 0–100, estimates tokens/tick, revenue/tick, token efficiency ratio, and gives a one-sentence critique. The score changes what your agent earns from every tick forward.

```
Type: "do sales stuff"                              → 22/100. Revenue: ~$1,200/tick.
Type: "contact SaaS founders at seed stage,         → 81/100. Revenue: ~$6,500/tick.
      pitch 20% ARR increase in 90 days..."
```

### AI CFO
Costs $500. Looks at your entire company — burn rate, agent quality, runway, milestone progress — and returns:
- Company health badge (healthy / warning / critical)
- 2–3 prioritized strategic actions
- A mini-lesson on a real startup finance concept (CAC, unit economics, valuation multiples, etc.) tied to your current situation

---

## Tech Stack

- **Next.js 15** — App Router, server components, API routes
- **React 19** — `useReducer` for single-source-of-truth game state
- **TerpAI** — prompt evaluation + CFO consultations, accessed via **Playwright** (AI Agent web automation)
- **TypeScript** — end-to-end
- **Tailwind CSS 4** — all UI
- **Deployed on Vercel**

All AI calls are routed through Playwright-driven web automation — TerpAI is invoked server-side so credentials never touch the client. Evaluation results are cached on the agent object to avoid redundant calls. The tick engine runs client-side on `setInterval`, dispatching one atomic action per tick via `useReducer`.

---

## Project Structure

```
bitcamp-2026/
├── da-app/                  # Next.js application
│   └── src/
│       ├── app/
│       │   ├── page.tsx     # Main game page
│       │   └── api/
│       │       ├── evaluate/  # Gemini prompt evaluator
│       │       └── cfo/       # Gemini CFO advisor
│       ├── components/        # All UI components
│       │   ├── AgentCard.tsx
│       │   ├── AgentGrid.tsx
│       │   ├── HUD.tsx
│       │   ├── CFOPanel.tsx
│       │   ├── IPOScreen.tsx
│       │   ├── GameOverScreen.tsx
│       │   └── ...
│       ├── lib/
│       │   ├── gameReducer.ts  # All state mutations
│       │   ├── tickEngine.ts   # Core game loop logic
│       │   ├── promptGrader.ts # Heuristic prompt scoring
│       │   ├── constants.ts    # Models, rounds, salaries
│       │   └── types.ts        # Full TypeScript types
│       └── context/
│           └── GameContext.tsx # Global state + localStorage
└── docs/                    # Game design docs
    ├── GAME_STATE.md
    ├── TICK_ENGINE.md
    ├── FUNDING_GATES.md
    ├── AGENT_SLOT.md
    ├── PROMPT_GRADER.md
    ├── AI_CFO.md
    ├── TIP_CARDS.md
    └── PRESTIGE.md
```

---

## Running Locally

```bash
cd da-app
pnpm install
```

Create a `.env.local` file:

```
GEMINI_API_KEY=your_key_here
```

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What You Learn Playing It

After 20 minutes:

- Why "write a good prompt" is useless advice — specificity matters
- What burn rate is and why it kills startups
- Why cheap models + tight prompts often beat expensive models + bloated ones
- What a Series A actually requires versus Pre-Seed
- Why token count is a cost center, not just a technical detail

That's not a side effect. That's the design.

---

*Built at Bitcamp 2026.*
