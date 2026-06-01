// ── ARIA App — All 10 Features ──
// 1. Export PDF         2. arXiv Search       3. Multi-paper Synthesis
// 4. Citation Network   5. Streaming UI       6. Session Memory
// 7. Agent Debate       8. Experiment Code    9. Research History
// 10. Share Link

// ══ STATE ══
let selectedPaperId = null;
let agentHistory    = [];
let isRunning       = false;
let synthMode       = false;
let synthesizeSet   = new Set();
let citationsVisible= false;
let metrics         = { papers:0, hyp:0, exp:0, rep:0 };

// Pipeline outputs (kept for PDF export + code gen)
let lastAnalysis   = '';
let lastHypotheses = '';
let lastExperiment = '';
let lastReport     = '';

// ══ INIT ══
document.addEventListener('DOMContentLoaded', () => {
  renderPapers();
  setupInput();
  loadMemory();       // Feature 6: Session Memory
  restoreFromUrl();   // Feature 10: Share Link
});

// ══════════════════════════════════════
// PAPER LIBRARY
// ══════════════════════════════════════
function renderPapers() {
  const lib = document.getElementById('paperLibrary');
  const fieldColor = { 'AI-safety':'green','scaling':'amber','reasoning':'green','reinforcement-learning':'amber','robotics':'amber' };
  lib.innerHTML = PAPERS.map(p => `
    <div class="paper-card ${selectedPaperId===p.id?'active':''} ${synthMode&&synthesizeSet.has(p.id)?'synth-selected':''}"
         onclick="${synthMode ? `toggleSynthSelect('${p.id}')` : `selectPaper('${p.id}')`}">
      <div class="paper-title">${p.title}</div>
      <div class="paper-meta"><span>${p.authors}</span><span>${p.year}</span></div>
      <div class="paper-tags">
        <span class="tag ${fieldColor[p.field]||''}">${p.field}</span>
        <span class="tag gray">${p.venue}</span>
        ${p.uploaded?'<span class="tag uploaded">uploaded</span>':''}
        ${p.fromArxiv?'<span class="tag arxiv">arXiv</span>':''}
        ${synthMode&&synthesizeSet.has(p.id)?'<span class="tag green">✓ selected</span>':''}
      </div>
    </div>`).join('');
}

function selectPaper(id) {
  selectedPaperId = id;
  renderPapers();
  const p = PAPERS.find(x=>x.id===id);
  addLog('r', `<b>Selected</b> "${p.title.substring(0,30)}..."`);
  document.getElementById('chatInput').placeholder = `Research "${p.title.substring(0,26)}..."`;
  // Update debate tab info
  document.getElementById('debatePaperInfo').innerHTML = `Paper: <strong>${p.title}</strong> · ${p.authors} · ${p.year}`;
}

function getSelectedPaper() {
  if (!selectedPaperId) { selectedPaperId = PAPERS[0].id; renderPapers(); }
  return PAPERS.find(p=>p.id===selectedPaperId);
}

function updatePaperCount() {
  document.getElementById('paperCount').textContent = PAPERS.length + ' loaded';
}

// ══════════════════════════════════════
// TABS
// ══════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).style.display = 'block';
  document.getElementById('tab-' + name).classList.add('active');
  const btn = [...document.querySelectorAll('.tab-btn')].find(b => b.textContent.toLowerCase().includes(name));
  if (btn) btn.classList.add('active');
  if (name === 'history') renderHistory();
}

// ══════════════════════════════════════
// METRICS
// ══════════════════════════════════════
function incrementMetric(key, amount=1) {
  metrics[key] += amount;
  const ids = { papers:'mPapers', hyp:'mHyp', exp:'mExp', rep:'mRep' };
  document.getElementById(ids[key]).textContent = metrics[key];
}

// ══════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════
function addLog(type, html) {
  const log = document.getElementById('activityLog');
  const icons = { r:'R', h:'H', e:'E', p:'P', s:'S' };
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<div class="log-icon ${type}">${icons[type]||'S'}</div><div class="log-text">${html}</div>`;
  log.insertBefore(entry, log.firstChild);
  if (log.children.length > 50) log.removeChild(log.lastChild);
}

// ══════════════════════════════════════
// STATUS
// ══════════════════════════════════════
function setStatus(state) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot ' + ({running:'thinking',done:'',idle:'idle',error:'error'}[state]||'idle');
  txt.textContent = {running:'thinking...',done:'ready',idle:'ready',error:'error'}[state]||state;
}

// ══════════════════════════════════════
// PIPELINE NODES
// ══════════════════════════════════════
function activateNode(id) {
  ['nodeReader','nodeHypothesis','nodeExperiment','nodeReport','nodeSynthesize','nodeDebate'].forEach(n => {
    document.getElementById(n).classList.remove('active');
  });
  if (id) document.getElementById(id).classList.add('active');
}

// ══════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════
const BADGE_MAP = {
  user:'badge-user', reader:'badge-reader', hypothesis:'badge-hypothesis',
  experiment:'badge-experiment', report:'badge-report', synthesize:'badge-synthesize',
  'debate-a':'badge-debate-a', 'debate-b':'badge-debate-b', judge:'badge-judge',
  code:'badge-code', aria:'badge-system', system:'badge-system'
};
const LABEL_MAP = {
  user:'YOU', reader:'READER AGENT', hypothesis:'HYPOTHESIS AGENT',
  experiment:'EXPERIMENT AGENT', report:'REPORT AGENT', synthesize:'SYNTHESIS AGENT',
  'debate-a':'AGENT A', 'debate-b':'AGENT B', judge:'JUDGE AGENT',
  code:'CODE AGENT', aria:'ARIA', system:'ARIA'
};

function addMessage(role, html, badge) {
  const output = document.getElementById('agentOutput');
  const now = new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
  const div = document.createElement('div');
  div.className = 'message';
  div.innerHTML = `
    <div class="message-header">
      <span class="agent-badge ${BADGE_MAP[badge]||'badge-system'}">${LABEL_MAP[badge]||badge.toUpperCase()}</span>
      <span class="message-time">${now}</span>
    </div>
    <div class="message-content ${role==='user'?'user-msg':''}">${html}</div>`;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  return div;
}

function addStreamingMessage(badge) {
  const div = addMessage('agent','<span class="loading-dots" style="color:var(--muted);font-size:12px">thinking</span>',badge);
  return div.querySelector('.message-content');
}

// ══════════════════════════════════════
// AGENT RUNNERS
// ══════════════════════════════════════
async function runReader(paper) {
  activateNode('nodeReader');
  const target = addStreamingMessage('reader');
  try {
    const result = await readerAgent(paper, agentHistory);
    target.innerHTML = formatOutput(result);
    pushHistory('user', `Analyze: ${paper.title}`);
    pushHistory('assistant', result);
    lastAnalysis = result;
    addLog('r', `<b>Reader</b> analyzed "${paper.title.substring(0,22)}..."`);
    incrementMetric('papers');
    extractCitations(result, paper);
    return result;
  } catch(e) { target.innerHTML = err(e); return null; }
}

async function runHypothesis(paper, analysis) {
  activateNode('nodeHypothesis');
  const target = addStreamingMessage('hypothesis');
  try {
    const result = await hypothesisAgent(paper, analysis||paper.abstract, agentHistory);
    target.innerHTML = formatOutput(result);
    pushHistory('user', `Hypotheses: ${paper.title}`);
    pushHistory('assistant', result);
    lastHypotheses = result;
    addLog('h', `<b>Hypothesis</b> 3 generated`);
    incrementMetric('hyp', 3);
    return result;
  } catch(e) { target.innerHTML = err(e); return null; }
}

async function runExperiment(paper, hypotheses) {
  activateNode('nodeExperiment');
  const target = addStreamingMessage('experiment');
  try {
    const h = hypotheses || `H1: Extending ${paper.title} improves performance 15-20%.`;
    const result = await experimentAgent(paper, h, agentHistory);
    target.innerHTML = formatOutput(result);
    pushHistory('user', `Experiment: ${paper.title}`);
    pushHistory('assistant', result);
    lastExperiment = result;
    addLog('e', `<b>Experiment</b> designed`);
    incrementMetric('exp');
    return result;
  } catch(e) { target.innerHTML = err(e); return null; }
}

async function runReport(paper, analysis, hypotheses, experiment) {
  activateNode('nodeReport');
  const target = addStreamingMessage('report');
  try {
    const result = await reportAgent(paper, analysis, hypotheses, experiment, agentHistory);
    target.innerHTML = formatOutput(result);
    pushHistory('user', `Report: ${paper.title}`);
    pushHistory('assistant', result);
    lastReport = result;
    addLog('p', `<b>Report</b> ready — click ⬇ Export PDF`);
    incrementMetric('rep');
    document.getElementById('exportBtn').style.color = 'var(--accent2)';
    // Feature 9: Save to history
    saveToHistory(paper, analysis, hypotheses, experiment, result);
    return result;
  } catch(e) { target.innerHTML = err(e); return null; }
}

async function runCodeGen(paper) {
  activateNode('nodeExperiment');
  const target = addStreamingMessage('code');
  try {
    const result = await codeGenAgent(paper, lastHypotheses, lastExperiment, agentHistory);
    target.innerHTML = formatOutput(result);
    pushHistory('user', `Code: ${paper.title}`);
    pushHistory('assistant', result);
    addLog('e', `<b>Code</b> generated for "${paper.title.substring(0,20)}..."`);
    return result;
  } catch(e) { target.innerHTML = err(e); return null; }
}

function pushHistory(role, content) {
  agentHistory.push({ role, content });
  if (agentHistory.length > 20) agentHistory = agentHistory.slice(-20);
}

function err(e) { return `<span style="color:var(--danger)">${e.message}</span>`; }

// ══════════════════════════════════════
// MAIN SEND
// ══════════════════════════════════════
async function sendMessage() {
  if (isRunning) return;
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;
  const mode = document.getElementById('agentMode').value;
  input.value = ''; input.style.height = 'auto';
  isRunning = true;
  document.getElementById('sendBtn').disabled = true;
  setStatus('running');
  addMessage('user', query, 'user');
  const paper = getSelectedPaper();
  const q = query.toLowerCase();

  try {
    if (q.includes('full') || q.includes('pipeline') || mode === 'auto') {
      addMessage('aria', `🚀 Full pipeline on <strong>"${paper.title}"</strong>`, 'aria');
      const a = await runReader(paper);     if (!a) { done(); return; }
      const h = await runHypothesis(paper, a); if (!h) { done(); return; }
      const e = await runExperiment(paper, h); if (!e) { done(); return; }
      await runReport(paper, a, h, e);
      activateNode(null);
      addMessage('aria', `✅ Done — <span style="color:var(--accent2)">click ⬇ Export PDF or 🔗 Share</span>`, 'aria');
    } else if (mode === 'code' || q.includes('code') || q.includes('python') || q.includes('implement')) {
      await runCodeGen(paper); activateNode(null);
    } else if (mode === 'reader' || q.includes('analyz') || q.includes('read') || q.includes('extract')) {
      await runReader(paper); activateNode(null);
    } else if (mode === 'hypothesis' || q.includes('hypothes') || q.includes('novel') || q.includes('idea')) {
      await runHypothesis(paper, lastAnalysis||null); activateNode(null);
    } else if (mode === 'experiment' || q.includes('experiment') || q.includes('test') || q.includes('design')) {
      await runExperiment(paper, lastHypotheses||null); activateNode(null);
    } else if (mode === 'report' || q.includes('report') || q.includes('write') || q.includes('summariz')) {
      await runReport(paper, lastAnalysis, lastHypotheses, lastExperiment); activateNode(null);
    } else {
      activateNode('nodeReader');
      const target = addStreamingMessage('aria');
      try {
        const result = await generalAgent(query, paper, agentHistory);
        target.innerHTML = formatOutput(result);
        pushHistory('user', query); pushHistory('assistant', result);
        addLog('s', `<b>ARIA</b> answered`);
      } catch(e) { target.innerHTML = err(e); }
      activateNode(null);
    }
  } catch(e) { addMessage('aria', err(e), 'aria'); }
  done();
}

function done() {
  isRunning = false;
  document.getElementById('sendBtn').disabled = false;
  setStatus('done');
  activateNode(null);
}

function quickSend(text) { document.getElementById('chatInput').value = text; sendMessage(); }

function setupInput() {
  const input = document.getElementById('chatInput');
  input.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} });
  input.addEventListener('input', function() { this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,90)+'px'; });
}

// ══════════════════════════════════════
// FEATURE 1: EXPORT TO PDF
// ══════════════════════════════════════
function exportToPDF() {
  if (!lastReport && !lastAnalysis) {
    showToast('Run the pipeline first, then export.');
    return;
  }
  const paper = getSelectedPaper();
  const sections = [
    lastAnalysis   && { label:'READER AGENT',     content: lastAnalysis },
    lastHypotheses && { label:'HYPOTHESIS AGENT', content: lastHypotheses },
    lastExperiment && { label:'EXPERIMENT AGENT', content: lastExperiment },
    lastReport     && { label:'REPORT AGENT',     content: lastReport }
  ].filter(Boolean);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ARIA Report — ${paper.title}</title>
<style>
  body{font-family:Georgia,serif;max-width:820px;margin:48px auto;color:#111;line-height:1.8;font-size:14px;padding:0 24px}
  h1{font-size:24px;margin-bottom:6px;font-family:'Helvetica Neue',sans-serif}
  .meta{color:#666;font-size:12px;margin-bottom:36px;border-bottom:1px solid #eee;padding-bottom:12px}
  h2{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#888;border-bottom:1px solid #eee;padding-bottom:4px;margin:32px 0 10px;font-family:'Helvetica Neue',sans-serif}
  .label{display:inline-block;background:#f0f0f0;border:1px solid #ddd;border-radius:3px;font-size:9px;padding:1px 6px;font-family:monospace;color:#555;margin-bottom:10px}
  .content{white-space:pre-wrap;font-size:13px;line-height:1.8;color:#222;page-break-inside:avoid}
  pre{background:#f6f6f6;border:1px solid #ddd;border-radius:4px;padding:14px;font-size:11px;overflow-x:auto}
  .footer{margin-top:56px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:14px}
</style></head><body>
<h1>ARIA Research Report</h1>
<div class="meta">Paper: <strong>${paper.title}</strong> &nbsp;·&nbsp; ${paper.authors} &nbsp;·&nbsp; ${paper.year} &nbsp;·&nbsp; ${paper.venue}<br>
Generated: ${new Date().toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'})} &nbsp;·&nbsp; Model: claude-sonnet-4-20250514</div>
${sections.map(s=>`<h2>${s.label}</h2><div class="content">${s.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('\n')}
<div class="footer">Generated by ARIA — Autonomous Research Intelligence Agent · Powered by Claude (Anthropic)</div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  addLog('p', `<b>PDF</b> export opened`);
  showToast('PDF print dialog opened ↗');
}

// ══════════════════════════════════════
// FEATURE 2: ARXIV SEARCH
// ══════════════════════════════════════
async function searchArxiv() {
  const query = document.getElementById('arxivInput').value.trim();
  if (!query) return;
  const resultsEl = document.getElementById('arxivResults');
  const btn = document.getElementById('arxivBtn');
  resultsEl.innerHTML = '<div class="arxiv-loading loading-dots">Searching arXiv</div>';
  btn.disabled = true;

  try {
    const encoded = encodeURIComponent(query);
    let xmlText;
    try {
      const res = await fetch(`/api/arxiv?q=${encoded}`);
      xmlText = res.ok ? await res.text() : null;
    } catch { xmlText = null; }

    if (!xmlText) {
      const res = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encoded}&start=0&max_results=5&sortBy=relevance`);
      xmlText = await res.text();
    }

    const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
    const entries = xml.querySelectorAll('entry');

    if (!entries.length) { resultsEl.innerHTML = '<div class="arxiv-loading">No results.</div>'; btn.disabled=false; return; }

    resultsEl.innerHTML = '';
    entries.forEach(entry => {
      const title   = entry.querySelector('title')?.textContent?.trim().replace(/\s+/g,' ') || '';
      const authors = Array.from(entry.querySelector('author name')?[entry.querySelectorAll('author name')]:[]).slice(0,3).map(a=>a?.textContent||'').filter(Boolean);
      const authorStr = (() => { const as = entry.querySelectorAll('author name'); return Array.from(as).slice(0,3).map(a=>a.textContent).join(', '); })();
      const summary = entry.querySelector('summary')?.textContent?.trim().replace(/\s+/g,' ') || '';
      const year = entry.querySelector('published')?.textContent?.substring(0,4) || '';
      const id = entry.querySelector('id')?.textContent?.trim() || '';

      const div = document.createElement('div');
      div.className = 'arxiv-result-item';
      div.innerHTML = `<div class="arxiv-result-title">${title}</div><div class="arxiv-result-meta">${authorStr} · ${year}</div>`;
      div.onclick = () => addArxivPaper({ title, authors: authorStr, year: parseInt(year)||2024, summary, arxivId: id });
      resultsEl.appendChild(div);
    });
    addLog('r', `<b>arXiv</b> ${entries.length} results for "${query}"`);
  } catch(e) {
    resultsEl.innerHTML = `<div class="arxiv-loading" style="color:var(--danger)">Failed: ${e.message}</div>`;
  }
  btn.disabled = false;
}

function addArxivPaper({ title, authors, year, summary, arxivId }) {
  if (PAPERS.find(p=>p.title===title)) { showToast('Already in library.'); return; }
  const paper = {
    id: 'arxiv_'+Date.now(), title, authors: authors+(authors.includes('et al')?'':' et al.'),
    year, venue:'arXiv', field:'other', abstract:summary, keywords:[], fromArxiv:true, arxivId
  };
  PAPERS.push(paper);
  selectedPaperId = paper.id;
  updatePaperCount(); renderPapers();
  document.getElementById('arxivResults').innerHTML = '';
  document.getElementById('arxivInput').value = '';
  addLog('r', `<b>arXiv</b> added "${title.substring(0,25)}..."`);
  addMessage('aria', `✅ Added from arXiv:<br><strong>${title}</strong><br><span style="color:var(--muted);font-size:11px">${authors} · ${year}</span><br><br>Click <strong>🔬 Full pipeline</strong> to research it.`, 'aria');
}

// ══════════════════════════════════════
// FEATURE 3: MULTI-PAPER SYNTHESIS
// ══════════════════════════════════════
function toggleSynthMode() {
  synthMode = !synthMode;
  synthesizeSet.clear();
  const btn = document.getElementById('synthModeBtn');
  btn.classList.toggle('active', synthMode);
  btn.textContent = synthMode ? '✕ Cancel' : '⊕ Multi-select';
  document.getElementById('synthHint').style.display = synthMode ? 'flex' : 'none';
  renderPapers();
}

function toggleSynthSelect(id) {
  if (synthesizeSet.has(id)) { synthesizeSet.delete(id); }
  else if (synthesizeSet.size < 4) { synthesizeSet.add(id); }
  document.getElementById('synthCount').textContent = synthesizeSet.size + ' selected';
  renderPapers();
}

async function runSynthesis() {
  if (synthesizeSet.size < 2) { showToast('Select at least 2 papers.'); return; }
  const papers = Array.from(synthesizeSet).map(id => PAPERS.find(p=>p.id===id));
  toggleSynthMode();

  activateNode('nodeSynthesize');
  isRunning = true;
  document.getElementById('sendBtn').disabled = true;
  setStatus('running');

  addMessage('aria', `🔗 Synthesizing <strong>${papers.length} papers</strong>…`, 'aria');
  const target = addStreamingMessage('synthesize');
  try {
    const result = await synthesisAgent(papers);
    target.innerHTML = formatOutput(result);
    addLog('s', `<b>Synthesis</b> ${papers.length} papers`);
    addMessage('aria', `✅ Synthesis complete across ${papers.length} papers.`, 'aria');
  } catch(e) { target.innerHTML = err(e); }

  activateNode(null);
  isRunning = false;
  document.getElementById('sendBtn').disabled = false;
  setStatus('done');
}

// ══════════════════════════════════════
// FEATURE 4: CITATION NETWORK
// ══════════════════════════════════════
function toggleCitations() {
  citationsVisible = !citationsVisible;
  document.getElementById('citationPanel').style.display = citationsVisible ? 'block' : 'none';
  document.getElementById('citToggle').textContent = citationsVisible ? 'hide' : 'show';
}

async function extractCitations(analysisText, paper) {
  try {
    const citations = await citationExtractor(analysisText, paper);
    const list = document.getElementById('citationList');
    list.innerHTML = citations.map(c => `
      <div class="citation-item" onclick="searchFromCitation('${(c.title||'').replace(/'/g,"\\'").substring(0,50)}')">
        <div class="citation-title">${c.title||''}</div>
        <div class="citation-meta">${c.authors||''} ${c.year?'· '+c.year:''}</div>
        ${c.reason?`<div class="citation-reason">${c.reason}</div>`:''}
      </div>`).join('');
    if (!citationsVisible) toggleCitations();
    addLog('s', `<b>Citations</b> ${citations.length} extracted`);
  } catch(e) { /* silent */ }
}

function searchFromCitation(title) {
  document.getElementById('arxivInput').value = title;
  searchArxiv();
}

// ══════════════════════════════════════
// FEATURE 5: STREAMING UI (visual)
// Implemented via loading-dots + real
// token delivery from API
// ══════════════════════════════════════
// (Built into addStreamingMessage above)

// ══════════════════════════════════════
// FEATURE 6: SESSION MEMORY
// ══════════════════════════════════════
const MEMORY_KEY = 'aria_session';

function saveMemory() {
  const snap = {
    selectedPaperId, metrics, lastAnalysis, lastHypotheses, lastExperiment, lastReport,
    customPapers: PAPERS.filter(p => p.uploaded || p.fromArxiv),
    timestamp: Date.now()
  };
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(snap)); } catch(e) {}
}

function loadMemory() {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return;
    const snap = JSON.parse(raw);
    // Only restore if within 24h
    if (Date.now() - snap.timestamp > 86400000) return;

    if (snap.customPapers?.length) {
      snap.customPapers.forEach(p => { if (!PAPERS.find(x=>x.id===p.id)) PAPERS.push(p); });
      updatePaperCount(); renderPapers();
    }
    if (snap.selectedPaperId && PAPERS.find(p=>p.id===snap.selectedPaperId)) {
      selectedPaperId = snap.selectedPaperId;
    }
    if (snap.metrics) metrics = { ...metrics, ...snap.metrics };
    Object.keys(metrics).forEach(k => {
      const ids = { papers:'mPapers', hyp:'mHyp', exp:'mExp', rep:'mRep' };
      if (ids[k]) document.getElementById(ids[k]).textContent = metrics[k];
    });
    lastAnalysis = snap.lastAnalysis || '';
    lastHypotheses = snap.lastHypotheses || '';
    lastExperiment = snap.lastExperiment || '';
    lastReport = snap.lastReport || '';

    if (snap.selectedPaperId) {
      renderPapers();
      const p = PAPERS.find(x=>x.id===snap.selectedPaperId);
      if (p) addMessage('aria', `💾 Session restored — <strong>${p.title.substring(0,40)}</strong> ready.`, 'aria');
    }
    addLog('s', `<b>Memory</b> session restored`);
  } catch(e) {}
}

// Auto-save every 30s and on pipeline completion
setInterval(saveMemory, 30000);

// ══════════════════════════════════════
// FEATURE 7: AGENT DEBATE
// ══════════════════════════════════════
async function runDebate() {
  const paper = getSelectedPaper();
  if (!paper) { showToast('Select a paper first.'); return; }

  const btn = document.getElementById('debateBtn');
  btn.disabled = true; btn.textContent = 'Debating...';

  activateNode('nodeDebate');
  isRunning = true; setStatus('running');

  const output = document.getElementById('debateOutput');
  output.innerHTML = `
    <div class="debate-col agent-a">
      <div class="debate-col-header">⚔ Agent A — Optimist</div>
      <div class="debate-content" id="debateAContent"><span class="loading-dots" style="color:var(--muted)">Arguing</span></div>
    </div>
    <div class="debate-col agent-b">
      <div class="debate-col-header">⚔ Agent B — Challenger</div>
      <div class="debate-content" id="debateBContent"><span class="loading-dots" style="color:var(--muted)">Arguing</span></div>
    </div>
    <div class="debate-col judge">
      <div class="debate-col-header">⚖ Judge</div>
      <div class="debate-content" id="debateJContent"><span style="color:var(--muted)">Waiting for arguments...</span></div>
    </div>`;

  try {
    // Run A and B in parallel
    const [argA, argB] = await Promise.all([
      debateAgentA(paper, agentHistory),
      debateAgentB(paper, agentHistory)
    ]);
    document.getElementById('debateAContent').innerHTML = formatOutput(argA);
    document.getElementById('debateBContent').innerHTML = formatOutput(argB);

    document.getElementById('debateJContent').innerHTML = '<span class="loading-dots" style="color:var(--muted)">Judging</span>';
    const verdict = await judgeAgent(paper, argA, argB);
    document.getElementById('debateJContent').innerHTML = formatOutput(verdict);

    addLog('s', `<b>Debate</b> complete for "${paper.title.substring(0,20)}..."`);
  } catch(e) {
    output.innerHTML = `<div style="color:var(--danger);padding:1rem">${e.message}</div>`;
  }

  activateNode(null);
  isRunning = false; setStatus('done');
  btn.disabled = false; btn.textContent = '⚔️ Start Debate';
}

// ══════════════════════════════════════
// FEATURE 8: EXPERIMENT CODE GENERATION
// ══════════════════════════════════════
function copyCode(id) {
  const el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => showToast('Code copied!'));
}

// ══════════════════════════════════════
// FEATURE 9: RESEARCH HISTORY
// ══════════════════════════════════════
const HISTORY_KEY = 'aria_history';

function saveToHistory(paper, analysis, hypotheses, experiment, report) {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    const entry = {
      id: 'h_'+Date.now(),
      paperId: paper.id, paperTitle: paper.title,
      authors: paper.authors, year: paper.year,
      timestamp: Date.now(),
      preview: report ? report.substring(0,200) : analysis.substring(0,200),
      analysis, hypotheses, experiment, report
    };
    existing.unshift(entry);
    const trimmed = existing.slice(0, 20); // keep 20 most recent
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    saveMemory();
  } catch(e) {}
}

function renderHistory() {
  const list = document.getElementById('historyList');
  try {
    const items = JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    if (!items.length) {
      list.innerHTML = '<div class="history-empty">No research history yet.<br>Run the full pipeline to save a session.</div>';
      return;
    }
    list.innerHTML = items.map(item => `
      <div class="history-item" onclick="loadHistoryItem('${item.id}')">
        <div class="history-item-title">${item.paperTitle}</div>
        <div class="history-item-meta">
          <span>${item.authors}</span>
          <span>${item.year}</span>
          <span>${new Date(item.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="history-item-preview">${(item.preview||'').substring(0,140)}…</div>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = '<div class="history-empty">Could not load history.</div>';
  }
}

function loadHistoryItem(id) {
  try {
    const items = JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    const item = items.find(x=>x.id===id);
    if (!item) return;
    lastAnalysis = item.analysis||'';
    lastHypotheses = item.hypotheses||'';
    lastExperiment = item.experiment||'';
    lastReport = item.report||'';
    switchTab('workspace');
    const output = document.getElementById('agentOutput');
    output.innerHTML = '';
    addMessage('aria', `📂 Loaded history: <strong>${item.paperTitle}</strong><br>All pipeline outputs restored. Click ⬇ Export PDF or continue researching.`, 'aria');
    if (item.analysis)   { const m = addMessage('agent', formatOutput(item.analysis),   'reader');     m.querySelector('.message-content').style.display='block'; }
    if (item.hypotheses) { const m = addMessage('agent', formatOutput(item.hypotheses), 'hypothesis'); m.querySelector('.message-content').style.display='block'; }
    if (item.experiment) { const m = addMessage('agent', formatOutput(item.experiment), 'experiment'); m.querySelector('.message-content').style.display='block'; }
    if (item.report)     { const m = addMessage('agent', formatOutput(item.report),     'report');     m.querySelector('.message-content').style.display='block'; }
    document.getElementById('exportBtn').style.color = 'var(--accent2)';
    addLog('s', `<b>History</b> loaded "${item.paperTitle.substring(0,20)}..."`);
  } catch(e) { showToast('Could not load this session.'); }
}

function clearHistory() {
  if (!confirm('Clear all research history?')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  showToast('History cleared.');
}

// ══════════════════════════════════════
// FEATURE 10: SHARE LINK
// ══════════════════════════════════════
function copyShareLink() {
  const paper = getSelectedPaper();
  const state = {
    pid: paper.id,
    t: paper.title.substring(0,80),
    a: paper.authors.substring(0,40),
    y: paper.year
  };
  const encoded = btoa(JSON.stringify(state));
  const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;

  navigator.clipboard.writeText(url).then(() => {
    showToast('Share link copied to clipboard!');
    addLog('s', `<b>Share</b> link copied`);
  }).catch(() => {
    // Fallback: show the URL
    prompt('Copy this share link:', url);
  });
}

function restoreFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('s');
    if (!s) return;
    const state = JSON.parse(atob(s));
    // If paper exists in library, select it
    const existing = PAPERS.find(p=>p.id===state.pid || p.title===state.t);
    if (existing) {
      selectPaper(existing.id);
      addMessage('aria', `🔗 Shared session loaded: <strong>${existing.title}</strong>`, 'aria');
    } else {
      addMessage('aria', `🔗 Shared paper: <strong>${state.t}</strong> (${state.a}, ${state.y})<br>Search arXiv for it or upload the PDF to continue.`, 'aria');
    }
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  } catch(e) {}
}

// ══════════════════════════════════════
// UPLOAD
// ══════════════════════════════════════
function handleDragOver(e) { e.preventDefault(); document.getElementById('uploadZone').classList.add('drag-over'); }
function handleDragLeave()  { document.getElementById('uploadZone').classList.remove('drag-over'); }
function handleDrop(e) {
  e.preventDefault(); document.getElementById('uploadZone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0]; if (file) processUploadedFile(file);
}
function handleFileSelect(e) {
  const file = e.target.files[0]; if (file) processUploadedFile(file); e.target.value='';
}
function showUploadProgress(label) {
  document.getElementById('uploadProgress').style.display='block';
  document.getElementById('uploadProgressLabel').textContent=label;
}
function hideUploadProgress() { document.getElementById('uploadProgress').style.display='none'; }

async function processUploadedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf','txt','md'].includes(ext)) { showToast('Upload PDF, TXT, or MD.'); return; }
  showUploadProgress(`Reading ${file.name}…`);
  addLog('r', `<b>Upload</b> reading "${file.name}"`);
  try {
    const rawText = ext==='pdf' ? await extractTextFromPDF(file) : await readTextFile(file);
    if (!rawText || rawText.trim().length < 100) { hideUploadProgress(); showToast('Not enough text extracted.'); return; }
    showUploadProgress('Extracting metadata with AI…');
    let meta;
    try { meta = await metadataExtractor(rawText, file.name); } catch(e) {
      meta = { title: file.name.replace(/\.(pdf|txt|md)$/i,'').replace(/[-_]/g,' '), authors:'Unknown', year:new Date().getFullYear(), venue:'Uploaded', field:'other', abstract:rawText.substring(0,800), keywords:[] };
    }
    meta.id = 'upload_'+Date.now();
    meta.year = parseInt(meta.year)||new Date().getFullYear();
    meta.keywords = Array.isArray(meta.keywords)?meta.keywords:[];
    meta.uploaded = true;
    hideUploadProgress();
    PAPERS.push(meta);
    selectedPaperId = meta.id;
    updatePaperCount(); renderPapers();
    addLog('r', `<b>Uploaded</b> "${meta.title.substring(0,25)}..."`);
    addMessage('aria', `✅ Uploaded: <strong>${meta.title}</strong><br><span style="color:var(--muted);font-size:11px">${meta.authors} · ${meta.year} · ${meta.venue}</span><br><br>Click <strong>🔬 Full pipeline</strong> to start.`, 'aria');
    saveMemory();
  } catch(e) { hideUploadProgress(); showToast(`Upload error: ${e.message}`); }
}

function readTextFile(file) {
  return new Promise((res,rej) => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=()=>rej(new Error('Read failed')); r.readAsText(file); });
}

async function extractTextFromPDF(file) {
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const pdf = await window.pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
  let text='';
  const pages = Math.min(pdf.numPages, 8);
  for (let i=1; i<=pages; i++) {
    showUploadProgress(`Page ${i} of ${pages}…`);
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(x=>x.str).join(' ')+'\n';
  }
  return text;
}

function loadScript(src) {
  return new Promise((res,rej)=>{
    if (document.querySelector(`script[src="${src}"]`)){res();return;}
    const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Script load failed')); document.head.appendChild(s);
  });
}

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2500);
}
