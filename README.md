# AI Agent Empire

> **Build the AI empire. Write the prompts. Scale to IPO.**

A browser-based idle startup simulation where your prompts power your product. Hire AI agents, write instructions for each one, unlock better models, and scale through funding rounds to IPO. Built at **Bitcamp 2026**.

---

## What It Is

You're the founder of an AI company. You start with nothing — no agents, no users, no revenue.

You hire AI agents — Chatbot, Image Generator, Code Assistant, Data Analyst, Research Agent, ML Orchestrator — and each one generates users per second. Users generate revenue. Revenue lets you hire more agents, unlock better models, and scale. Hit the funding milestones (users, revenue, profit) to advance through rounds. Reach IPO and you win.

The twist: **TerpAI reads your prompts and scores them**. The score directly affects how many users your agent generates and how efficiently they use tokens. You learn prompt engineering by playing a game where bad prompts cost real (in-game) money.

---

## Game Loop

```
Click to get first users → Hire an agent → Agent generates users/sec →
Users generate revenue → Buy more agents → Hit milestone →
Advance funding round → Repeat until IPO → Earn reputation → Pivot
```

**Funding rounds:** Bootstrapped → Pre-Seed (150 users) → Seed (1.5K users, $800 revenue) → Series A (20K users, $15K revenue) → Series B (300K users, $200K revenue) → Series C (2M users, $1M revenue) → IPO (8M users, $4M revenue)

Each round also requires minimum net profit per second to advance.

---

## Key Mechanics

| Mechanic | What it teaches |
|---|---|
| Agent prompts | Prompt engineering, specificity, conciseness |
| Token cost per agent | Token economics, cost per inference |
| Operating costs vs revenue | Startup finance fundamentals |
| Funding round milestones | Users, revenue, profitability gates |
| AI prompt evaluation | How LLMs interpret instructions |
| AI CTO consultations | Technical strategy, scaling, unit economics |
| Model tiers (Nimbus → Oracle Apex) | Quality/cost tradeoffs in AI products |
| Service quality & user churn | Why quality matters for retention |
| Reputation upgrades | Compounding advantage, strategic reinvestment |
| Achievements | 35+ milestones tracking progress across categories |

### Agent Types

- **Chatbot Agent** — entry-level, cheap, low user generation. Your first hire.
- **Image Generator** — moderate cost, solid user growth. Unlocks at 100 users.
- **Code Assistant** — higher cost, strong output. Unlocks at 800 users.
- **Data Analyst** — expensive, high user generation. Unlocks at 8K users.
- **Research Agent** — premium tier. Unlocks at 80K users.
- **ML Orchestrator** — endgame agent, massive output. Unlocks at 800K users.

### LLM Model Tiers

| Model | Cost/token | Quality multiplier | Unlock cost |
|---|---|---|---|
| Nimbus-1 | $0.01 | 1.0x | Free |
| Quanta-S | $0.06 | 1.3x | $500 |
| Synapse Pro | $0.10 | 1.5x | $5,000 |
| Oracle Ultra | $0.18 | 1.8x | $25,000 |
| Oracle Apex | $0.40 | 2.2x | $100,000 |

Better models multiply agent quality but cost more per token. A bloated prompt on Oracle Apex burns cash fast. Token economics are real.

### Prestige (Pivot)

Hit IPO → earn Reputation points → spend on permanent upgrades → pivot (reset) and run again:
- Marketing Expertise (2x click power)
- Angel Investors ($1,500 starting cash)
- Early Adopters (150 starting users)
- Prompt Mastery (70% starting prompt quality)
- Growth Hacking (+25% user generation)
- Token Optimization (20% cost reduction)
- Premium Pricing (+50% revenue per user)
- Industry Connections (Quanta-S unlocked from start)

---

## AI Features

### Prompt Evaluator
Hit **Analyze** on any agent's prompt editor. TerpAI scores your prompt 0–100 for that specific agent type, estimates tokens per tick, revenue per tick, token efficiency, and gives a one-sentence critique. The score directly changes how many users your agent generates.

```
Type: "make a chatbot"                                → 22/100. Weak generation.
Type: "Build a customer support chatbot that          → 81/100. Users triple.
      handles billing inquiries with empathy,
      escalates complex issues, resolves in
      under 3 messages..."
```

### AI CTO
Analyzes your entire company — agents, prompt quality, costs, revenue, service quality — and returns:
- Company health badge (healthy / warning / critical)
- 2–3 prioritized strategic actions
- A mini-lesson on a real technical or business concept tied to your current situation
- Auto-consults when you advance a stage or hire a new agent type

---

## Tech Stack

- **Next.js** — App Router, server components, API routes
- **React** — `useState`/`useCallback`/`useMemo` for game state
- **TerpAI** — prompt evaluation + CTO consultations, accessed via **Playwright** (AI agent web automation)
- **TypeScript** — end-to-end
- **Tailwind CSS** — all UI
- **Deployed on Vercel**

All AI calls are routed through Playwright-driven web automation — TerpAI is invoked server-side so credentials never touch the client. Evaluation results are cached on the agent object. The game loop runs client-side on continuous `setInterval` cycles (100ms tick for user generation and revenue).

---

## Project Structure

```
bitcamp-2026/
├── da-app/                    # Next.js application
│   └── src/
│       ├── app/
│       │   ├── new-ui/
│       │   │   └── page.tsx   # Main game page (idle clicker UI)
│       │   ├── game-config.ts # Models, agents, stages, upgrades
│       │   └── api/
│       │       ├── evaluate-idle/ # AI prompt evaluator (per-agent-type)
│       │       └── cfo-idle/      # AI CTO advisor
│       ├── components/
│       │   ├── Header.tsx         # Tab bar (Stats/Upgrades/Achievements)
│       │   ├── LeftPanel.tsx      # Company info, progress, gold button
│       │   ├── RightPanel.tsx     # Agent shop + model shop
│       │   ├── StatisticsPanel.tsx # Live charts and metrics
│       │   ├── UpgradesPane.tsx   # Reputation upgrade shop
│       │   ├── AchievementsPane.tsx # Achievement grid
│       │   ├── AgentEditorModal.tsx # Prompt editor + model selector
│       │   ├── CTOPanel.tsx       # AI CTO collapsible panel
│       │   ├── GoldButton.tsx     # Click-to-earn button
│       │   └── ...
│       └── lib/
│           ├── achievements.ts  # 35+ achievement definitions
│           ├── terpai.ts        # TerpAI Playwright integration
│           ├── types.ts         # TypeScript types
│           └── constants.ts     # Shared constants
└── docs/                      # Game design docs
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

```bash
pnpm dev
```

Open [http://localhost:3000/new-ui](http://localhost:3000/new-ui).

---

## What You Learn Playing It

After 20 minutes:

- Why "write a good prompt" is useless advice — specificity matters
- What operating costs and unit economics mean for a tech company
- Why cheap models + tight prompts often beat expensive models + bloated ones
- What a Series A actually requires versus Pre-Seed
- Why token count is a cost center, not just a technical detail
- How service quality affects user retention and churn

That's not a side effect. That's the design.

---

*Built at Bitcamp 2026.*
