// Parses the raw syllabus text into structured JSON (tools/data.json).
import fs from 'node:fs';
const SRC = process.argv[2];
const raw = fs.readFileSync(SRC, 'utf8').split('\n').map(l => l.replace(/\r$/, '').replace(/\t/g, ' ').trim());

const DOMAINS = new Set(['shafiqulai.github.io','psitrontech.com','splunk.com','linkedin.com','medium.com','wasilzafar.com','blog.bytebytego.com']);
const isJunk = l => l === '' || /^\d{1,2}$/.test(l) || DOMAINS.has(l) || l === '0/10' || /^0\/\d+$/.test(l);
const TERM = [/^Final capstone:/i, /^Phase \d+ (capstone|practical project|completion|self-assessment)/i, /^Expected outcome/i, /^Next[:,]/, /^Let'?s /i, /^et's /, /^Final phase/, /^Now we/, /^Section \d+ —/, /^Remaining phases/, /^How we'll proceed/, /^Our rule/, /^Complete structured/, /^This is now/, /^My recommendation/, /^Keep /, /^Final master/, /^Phase \d+ —/, /^Phase \d+:/, /^Phase 8 completion/, /^Final supplementary/, /^Important career advice/, /^Final verdict/, /^When we begin/, /^Final coverage/, /^Final optional/, /^My honest/, /^Additional \d+-day/];
const TASK = /^(Exercise|Practical|Project|Final deliverable|Mini project|Capstone):\s*(.*)$/i;

// 1. locate module headings (numbers must be sequential)
let expected = 1; const heads = [];
raw.forEach((l, i) => {
  const m = l.match(/^(\d{1,3})\. (.+)$/);
  if (m && +m[1] === expected && !m[2].endsWith('.') && expected <= 135) { heads.push({ n: expected, title: m[2], i }); expected++; }
});
if (heads.length !== 135) { console.error('Found', heads.length, 'modules'); }

// 2. build modules
const modules = heads.map((h, k) => {
  const end = k + 1 < heads.length ? heads[k + 1].i : raw.length;
  let body = raw.slice(h.i + 1, end);
  const cut = body.findIndex(l => TERM.some(r => r.test(l)));
  // keep a "Final deliverable:" line even though it precedes a terminator
  const tail = cut >= 0 ? body.slice(cut) : [];
  body = cut >= 0 ? body.slice(0, cut) : body;
  tail.forEach(l => { if (/^Final deliverable:/i.test(l)) body.push(l); });
  body = body.filter(l => !isJunk(l));
  const mod = { day: h.n, title: h.title, objective: '', intro: [], sections: [], tasks: [] };
  const hasBullets = body.some(l => l.startsWith('- '));
  let cur = null;
  const flatItems = []; 
  for (const l of body) {
    let t;
    if ((t = l.match(/^Objective:\s*(.*)$/))) { mod.objective = t[1]; continue; }
    if ((t = l.match(TASK))) { mod.tasks.push({ label: t[1][0].toUpperCase() + t[1].slice(1).toLowerCase(), text: t[2] }); continue; }
    if (l.startsWith('- ')) { if (!cur) { cur = { title: '', items: [] }; mod.sections.push(cur); } cur.items.push(l.slice(2)); continue; }
    const num = l.match(/^(\d{1,2})\. (.+)$/);
    if (hasBullets) {
      if (num) { cur = { title: num[2], items: [] }; mod.sections.push(cur); }
      else mod.intro.push(l);
    } else if (h.n <= 20) { flatItems.push(l); }
    else if (num) { flatItems.push(num[2]); }
    else mod.intro.push(l);
  }
  if (flatItems.length) mod.sections.push({ title: '', items: flatItems });
  mod.sections = mod.sections.filter(s => s.items.length);
  return mod;
});

// 3. phase-level extras (capstones, outcomes, checklists)
const extras = {}; let phaseCtx = 1, lastMod = 0; let checklistPhase = null;
const phaseOf = n => n <= 10 ? 1 : n <= 20 ? 2 : n <= 30 ? 3 : n <= 45 ? 4 : n <= 60 ? 5 : n <= 75 ? 6 : n <= 90 ? 7 : n <= 120 ? 8 : 9;
const ex = p => (extras[p] ||= { capstone: '', outcome: '', checklist: [] });
raw.forEach((l, i) => {
  const hd = heads.find(h => h.i === i); if (hd) lastMod = hd.n;
  let m;
  if ((m = l.match(/^Phase (\d) (capstone|practical project):\s*(.*)$/i))) ex(+m[1]).capstone = m[3];
  else if ((m = l.match(/^Final capstone:\s*(.*)$/i))) ex(7).capstone = m[1];
  else if ((m = l.match(/^Expected outcome:\s*(.*)$/i))) ex(phaseOf(lastMod)).outcome = m[1];
  else if ((m = l.match(/^Phase (\d) (completion checklist|self-assessment)/i))) checklistPhase = +m[1];
  else if ((m = l.match(/^\[ \] (.+)$/))) ex(checklistPhase || phaseOf(lastMod)).checklist.push(m[1]);
});

// 4. manual clean-ups where the source mixes extra commentary into a module
const m120 = modules[119]; const it = m120.sections[0].items;
m120.intro = ['The last eight areas are not mandatory for most Senior Generative AI Engineer or AI Solution Architect positions; study them only if your target job requires them.'];
m120.sections = [{ title: 'Interview and portfolio preparation', items: it.slice(0, 16) }, { title: 'Specialized areas (only if your target job requires them)', items: it.slice(16) }];
ex(8).capstone = modules[109].intro[1].replace(/^Build/, 'Build') ;

// 5. optional tracks + gap-closing checklist (groups of "N. Title" with "- item" bullets)
function groups(startRe, endRe) {
  const a = raw.findIndex(l => startRe.test(l)); const b = raw.findIndex((l, i) => i > a && endRe.test(l));
  const out = []; let g = null;
  for (const l of raw.slice(a + 1, b)) { const t = l.match(/^(\d)\. (.+)$/); if (t) { g = { title: t[2], items: [] }; out.push(g); } else if (l.startsWith('- ') && g) g.items.push(l.slice(2)); }
  return out;
}
const tracks = groups(/^Final optional specialization topics/, /^This last area is particularly/);
const gaps = groups(/^Final gap-closing checklist/, /^Final master curriculum status/);
fs.writeFileSync(new URL('./data.json', import.meta.url), JSON.stringify({ modules, extras, tracks, gaps }, null, 1));
console.log('modules', modules.length, 'tracks', tracks.length, 'gaps', gaps.length, 'p7 capstone:', extras[7].capstone.slice(0, 60), '| p8:', extras[8].capstone.slice(0, 60));
