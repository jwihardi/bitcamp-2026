<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.
Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project instructions

Application code lives in `da-app/`.
Game design docs live in `../docs/`.

Before making gameplay or progression changes, read the relevant docs:
- `../docs/GAME_STATE.md`
- `../docs/TICK_ENGINE.md`
- `../docs/TIP_CARDS.md`
- `../docs/PRESTIGE.md`
- `../docs/FUNDING_GATES.md`
- `../docs/AGENT_SLOT.md`
- `../docs/PROMPT_GRADER.md`

Guidelines:
- Do not invent mechanics that conflict with the design docs.
- For gameplay-related changes, explain which docs you used.
- Prefer small, safe patches.
- If code and docs conflict, call out the conflict before making broad changes.
