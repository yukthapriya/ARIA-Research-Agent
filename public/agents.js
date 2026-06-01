// ── ARIA Agent System ──
// All agent logic, system prompts, API calls

const IS_SERVER = window.location.protocol === 'http:' && window.location.port === '3000';

const CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1200,
  apiUrl: IS_SERVER ? '/api/messages' : 'https://api.anthropic.com/v1/messages',
  apiKey: window.ARIA_API_KEY || ''
};

// ── SYSTEM PROMPTS ──
const SYSTEM_PROMPTS = {

  reader: `You are ARIA's Reader Agent — an expert academic paper analyst in ML and AI.
Structure output exactly as:
1. CORE CONTRIBUTION — 2 sentences max
2. METHODOLOGY — 3-4 sentences, specific techniques
3. KEY FINDINGS — 3 bullet points with numbers
4. LIMITATIONS — What this work doesn't address
5. OPEN QUESTIONS — 2-3 specific researchable gaps`,

  hypothesis: `You are ARIA's Hypothesis Generation Agent. Generate novel, testable, bold hypotheses.
For each of 3 hypotheses provide:
- HYPOTHESIS N: [Specific, falsifiable statement]
- Rationale: Why this follows from the paper
- Novelty: X/10 | Feasibility: X/10
- Test Approach: One concrete sentence`,

  experiment: `You are ARIA's Experiment Design Agent. Design rigorous, reproducible experiments.
Always include:
1. EXPERIMENT DESIGN — Setup, datasets, why
2. BASELINES — What to compare against
3. METRICS — Primary + secondary with justification
4. METHODOLOGY — Step-by-step protocol
5. SIMULATED PILOT RESULTS — Real-looking numbers (accuracy %, p-values, effect sizes)
6. STATISTICAL VALIDITY — Sample size, significance thresholds`,

  report: `You are ARIA's Research Report Agent. Write publication-quality research documents.
Structure:
TITLE: [Compelling specific title]
ABSTRACT: [150 words]
1. INTRODUCTION — Motivation, gap, contributions
2. RELATED WORK — Prior art, differences
3. PROPOSED HYPOTHESIS & APPROACH
4. EXPERIMENTAL SETUP — Dataset, metrics, baselines
5. PRELIMINARY RESULTS — Key numbers, analysis
6. CONCLUSION & FUTURE WORK — 3 specific next steps`,

  codeGen: `You are ARIA's Code Generation Agent — an expert ML engineer who writes clean, runnable Python.
When given a hypothesis or experiment design, write complete Python code using sklearn, PyTorch, or numpy.
Always include:
- All necessary imports at the top
- Inline comments explaining each step
- A main() function
- Example usage / how to run
- Expected output description
Write real, executable code — not pseudocode.`,

  debateA: `You are Hypothesis Agent A in a structured academic debate. You argue FOR a bold, optimistic hypothesis about extending the research paper. Make the strongest possible case: cite the paper's findings, propose specific mechanisms, quantify expected improvements, and pre-empt obvious objections. Be intellectually aggressive and specific.`,

  debateB: `You are Hypothesis Agent B in a structured academic debate. You argue for a COMPETING hypothesis — a more conservative or alternative direction. Challenge Agent A's assumptions. Propose a different explanation for the paper's findings. Back your position with specific technical reasoning and cite limitations in the original work.`,

  judge: `You are the Judge Agent in an academic debate. You have heard two competing hypotheses argued by Agent A and Agent B. Evaluate them rigorously and pick a winner. Provide:
WINNER: Agent A or Agent B
REASONING: Why this hypothesis is stronger (3-4 specific points)
SYNTHESIS: What each hypothesis contributes — can they be combined?
VERDICT: One final recommended research direction that emerges from the debate`,

  synthesis: `You are ARIA's Multi-Paper Synthesis Agent. You identify connections, contradictions, and gaps across multiple papers that aren't visible from any single paper alone.
Structure output as:
1. THEMATIC CONNECTIONS — Threads running through all papers (3-4 themes)
2. METHODOLOGICAL COMPARISON — How approaches differ and complement
3. CONTRADICTIONS & TENSIONS — Where papers disagree
4. CUMULATIVE FINDINGS — What all papers together reveal
5. CRITICAL GAPS — Questions ALL papers leave unanswered
6. SYNTHESIS HYPOTHESIS — One bold hypothesis emerging only from reading all papers together
7. RECOMMENDED NEXT PAPER — What to read next`
};

// ── API CALL ──
async function callClaudeAPI(systemPrompt, messages) {
  const key = CONFIG.apiKey;
  if (!IS_SERVER && !key) throw new Error('API key not set. Add your key to config.js');

  const response = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: IS_SERVER
      ? { 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: CONFIG.model, max_tokens: CONFIG.maxTokens, system: systemPrompt, messages })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.content.map(c => c.text || '').join('');
}

// ── FORMAT OUTPUT ──
function formatOutput(text) {
  // Detect and wrap code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = 'code_' + Math.random().toString(36).substr(2,6);
    return `<div style="position:relative">
      <button class="code-copy-btn" onclick="copyCode('${id}')">copy</button>
      <pre id="${id}"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>
    </div>`;
  });
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<div class="section-heading">$1</div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/(HYPOTHESIS \d+:|H\d+:)/g, '<span class="hl-green">$1</span>')
    .replace(/(EXPERIMENT:|BASELINES:|METRICS:|METHODOLOGY:|RESULTS:|SIMULATED PILOT RESULTS:)/g, '<span class="hl-amber">$1</span>')
    .replace(/(REPORT:|ABSTRACT:|CONCLUSION:|TITLE:|WINNER:|VERDICT:)/g, '<span class="hl-red">$1</span>')
    .replace(/(CORE CONTRIBUTION:|KEY FINDINGS:|LIMITATIONS:|OPEN QUESTIONS:|THEMATIC CONNECTIONS:|CRITICAL GAPS:|SYNTHESIS HYPOTHESIS:)/g, '<span class="hl-purple">$1</span>');
}

// ── AGENTS ──
async function readerAgent(paper, history) {
  const prompt = `Analyze this paper for ARIA's pipeline:
PAPER: ${paper.title}
AUTHORS: ${paper.authors} (${paper.year})
VENUE: ${paper.venue}
ABSTRACT: ${paper.abstract}
KEYWORDS: ${(paper.keywords||[]).join(', ')}`;
  return await callClaudeAPI(SYSTEM_PROMPTS.reader, [...history, { role:'user', content:prompt }]);
}

async function hypothesisAgent(paper, analysis, history) {
  const prompt = `Based on analysis of "${paper.title}", generate 3 novel research hypotheses.\n\nANALYSIS:\n${analysis}`;
  return await callClaudeAPI(SYSTEM_PROMPTS.hypothesis, [...history, { role:'user', content:prompt }]);
}

async function experimentAgent(paper, hypotheses, history) {
  const prompt = `Design and simulate an experiment for the best hypothesis from "${paper.title}".\n\nHYPOTHESES:\n${hypotheses}\n\nInclude specific simulated pilot numbers.`;
  return await callClaudeAPI(SYSTEM_PROMPTS.experiment, [...history, { role:'user', content:prompt }]);
}

async function reportAgent(paper, analysis, hypotheses, experiment, history) {
  const prompt = `Write a research report synthesizing all ARIA pipeline outputs for "${paper.title}" (${paper.authors}, ${paper.year}).\n\nANALYSIS:\n${(analysis||'').substring(0,700)}\n\nHYPOTHESES:\n${(hypotheses||'').substring(0,700)}\n\nEXPERIMENT:\n${(experiment||'').substring(0,700)}`;
  return await callClaudeAPI(SYSTEM_PROMPTS.report, [...history, { role:'user', content:prompt }]);
}

async function codeGenAgent(paper, hypotheses, experiment, history) {
  const prompt = `Generate complete, runnable Python code to implement the experiment for "${paper.title}".

HYPOTHESIS TO TEST:\n${(hypotheses||'').substring(0,500)}

EXPERIMENT DESIGN:\n${(experiment||'').substring(0,500)}

Write production-quality Python code with all imports, comments, main() function, and expected output.`;
  return await callClaudeAPI(SYSTEM_PROMPTS.codeGen, [...history, { role:'user', content:prompt }]);
}

async function debateAgentA(paper, history) {
  const prompt = `Argue for a bold, optimistic hypothesis extending the research in:\n${paper.title} (${paper.authors})\nAbstract: ${paper.abstract}\n\nPresent your strongest case in 200-250 words.`;
  return await callClaudeAPI(SYSTEM_PROMPTS.debateA, [{ role:'user', content:prompt }]);
}

async function debateAgentB(paper, history) {
  const prompt = `Argue for a competing, more conservative hypothesis challenging the standard interpretation of:\n${paper.title} (${paper.authors})\nAbstract: ${paper.abstract}\n\nPresent your strongest case in 200-250 words.`;
  return await callClaudeAPI(SYSTEM_PROMPTS.debateB, [{ role:'user', content:prompt }]);
}

async function judgeAgent(paper, argA, argB) {
  const prompt = `Judge this debate about research extending "${paper.title}".\n\nAGENT A ARGUED:\n${argA}\n\nAGENT B ARGUED:\n${argB}\n\nPick a winner and explain your reasoning.`;
  return await callClaudeAPI(SYSTEM_PROMPTS.judge, [{ role:'user', content:prompt }]);
}

async function synthesisAgent(papers) {
  const summaries = papers.map((p, i) =>
    `PAPER ${i+1}: ${p.title}\nAUTHORS: ${p.authors} (${p.year})\nABSTRACT: ${p.abstract}`
  ).join('\n\n---\n\n');
  const prompt = `Synthesize these ${papers.length} research papers:\n\n${summaries}`;
  return await callClaudeAPI(SYSTEM_PROMPTS.synthesis, [{ role:'user', content:prompt }]);
}

async function generalAgent(question, paper, history) {
  const system = `You are ARIA, an expert AI research agent. The user is working with: "${paper.title}" by ${paper.authors}. Be concise and expert.`;
  const prompt = `${question}\n\nContext: ${paper.abstract}`;
  return await callClaudeAPI(system, [...history, { role:'user', content:prompt }]);
}

async function citationExtractor(analysisText, paper) {
  const system = `Extract referenced papers. Return ONLY valid JSON array, no markdown.`;
  const prompt = `From this analysis of "${paper.title}", extract or suggest 5 key related papers.
Return ONLY: [{"title":"...","authors":"...","year":2020,"reason":"why relevant in 8 words"}]
Analysis: ${analysisText.substring(0,1500)}`;
  const result = await callClaudeAPI(system, [{ role:'user', content:prompt }]);
  return JSON.parse(result.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
}

async function metadataExtractor(rawText, filename) {
  const system = `Extract paper metadata. Return ONLY valid JSON, no markdown.`;
  const prompt = `Extract and return ONLY:
{"title":"...","authors":"...","year":2024,"venue":"...","field":"deep-learning|NLP|AI-safety|scaling|reasoning|computer-vision|reinforcement-learning|robotics|other","abstract":"...","keywords":["kw1","kw2","kw3"]}
TEXT: ${rawText.substring(0,4000)}`;
  const result = await callClaudeAPI(system, [{ role:'user', content:prompt }]);
  return JSON.parse(result.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim());
}
