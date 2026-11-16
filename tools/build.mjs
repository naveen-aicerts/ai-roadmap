// Generates the static HTML pages from tools/data.json (run once: node tools/build.mjs).
// The generated site itself needs no build step: open index.html directly.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/data.json'), 'utf8'));
const { modules, extras, tracks, gaps } = D;

// ---- Phase metadata (titles, ranges and objectives are quoted from the syllabus) ----
const PHASES = [
  { n: 1, from: 1, to: 10, title: 'Python Engineering for AI Development', obj: 'Become comfortable building professional Python backend applications, even with your existing PHP/Laravel background.' },
  { n: 2, from: 11, to: 20, title: 'Machine Learning and AI Fundamentals', obj: 'Understand the mathematics, algorithms and neural-network concepts behind modern AI.' },
  { n: 3, from: 21, to: 30, title: 'Generative AI & LLM Engineering', obj: 'Understand how LLMs work internally and learn to build reliable, production-ready applications using commercial and open-source models.' },
  { n: 4, from: 31, to: 45, title: 'Retrieval Engineering: Embeddings & RAG', obj: 'Build enterprise-grade Retrieval-Augmented Generation systems that answer from private documents with reliable citations.' },
  { n: 5, from: 46, to: 60, title: 'Agentic AI Engineering: LangChain, LangGraph & MCP', obj: 'Design and implement reliable AI agents, multi-agent systems and enterprise agentic workflows.' },
  { n: 6, from: 61, to: 75, title: 'Production AI Engineering, Cloud & DevOps', obj: 'Learn to convert Python, RAG and Agentic AI applications into secure, scalable, monitored production systems using Docker, AWS, Kubernetes, CI/CD and distributed architecture.' },
  { n: 7, from: 76, to: 90, title: 'Enterprise AI Architecture, System Design & Senior Interview Preparation', obj: 'Develop enterprise architecture skills, make sound AI technology decisions, design scalable AI platforms and prepare for senior-level technical and architecture interviews.' },
  { n: 8, from: 91, to: 120, title: 'Advanced AI Engineering Specialization', obj: 'Build deeper expertise in AI mathematics, deep learning, advanced LLM internals, modern RAG, model training, inference infrastructure, MLOps and advanced AI system engineering.' },
  { n: 9, from: 121, to: 135, title: 'Final Engineering Specializations', obj: 'Final supplementary topics, Days 121–135.' },
];
const phaseOf = d => PHASES.find(p => d >= p.from && d <= p.to);
const TOTAL = modules.length;

// ---- helpers ----
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PH = '<span class="placeholder" title="Not provided in the syllabus">[Not specified in syllabus]</span>';
const count = m => m.sections.reduce((a, s) => a + s.items.length, 0);
const NAV = [['index.html', 'Home'], ['schedule.html', 'Schedule'], ['modules.html', 'Modules'], ['assignments.html', 'Assignments'], ['resources.html', 'Resources'], ['policies.html', 'Policies'], ['contact.html', 'Contact']];

// layout(file, ...) — file is 'index.html' or 'pages/x.html'; computes relative links
function layout(file, title, body, desc) {
  const inPages = file.startsWith('pages/');
  const up = inPages ? '../' : '';
  const link = f => (f === 'index.html' ? up + 'index.html' : (inPages ? '' : 'pages/') + f);
  const me = path.basename(file);
  const nav = NAV.map(([f, label]) => `<li><a href="${link(f)}"${f === me ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · AI Engineering Master Curriculum</title>
<meta name="description" content="${esc(desc || 'A 135-day AI engineering curriculum, from Python to enterprise AI architecture.')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,500;8..60,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${up}css/style.css">
<script>try{var t=localStorage.getItem('airoadmap.theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
</head>
<body data-root="${up}">
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${up}index.html"><span class="brand-mark" aria-hidden="true">AI</span><span>AI Engineering<br><small>135-Day Curriculum</small></span></a>
    <button class="icon-btn nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle menu"><span class="bars" aria-hidden="true"></span></button>
    <nav id="site-nav" class="site-nav" aria-label="Main"><ul>${nav}</ul></nav>
    <button class="icon-btn theme-toggle" aria-label="Switch to dark mode" title="Toggle dark / light mode"><span aria-hidden="true" class="theme-icon">◐</span></button>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer"><div class="wrap">
  <p>Built from the course syllabus. Anything the syllabus does not state is shown as <span class="placeholder">[Not specified in syllabus]</span>.</p>
  <p><a href="${up}assets/original-syllabus.html" download>Download syllabus (original HTML)</a> · <a href="#" class="print-link">Print this page</a></p>
</div></footer>
<script src="${up}js/main.js"></script>
</body>
</html>
`;
}
const write = (f, html) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), html); };

// ---- module markup ----
function moduleHTML(m) {
  const secs = m.sections.map(s => `<section class="topic-group">${s.title ? `<h4>${esc(s.title)}</h4>` : ''}<ul>${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>`).join('');
  const tasks = m.tasks.map(t => `<p class="task"><strong>${esc(t.label)}:</strong> ${esc(t.text)}</p>`).join('');
  const intro = m.intro.map(t => `<p>${esc(t)}</p>`).join('');
  const hay = [m.title, m.objective, ...m.intro, ...m.sections.flatMap(s => [s.title, ...s.items]), ...m.tasks.map(t => t.text)].join(' ').toLowerCase();
  return `<details class="module" id="day-${m.day}" data-day="${m.day}" data-phase="${phaseOf(m.day).n}" data-search="${esc(hay)}">
  <summary><span class="day-badge">Day ${m.day}</span><span class="module-title">${esc(m.title)}</span><span class="module-meta">${count(m)} topics</span><span class="done-flag" aria-hidden="true">✓ Done</span></summary>
  <div class="module-body">
    ${m.objective ? `<p class="objective"><strong>Objective:</strong> ${esc(m.objective)}</p>` : ''}${intro}${secs}${tasks}
    <label class="mark-done"><input type="checkbox" data-done="${m.day}"> Mark Day ${m.day} complete</label>
  </div>
</details>`;
}

// ---- HOME ----
const outcomes = PHASES.filter(p => extras[p.n]?.outcome).map(p => `<li><strong>Phase ${p.n}:</strong> ${esc(extras[p.n].outcome)}</li>`).join('');
const phaseCards = PHASES.map(p => `<a class="phase-card" href="pages/modules.html#phase-${p.n}"><span class="eyebrow">Phase ${p.n} · Days ${p.from}–${p.to}</span><strong>${esc(p.title)}</strong><span class="bar" aria-hidden="true"><i data-phase-bar="${p.n}"></i></span><small><span data-phase-count="${p.n}">0</span> / ${p.to - p.from + 1} complete</small></a>`).join('');
write('index.html', layout('index.html', 'Home', `
<section class="hero">
  <p class="eyebrow">Course syllabus</p>
  <h1>AI Engineering Master Curriculum</h1>
  <p class="lead">A step-by-step program that moves from Python engineering through machine learning, LLMs, RAG, agentic AI, production cloud engineering and enterprise architecture. It aims to build the skills to compete for Senior AI Engineer, Generative AI Engineer, Agentic AI Engineer and AI Solution Architect roles.</p>
  <form class="hero-search" action="pages/modules.html" method="get" role="search">
    <label for="home-q" class="sr-only">Search modules and topics</label>
    <input id="home-q" name="q" type="search" placeholder="Search all ${TOTAL} modules and topics, e.g. “LangGraph”, “Kubernetes”">
    <button class="btn" type="submit">Search</button>
  </form>
</section>

<section aria-labelledby="glance"><h2 id="glance">At a glance</h2>
<div class="cards">
  <div class="card"><span class="eyebrow">Duration</span><strong>${TOTAL} days</strong><p>${PHASES.length} phases, ${TOTAL} modules (one per day)</p></div>
  <div class="card"><span class="eyebrow">Credits</span><strong>${PH}</strong></div>
  <div class="card"><span class="eyebrow">Prerequisites</span><strong>Backend experience</strong><p>Phase 1 assumes a PHP/Laravel background and builds Python skills from the ground up. Formal prerequisites: ${PH}</p></div>
  <div class="card"><span class="eyebrow">Instructor</span><strong>${PH}</strong><p><a href="pages/contact.html">Contact page</a></p></div>
</div></section>

<section class="progress-panel" aria-labelledby="prog"><h2 id="prog">Your progress</h2>
  <p><span data-total-done>0</span> of ${TOTAL} modules marked complete (<span data-total-pct>0</span>%).</p>
  <div class="bar big" role="progressbar" aria-label="Overall completion" aria-valuemin="0" aria-valuemax="${TOTAL}" aria-valuenow="0"><i data-total-bar></i></div>
  <p class="today-banner" data-today hidden></p>
  <p class="muted">Progress is saved only in this browser. <a href="pages/schedule.html">Set a start date</a> to see which day is today.</p>
</section>

<section aria-labelledby="outcomes"><h2 id="outcomes">Learning outcomes</h2>
<p>Expected outcome stated for each phase in the syllabus:</p><ul class="outcomes">${outcomes}</ul></section>

<section aria-labelledby="phases"><h2 id="phases">The ${PHASES.length} phases</h2><div class="phase-grid">${phaseCards}</div></section>

<section aria-labelledby="how"><h2 id="how">How each topic is taught</h2>
<p>For every topic the syllabus promises:</p>
<ol class="how"><li>Concepts and detailed subtopics.</li><li>Technical terminology and keywords.</li><li>Internal working mechanisms.</li><li>Practical coding exercises.</li><li>Real-world industry applications.</li><li>Common mistakes and troubleshooting.</li><li>Interview questions and answers to prepare.</li><li>A hands-on assignment with a completion checklist.</li></ol>
<blockquote class="rule">We don’t mark a topic complete just because you’ve read it. You must be able to explain it and implement it.</blockquote></section>
`, 'Course overview: 135 days from Python engineering to enterprise AI architecture.'));

// ---- MODULES ----
const modSections = PHASES.map(p => {
  const ms = modules.filter(m => m.day >= p.from && m.day <= p.to).map(moduleHTML).join('\n');
  return `<section class="phase" id="phase-${p.n}" data-phase-section="${p.n}">
  <header class="phase-head"><p class="eyebrow">Phase ${p.n} · Days ${p.from}–${p.to}</p><h2>${esc(p.title)}</h2><p>${esc(p.obj)}</p></header>
  ${ms}</section>`;
}).join('\n');
const chips = PHASES.map(p => `<button type="button" class="chip" data-filter-phase="${p.n}" aria-pressed="false">Phase ${p.n}</button>`).join('');
write('pages/modules.html', layout('pages/modules.html', 'Modules', `
<h1>Modules &amp; Topics</h1>
<p class="lead">All ${TOTAL} modules. Open a module to see its objective, subtopics and exercise.</p>
<div class="toolbar" role="search">
  <label for="q" class="sr-only">Search modules and topics</label>
  <input id="q" type="search" placeholder="Filter modules and topics…" autocomplete="off">
  <div class="btn-row"><button type="button" class="btn ghost" id="expand-all">Expand all</button><button type="button" class="btn ghost" id="collapse-all">Collapse all</button></div>
  <div class="chips" role="group" aria-label="Filter by phase"><button type="button" class="chip" data-filter-phase="all" aria-pressed="true">All</button>${chips}</div>
  <p class="muted" id="result-count" role="status" aria-live="polite"></p>
</div>
<p id="no-results" class="empty" hidden>No modules match your search.</p>
${modSections}
`, 'All 135 curriculum modules with objectives, subtopics and exercises.'));

// ---- SCHEDULE ----
const sched = PHASES.map(p => {
  const rows = modules.filter(m => m.day >= p.from && m.day <= p.to).map(m => `<tr data-day="${m.day}"><th scope="row">Day ${m.day}</th><td><a href="modules.html#day-${m.day}">${esc(m.title)}</a></td><td class="col-date" data-date></td><td class="col-status" data-status>—</td></tr>`).join('');
  return `<details class="phase-table" id="phase-t${p.n}" open><summary><span class="day-badge">Phase ${p.n}</span><span class="module-title">${esc(p.title)}</span><span class="module-meta">Days ${p.from}–${p.to}</span></summary>
  <div class="table-wrap"><table><thead><tr><th>Day</th><th>Module</th><th class="col-date">Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
}).join('');
const timeline = PHASES.map(p => `<li style="--w:${p.to - p.from + 1}"><a href="#phase-t${p.n}" data-phase-jump="${p.n}"><span>P${p.n}</span><small>${p.to - p.from + 1} d</small></a></li>`).join('');
write('pages/schedule.html', layout('pages/schedule.html', 'Schedule', `
<h1>Schedule</h1>
<p class="lead">The syllabus defines ${TOTAL} numbered days and does not give calendar dates. Enter your own start date below to generate dates and highlight the current week.</p>
<form class="date-form" id="date-form">
  <div><label for="start">Start date</label><input type="date" id="start"></div>
  <div><label for="pace">Calendar days per module</label><input type="number" id="pace" min="1" max="14" value="1"></div>
  <button class="btn" type="submit">Apply</button><button class="btn ghost" type="button" id="clear-date">Clear</button>
</form>
<p class="today-banner" data-today role="status" hidden></p>
<h2>Phase timeline</h2>
<ol class="timeline" aria-label="Phases sized by number of days">${timeline}</ol>
<h2>Day-by-day plan</h2>
${sched}
`, 'Day-by-day plan for all 135 modules with optional start date.'));

// ---- ASSIGNMENTS ----
const taskRows = modules.filter(m => m.tasks.length).flatMap(m => m.tasks.map(t => `<tr><th scope="row"><a href="modules.html#day-${m.day}">Day ${m.day}</a></th><td>${esc(t.label)}</td><td>${esc(t.text)}</td></tr>`)).join('');
const caps = PHASES.filter(p => extras[p.n]?.capstone).map(p => `<article class="card"><span class="eyebrow">Phase ${p.n} capstone</span><p>${esc(extras[p.n].capstone)}</p>${extras[p.n].outcome ? `<p class="muted"><strong>Expected outcome:</strong> ${esc(extras[p.n].outcome)}</p>` : ''}</article>`).join('');
const checklists = PHASES.filter(p => extras[p.n]?.checklist.length).map(p => `<details class="module" open><summary><span class="day-badge">Phase ${p.n}</span><span class="module-title">Self-assessment: ${esc(p.title)}</span><span class="module-meta"><span data-check-count="${p.n}">0</span>/${extras[p.n].checklist.length}</span></summary><div class="module-body"><ul class="checklist">${extras[p.n].checklist.map((c, i) => `<li><label><input type="checkbox" data-check="p${p.n}-${i}" data-check-phase="${p.n}"> ${esc(c)}</label></li>`).join('')}</ul></div></details>`).join('');
const maxDays = Math.max(...PHASES.map(p => p.to - p.from + 1));
const chart = PHASES.map(p => { const n = p.to - p.from + 1; return `<tr><th scope="row">Phase ${p.n}: ${esc(p.title.split(/[:,&]/)[0])}</th><td><span class="hbar" style="--v:${(n / 30 * 100).toFixed(1)}%"></span></td><td class="num">${n}</td></tr>`; }).join('');
write('pages/assignments.html', layout('pages/assignments.html', 'Assignments & Grading', `
<h1>Assignments &amp; Grading</h1>
<p class="lead">Every module ends with an exercise or project, every phase with a capstone and a self-assessment checklist.</p>
<h2>Grading</h2>
<div class="table-wrap"><table><thead><tr><th>Component</th><th>Weight</th></tr></thead><tbody>
<tr><th scope="row">Exercises</th><td>${PH}</td></tr><tr><th scope="row">Capstones</th><td>${PH}</td></tr><tr><th scope="row">Final assessment</th><td>${PH}</td></tr></tbody></table></div>
<p class="muted">The syllabus gives no grading scheme, so no weights are shown. Its final assessment is described as “Coding, production engineering, system design and architecture defense.”</p>
<h2>Where the effort goes</h2>
<div class="table-wrap"><table class="chart"><caption>Number of days per phase (from the syllabus)</caption><thead><tr><th>Phase</th><th><span class="sr-only">Bar</span></th><th>Days</th></tr></thead><tbody>${chart}</tbody></table></div>
<h2>Phase capstones</h2><div class="cards">${caps}</div>
<h2>Self-assessment checklists</h2><p class="muted">Tick items as you complete them. Saved in this browser only.</p>${checklists}
<h2>Module exercises &amp; projects</h2>
<div class="table-wrap"><table class="tasks"><thead><tr><th>Day</th><th>Type</th><th>Task</th></tr></thead><tbody>${taskRows}</tbody></table></div>
`, 'Exercises, capstones, checklists and grading.'));

// ---- RESOURCES ----
const toolGroups = [
  ['Python & backend', 'Python, FastAPI, Pydantic, SQLAlchemy, Alembic, pytest, Uvicorn, Celery'],
  ['Data & ML', 'NumPy, Pandas, Matplotlib, Seaborn, scikit-learn, PyTorch, XGBoost'],
  ['LLMs & retrieval', 'Hugging Face, Ollama, vLLM, OpenAI / Anthropic / Gemini APIs, Qdrant, Sentence Transformers, BM25'],
  ['Agents', 'LangChain, LangGraph, Model Context Protocol (MCP), LlamaIndex, DSPy'],
  ['Evaluation & observability', 'DeepEval, Ragas, LangSmith, Langfuse, OpenTelemetry, Prometheus, Grafana'],
  ['Data stores & messaging', 'PostgreSQL, Redis, Kafka, SQS, SNS, DynamoDB'],
  ['Cloud & DevOps', 'Docker, Kubernetes, AWS (IAM, VPC, S3, ECS, EKS, Lambda, RDS), Terraform, GitHub Actions'],
];
const grp = (arr, cls) => arr.map(g => `<details class="module ${cls || ''}"><summary><span class="module-title">${esc(g.title)}</span><span class="module-meta">${g.items.length} items</span></summary><div class="module-body"><ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div></details>`).join('');
write('pages/resources.html', layout('pages/resources.html', 'Resources', `
<h1>Resources &amp; Readings</h1>
<h2>Required readings</h2><p>${PH} The syllabus does not list textbooks or readings.</p>
<h2>Original syllabus</h2><p><a class="btn" href="../assets/original-syllabus.html" download>Download syllabus (HTML)</a></p>
<h2>Tools and technologies named in the syllabus</h2>
<div class="table-wrap"><table><thead><tr><th>Area</th><th>Named in the syllabus</th></tr></thead><tbody>${toolGroups.map(([a, b]) => `<tr><th scope="row">${a}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>
<h2>Optional specialization tracks</h2><p>The syllabus keeps these as optional tracks rather than a mandatory phase.</p>${grp(tracks.map(t => t))}
<h2>Gap-closing checklist</h2>${grp(gaps)}
`, 'Tools named in the syllabus, optional tracks and the original download.'));

// ---- POLICIES ----
write('pages/policies.html', layout('pages/policies.html', 'Policies', `
<h1>Policies</h1>
<p class="lead">Only policies that appear in the syllabus are listed. Everything else is marked as a placeholder.</p>
<h2>Completion standard</h2>
<p>A topic is not complete because it has been read. You must be able to explain it and implement it.</p>
<h2>Pace</h2>
<p>The syllabus recommends teaching in depth, with practical coding and projects, and adjusting the pace to your understanding rather than rushing to meet a deadline.</p>
<h2>Scope</h2>
<p>The syllabus recommends freezing the topic list and focusing on depth, coding, real projects, debugging, architecture and interview readiness. The aim is a working portfolio of at least three substantial AI systems, deployed and operated.</p>
<h2>Engineering judgment</h2>
<p>Do not build a multi-agent system for every problem. Know when a simple API call, deterministic workflow, RAG pipeline or single agent is the better architecture.</p>
<h2>Not specified</h2>
<div class="table-wrap"><table><tbody>
<tr><th scope="row">Attendance</th><td>${PH}</td></tr><tr><th scope="row">Late work</th><td>${PH}</td></tr><tr><th scope="row">Academic integrity</th><td>${PH}</td></tr><tr><th scope="row">Grading scale</th><td>${PH}</td></tr><tr><th scope="row">Accessibility accommodations</th><td>${PH}</td></tr></tbody></table></div>
`, 'Course policies stated in the syllabus.'));

// ---- CONTACT ----
write('pages/contact.html', layout('pages/contact.html', 'Instructor & Contact', `
<h1>Instructor &amp; Contact</h1>
<div class="table-wrap"><table><tbody>
<tr><th scope="row">Instructor</th><td>${PH}</td></tr><tr><th scope="row">Email</th><td>${PH}</td></tr><tr><th scope="row">Office hours</th><td>${PH}</td></tr><tr><th scope="row">Location / platform</th><td>${PH}</td></tr></tbody></table></div>
<h2>Target roles</h2>
<ul><li>Senior AI Engineer</li><li>Generative AI Engineer</li><li>Agentic AI Engineer</li><li>AI Solution Architect</li></ul>
`, 'Instructor and contact details.'));
console.log('built');
