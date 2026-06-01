# ARIA — Autonomous Research Intelligence Agent

> A multi-agent AI system that reads papers, generates hypotheses, designs experiments, and writes research reports — powered by Claude.

---

## What It Does

ARIA runs a 4-agent pipeline on any research paper:

| Agent | Role |
|-------|------|
| 📖 **Reader** | Extracts contributions, methodology, findings, limitations, open questions |
| 💡 **Hypothesis** | Generates 3 novel, testable, scored hypotheses from the analysis |
| ⚗️ **Experiment** | Designs a rigorous experiment + simulated pilot results with real numbers |
| 📋 **Report** | Synthesizes everything into a structured, publication-ready document |

Agents share conversation history — each one builds on the previous output. This is real agentic chaining, not a single prompt.

---

## Quick Start (2 minutes)

### Option A — Simplest: Open in browser directly

1. Open `public/config.js` and paste your Anthropic API key:
   ```js
   window.ARIA_API_KEY = 'sk-ant-...';
   ```
2. Open `public/index.html` in your browser
3. Done ✓

### Option B — Recommended: Run the local server (keeps your key private)

**Requirements:** Node.js 14+ (no npm packages needed — zero dependencies)

```bash
# 1. Clone / unzip this project
cd aria-agent

# 2. Set your API key as an environment variable
export ANTHROPIC_API_KEY=sk-ant-your-key-here

# 3. Start the server
node server.js

# 4. Open in browser
# → http://localhost:3000
```

**Get your API key:** https://console.anthropic.com

---

## How to Use

### Full Pipeline (recommended for demos)
1. Click a paper in the library (left panel)
2. Click **🔬 Full pipeline** quick button
3. Watch all 4 agents fire sequentially — each one waits for the previous to finish

### Individual Agents
- Use the agent selector dropdown to target a specific agent
- Or use the quick buttons for one-click actions
- Type natural questions — ARIA routes to the right agent automatically

### Adding Your Own Papers
Edit `public/papers.js` and add objects to the `PAPERS` array:
```js
{
  id: 'p6',
  title: 'Your Paper Title',
  authors: 'Author et al.',
  year: 2024,
  venue: 'ICML',
  field: 'reinforcement-learning',
  abstract: 'Full abstract text here...',
  keywords: ['RL', 'policy gradient', 'exploration']
}
```

---

## Project Structure

```
aria-agent/
├── public/
│   ├── index.html      ← App shell + layout
│   ├── style.css       ← Full dark-mode UI
│   ├── config.js       ← Your API key (Option A)
│   ├── papers.js       ← Paper library (add your own)
│   ├── agents.js       ← All 4 agent logic + system prompts
│   └── app.js          ← Pipeline orchestration + UI controller
├── server.js           ← Local server + API proxy (Option B)
├── package.json
└── README.md
```

---

## Architecture

```
User Input
    │
    ▼
Route Detection (auto / reader / hypothesis / experiment / report)
    │
    ▼
Reader Agent ──────────────────────────────► analysis string
    │
    ▼
Hypothesis Agent (receives analysis in history) ──► hypotheses string
    │
    ▼
Experiment Agent (receives hypotheses in history) ─► experiment string
    │
    ▼
Report Agent (receives all prior outputs) ─────────► final report
```

Each agent call:
- Has a specialized `system` prompt defining its role and output format
- Receives the growing `agentHistory` array for full context
- Updates the shared history for downstream agents

---

## Interview Talking Points

**"Walk me through the architecture"**
> ARIA uses a 4-agent sequential pipeline where each agent has a role-scoped system prompt. Agents share a conversation history array so downstream agents have full context from upstream outputs — this is the same pattern used in production agentic systems at Anthropic and DeepMind.

**"Why separate agents instead of one big prompt?"**
> Each agent is optimized for its task. The Reader is tuned for extraction, the Hypothesis agent for creative scientific thinking, the Experiment agent for rigorous methodology, the Report agent for clear scientific writing. Combining them into one prompt degrades each specialization.

**"How would you scale this?"**
> Add a planning agent that decomposes multi-paper research questions. Add tool-use for actual code execution (running real experiments). Add a memory layer (vector DB) to persist findings across sessions. Add parallel hypothesis exploration instead of sequential.

---

## Customization

**Change the model:** Edit `CONFIG.model` in `agents.js`

**Change system prompts:** Edit `SYSTEM_PROMPTS` in `agents.js` — each agent's behavior is fully defined there

**Add a new agent:** Add a new system prompt, a new agent function following the existing pattern, and add it to the pipeline in `app.js`

---

Built with Claude claude-sonnet-4-20250514 · No npm dependencies · Pure HTML/CSS/JS
