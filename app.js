(() => {
'use strict';
/* ---------- data ---------- */
const W = window.WORDS.map((r, i) => ({ id: i, de: r[0], pl: r[1], en: r[2] || '' }));
const S = window.SENTENCES.map((r, i) => ({ id: i, de: r[0], pl: r[1], en: r[2] }));
const plIndex = new Map();
W.forEach(w => w.pl.forEach(f => { const k = f.toLowerCase(); if (!plIndex.has(k)) plIndex.set(k, []); plIndex.get(k).push(w.id); }));
const LANG = { dp: { from: 'de', to: 'pl' }, pd: { from: 'pl', to: 'de' } };
const NAME = { de: 'German', pl: 'Polish' };
const TYPES = {
  match:    { ic: '🔗', t: 'Match words',      d: 'Pair 5 words with their translations' },
  choose:   { ic: '👆', t: 'Pick translation', d: 'Choose the right one of four' },
  write:    { ic: '⌨️', t: 'Write the word',   d: 'Type the translation' },
  build:    { ic: '🧩', t: 'Build sentence',   d: 'Tap words into the right order' },
  sentence: { ic: '✍️', t: 'Write sentence',   d: 'Type the whole sentence' },
  mix:      { ic: '🎲', t: 'Mix',              d: 'All exercise types shuffled' }
};

/* ---------- tips (keyed by the language you have to PRODUCE) ---------- */
const TIPS = {
  match: {
    de: ['Look for cognates: Haus – house, Wasser – water, Buch – book. They are free points.', 'German nouns are capitalised (Tisch, Freund). A capital letter on a word is a hint that it is a noun.', 'Many long German words are compounds: Bahn + Hof = Bahnhof. Split them to guess the meaning.'],
    pl: ['Polish lists several forms of one word (cases and verb endings) – match the base meaning, not the ending.', 'No articles in Polish, so a German "der/die/das" is simply dropped in the translation.', 'Words with ą, ę, ł, ś, ż look similar to the German ones you know – read them slowly, letter by letter.']
  },
  choose: {
    de: ['Rule out the options that are obviously a different word class first (verb vs. noun).', 'Verbs often end in -en (machen, gehen). Nouns are capitalised. That alone narrows the choice.', 'Prefixes change meaning: ankommen = arrive, abfahren = depart, einsteigen = get on.'],
    pl: ['Polish verbs usually end in -ć (robić, pisać). Adjectives often end in -y / -a / -e.', 'Several Polish forms can mean the same German word – the case ending is not part of the meaning.', 'Beware of look-alikes: "pies" (dog) vs. "pić" (to drink).']
  },
  write: {
    de: ['Nouns need a capital letter. Typing the article too (der/die/das) is a great habit – it is accepted.', 'No ä/ö/ü/ß key? Typing ae/oe/ue/ss is accepted. Use the buttons under the field.', 'Separable verbs split in a sentence (Ich stehe auf), but the dictionary form is one word: aufstehen.'],
    pl: ['Diacritics matter: ą ć ę ł ń ó ś ź ż. A missed accent is flagged, so use the buttons under the field.', 'Any listed form is accepted, e.g. a noun in another case.', 'Spelling traps: ó/u, rz/ż and ch/h sound the same – memorise the spelling together with the word.']
  },
  build: {
    de: ['The conjugated verb is always in position 2 of a main clause: Heute gehe ich nach Hause.', 'After weil / dass / wenn the verb goes to the very end of the clause.', 'Time – Manner – Place: Ich fahre heute mit dem Bus nach Berlin.', 'Separable verbs send the prefix to the end: Ich rufe dich morgen an.'],
    pl: ['Polish word order is flexible; the neutral order is Subject – Verb – Object, as in English.', 'Polish often drops the pronoun: "Mam czas" already means "I have time".', 'The particle "się" usually follows the verb: Uczę się polskiego.', 'The past tense shows gender: zrobiłem (m) / zrobiłam (f).']
  },
  sentence: {
    de: ['Check three things: capital letters on nouns, verb in position 2, and a full stop or question mark.', 'Remember the case: after mit / von / zu / bei the noun is in the dative (mit dem Bus).', 'Perfect tense: haben/sein in position 2, participle at the end (Ich habe gegessen).'],
    pl: ['Do not translate articles – Polish has none.', 'Negation uses the genitive: Nie mam czasu (not "czas").', 'Questions can be asked just by intonation or with "czy": Czy mówisz po niemiecku?', 'Check every diacritic: ą ć ę ł ń ó ś ź ż.']
  }
};

/* ---------- storage ---------- */
const KEY = 'wortschatz_v1';
let DB; try { DB = JSON.parse(localStorage.getItem(KEY)) || { users: {}, current: null }; } catch (e) { DB = { users: {}, current: null }; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };
const defaults = () => ({ xp: 0, streak: 0, best: 0, lastDay: '', days: {}, words: {}, sent: {}, types: {}, created: Date.now(), emoji: '🙂',
  settings: { dir: 'dp', en: true, tts: false, scope: 'all', len: 10 } });
const U = () => DB.users[DB.current];
const day = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function addUser(name, emoji) {
  name = name.trim().slice(0, 20); if (!name) return false;
  if (!DB.users[name]) DB.users[name] = Object.assign(defaults(), { emoji: emoji || '🙂' });
  DB.current = name; save(); return true;
}

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plShow = w => w.pl[0];
const label = (w, lang) => lang === 'de' ? w.de : plShow(w);
const fold = (s, lang) => {
  s = s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:"“”„'’‚…–—-]+$/g, '').replace(/^[„"“]+/, '');
  if (lang === 'de') return s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  return s.replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '');
};
const norm = s => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:"“”„'’‚…–—-]+$/g, '').replace(/^[„"“]+/, '');
const stripArt = s => s.replace(/^(der|die|das|ein|eine|den|dem)\s+/, '');
function speak(text, lang) {
  try { if (!U().settings.tts) return; const u = new SpeechSynthesisUtterance(text); u.lang = lang === 'de' ? 'de-DE' : 'pl-PL'; u.rate = .9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}

/* ---------- progress / scoring ---------- */
const BOX_W = [6, 4, 3, 2, 1, .4];
function prog(kind, id, dir) { const o = kind === 'w' ? U().words : U().sent; return o[id + ':' + dir]; }
function weight(kind, id, dir) { const p = prog(kind, id, dir); if (!p) return 2.5; const age = Date.now() - p.t; return BOX_W[p.b] * (age < 60000 ? .1 : 1); }
function wordPool(u) {
  const sc = u.settings.scope;
  let ids;
  if (sc === 'weak') ids = W.filter(w => ['dp', 'pd'].some(d => { const p = u.words[w.id + ':' + d]; return p && p.w > 0 && p.b < 3; })).map(w => w.id);
  else if (sc === 'new') ids = W.filter(w => !u.words[w.id + ':dp'] && !u.words[w.id + ':pd']).map(w => w.id);
  else if (sc.startsWith('L:')) { const L = sc.slice(2).toLowerCase(); ids = W.filter(w => w.de[0].toLowerCase() === L || (L === 'a' && 'äÄ'.includes(w.de[0])) || (L === 'o' && 'öÖ'.includes(w.de[0])) || (L === 'u' && 'üÜ'.includes(w.de[0]))).map(w => w.id); }
  else ids = W.map(w => w.id);
  return ids.length >= 6 ? ids : W.map(w => w.id);
}
function weighted(ids, n, dir) {
  const out = [], pool = ids.slice();
  while (out.length < n && pool.length) {
    const ws = pool.map(id => weight('w', id, dir)); let r = Math.random() * ws.reduce((a, b) => a + b, 0), k = 0;
    for (; k < pool.length - 1; k++) { r -= ws[k]; if (r <= 0) break; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}
function record(kind, id, dir, ok, hinted, type) {
  const u = U(), o = kind === 'w' ? u.words : u.sent, k = id + ':' + dir;
  const p = o[k] || (o[k] = { b: 0, s: 0, c: 0, w: 0, t: 0 });
  p.s++; p.t = Date.now();
  if (ok) { p.c++; if (!hinted) p.b = Math.min(5, p.b + 1); } else { p.w++; p.b = Math.max(0, p.b - 2); }
  const t = day(), d = u.days[t] || (u.days[t] = { q: 0, c: 0, xp: 0 });
  d.q++; if (ok) d.c++;
  const gain = ok ? (hinted ? 1 : (type === 'sentence' || type === 'build' ? 3 : 2)) : 0;
  d.xp += gain; u.xp += gain;
  const ty = u.types[type] || (u.types[type] = { q: 0, c: 0 }); ty.q++; if (ok) ty.c++;
  if (u.lastDay !== t) { const y = day(new Date(Date.now() - 864e5)); u.streak = u.lastDay === y ? u.streak + 1 : 1; u.lastDay = t; u.best = Math.max(u.best, u.streak); }
  save(); return gain;
}

/* ---------- exercise generation ---------- */
function distractors(w, dir, n) {
  const to = LANG[dir].to, ans = label(w, to), L = ans.length, out = [], seen = new Set([ans.toLowerCase()]);
  const bad = new Set(dir === 'dp' ? w.pl.map(x => x.toLowerCase()) : [w.de.toLowerCase()]);
  const cap = w.de[0] === w.de[0].toUpperCase();
  for (let tries = 0; tries < 400 && out.length < n; tries++) {
    const c = W[rnd(W.length)], l = label(c, to), lk = l.toLowerCase();
    if (seen.has(lk) || bad.has(lk) || c.id === w.id) continue;
    if (dir === 'dp' && c.pl.some(f => bad.has(f.toLowerCase()))) continue;
    if (dir === 'pd' && plIndex.get(plShow(w).toLowerCase()).some(id => W[id].de.toLowerCase() === lk)) continue;
    if (tries < 250 && (Math.abs(l.length - L) > 3 || (to === 'de' && (c.de[0] === c.de[0].toUpperCase()) !== cap))) continue;
    seen.add(lk); out.push(l);
  }
  return out;
}
function acceptedFor(w, dir) {
  if (dir === 'dp') return w.pl.slice();
  const k = plShow(w).toLowerCase(), set = new Set([w.de]);
  (plIndex.get(k) || []).forEach(id => set.add(W[id].de));
  return [...set];
}
function checkWrite(w, dir, typed) {
  const to = LANG[dir].to, acc = acceptedFor(w, dir);
  const cands = [typed]; if (to === 'de' && stripArt(norm(typed)) !== norm(typed)) cands.push(stripArt(norm(typed)));
  if (!norm(typed)) return { ok: false };
  for (const c of cands) if (acc.some(a => norm(a) === norm(c))) return { ok: true };
  for (const c of cands) { const hit = acc.find(a => fold(a, to) === fold(c, to)); if (hit) return { ok: true, note: 'Correct – but mind the accents: ' + hit }; }
  return { ok: false };
}
function makeStep(type, dir) {
  const u = U(), d = dir === 'mix' ? pick(['dp', 'pd']) : dir;
  if (type === 'mix') type = pick(['match', 'choose', 'write', 'build', 'sentence', 'choose', 'write']);
  if (type === 'build' || type === 'sentence') {
    const ids = S.map(s => s.id), ws = ids.map(id => weight('s', id, d)); let r = Math.random() * ws.reduce((a, b) => a + b, 0), k = 0;
    for (; k < ids.length - 1; k++) { r -= ws[k]; if (r <= 0) break; }
    return { type, dir: d, s: S[k] };
  }
  if (type === 'match') {
    const ids = weighted(wordPool(u), 12, d), used = new Set(), ws = [];
    for (const id of ids) { const w = W[id], a = w.de.toLowerCase(), b = plShow(w).toLowerCase(); if (used.has(a) || used.has(b)) continue; used.add(a); used.add(b); ws.push(w); if (ws.length === 5) break; }
    return { type, dir: d, ws };
  }
  const w = W[weighted(wordPool(u), 1, d)[0]];
  if (type === 'choose') return { type, dir: d, w, opts: shuffle([label(w, LANG[d].to), ...distractors(w, d, 3)]) };
  return { type, dir: d, w };
}

/* ---------- state / routing ---------- */
let view = 'home', sess = null, flash = '';
const go = v => { view = v; render(); window.scrollTo(0, 0); };
function render() {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.nav === (view === 'session' || view === 'result' ? 'home' : view)));
  $('#nav').style.display = view === 'session' ? 'none' : 'flex';
  if (!U() && view !== 'profile') view = 'profile';
  const r = { home: vHome, stats: vStats, profile: vProfile, session: vSession, result: vResult }[view];
  $('#app').innerHTML = r();
  if (view === 'session') afterSession();
}

/* ---------- views ---------- */
function vHome() {
  const u = U(), s = u.settings, t = u.days[day()] || { q: 0, c: 0, xp: 0 };
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return `<div class="row sp"><h1>${esc(u.emoji)} Hallo, ${esc(DB.current)}!</h1></div>
  <div class="row wrap" style="margin-bottom:12px"><span class="pill">🔥 ${u.streak} day streak</span><span class="pill">⭐ ${u.xp} XP</span><span class="pill">📅 today ${t.c}/${t.q}</span></div>
  <div class="card"><div class="mute small" style="margin-bottom:6px">Direction</div>
    <div class="seg" id="dirseg">${[['dp', 'DE → PL'], ['pd', 'PL → DE'], ['mix', 'Both']].map(([k, l]) => `<button data-dir="${k}" class="${s.dir === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="grid2" style="margin-top:10px"><div><div class="mute small">Words</div><select data-set="scope">
      <option value="all"${s.scope === 'all' ? ' selected' : ''}>All ${W.length} words</option><option value="weak"${s.scope === 'weak' ? ' selected' : ''}>My weak words</option><option value="new"${s.scope === 'new' ? ' selected' : ''}>New words only</option>
      ${letters.map(l => `<option value="L:${l}"${s.scope === 'L:' + l ? ' selected' : ''}>Starting with ${l.toUpperCase()}</option>`).join('')}</select></div>
    <div><div class="mute small">Questions</div><select data-set="len">${[5, 10, 20].map(n => `<option${s.len === n ? ' selected' : ''}>${n}</option>`).join('')}</select></div></div></div>
  <h2>Choose an exercise</h2><div class="grid2">${Object.entries(TYPES).map(([k, v]) => `<button class="ex" data-start="${k}"><span class="ic">${v.ic}</span><b>${v.t}</b><small>${v.d}</small></button>`).join('')}</div>
  <p class="mute small" style="text-align:center;margin-top:16px">Vocabulary: Duolingo Polish→German course lists via duome.eu · ${W.length} words · ${S.length} sentences</p>`;
}

function vProfile() {
  const names = Object.keys(DB.users).sort((a, b) => DB.users[b].xp - DB.users[a].xp), u = U();
  return `<h1>👤 Profiles</h1>
  <div class="card"><div class="mute small">Everything is saved on this device. Use Export to move your progress to another phone.</div>
  ${names.length ? names.map((n, i) => `<div class="user"><div class="av">${DB.users[n].emoji}</div><div class="grow"><b>${i === 0 && names.length > 1 ? '🥇 ' : ''}${esc(n)}</b><div class="mute small">${DB.users[n].xp} XP · best streak ${DB.users[n].best}</div></div>
    ${n === DB.current ? '<span class="pill">active</span>' : `<button class="btn sm alt" data-switch="${esc(n)}">Switch</button>`}<button class="spk" data-del="${esc(n)}" title="Delete">🗑️</button></div>`).join('') : '<p>Create your first profile to start practising.</p>'}</div>
  <div class="card"><b>New profile</b><div class="row" style="margin-top:8px"><select id="emo" style="width:80px">${['🙂', '😎', '🦊', '🐼', '🦉', '🐻', '🚀', '🌻'].map(e => `<option>${e}</option>`).join('')}</select><input type="text" id="newname" maxlength="20" placeholder="Name" autocomplete="off"></div><button class="btn" data-act="add">Create & start</button></div>
  ${u ? `<div class="card"><b>Settings for ${esc(DB.current)}</b>
    <label class="row sp" style="margin-top:10px"><span>Show English hint</span><input type="checkbox" data-set="en" ${u.settings.en ? 'checked' : ''}></label>
    <label class="row sp" style="margin-top:10px"><span>Read words aloud (device voice)</span><input type="checkbox" data-set="tts" ${u.settings.tts ? 'checked' : ''}></label></div>
  <div class="card"><b>Backup</b><div class="grid2"><button class="btn alt" data-act="export">⬇️ Export</button><button class="btn alt" data-act="import">⬆️ Import</button></div><input type="file" id="file" accept="application/json" class="hide"></div>` : ''}
  ${flash ? `<div class="fb ok">${esc(flash)}</div>` : ''}`;
}

function vStats() {
  const u = U(), days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5), k = day(d); days.push({ k, l: d.getDate(), q: (u.days[k] || {}).q || 0, c: (u.days[k] || {}).c || 0 }); }
  const mx = Math.max(5, ...days.map(d => d.q));
  let q = 0, c = 0; Object.values(u.days).forEach(d => { q += d.q; c += d.c; });
  const ws = Object.entries(u.words), seen = new Set(ws.map(([k]) => k.split(':')[0]));
  const mastered = new Set(ws.filter(([, p]) => p.b >= 4).map(([k]) => k.split(':')[0]));
  const weak = ws.filter(([, p]) => p.w > 0).sort((a, b) => (b[1].w - b[1].c * .5) - (a[1].w - a[1].c * .5)).slice(0, 8);
  return `<h1>📊 Your progress</h1>
  <div class="card grid2" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><b>${u.xp}</b><span>XP</span></div><div class="stat"><b>${u.streak}</b><span>Streak</span></div><div class="stat"><b>${q ? Math.round(100 * c / q) : 0}%</b><span>Accuracy</span></div>
  <div class="stat"><b>${seen.size}</b><span>Words seen</span></div><div class="stat"><b>${mastered.size}</b><span>Mastered</span></div><div class="stat"><b>${q}</b><span>Answers</span></div></div>
  <div class="card"><b>Last 14 days</b><div class="bars" style="margin-top:10px">${days.map(d => `<div title="${d.k}: ${d.c}/${d.q}" style="height:${Math.max(3, 100 * d.q / mx)}%"></div>`).join('')}</div><div class="bars lbl">${days.map(d => `<span>${d.l}</span>`).join('')}</div></div>
  <div class="card"><b>By exercise</b>${Object.keys(TYPES).filter(k => k !== 'mix').map(k => { const t = u.types[k] || { q: 0, c: 0 }; return `<div class="row sp" style="margin-top:8px"><span>${TYPES[k].ic} ${TYPES[k].t}</span><span class="mute">${t.q ? Math.round(100 * t.c / t.q) + '% of ' + t.q : '–'}</span></div>`; }).join('')}</div>
  <div class="card"><b>Words to review</b>${weak.length ? weak.map(([k, p]) => { const [id, d] = k.split(':'), w = W[id]; return `<div class="row sp" style="margin-top:8px"><span>${esc(w.de)} <span class="mute">${d === 'dp' ? '→' : '←'} ${esc(plShow(w))}</span></span><span class="mute">✗${p.w} ✓${p.c}</span></div>`; }).join('') : '<p class="mute">Nothing yet – mistakes will show up here.</p>'}
  ${weak.length ? '<button class="btn alt" data-act="weak">Practise my weak words</button>' : ''}</div>`;
}

/* --- session --- */
function startSession(type) {
  const u = U(); sess = { type, n: u.settings.len, i: 0, ok: 0, xp: 0, step: null, answered: false, startedAt: Date.now() };
  sess.step = makeStep(type, u.settings.dir); view = 'session'; render();
}
function tipFor(st) { const to = LANG[st.dir].to, arr = TIPS[st.type][to]; return { lang: NAME[to], text: arr[(sess.i + rnd(arr.length)) % arr.length] }; }
function vSession() {
  const st = sess.step, u = U(), en = u.settings.en, to = LANG[st.dir].to, from = LANG[st.dir].from;
  const head = `<div class="top"><button class="x" data-act="quit">✕</button><div class="bar grow"><i style="width:${100 * sess.i / sess.n}%"></i></div><span class="pill">${sess.i + 1}/${sess.n}</span></div>`;
  if (!sess.tip || sess.tipFor !== sess.i) { sess.tip = tipFor(st); sess.tipFor = sess.i; }
  const tip = `<div class="tip">💡 <b>${sess.tip.lang} tip:</b> ${esc(sess.tip.text)}</div>`;
  const tag = `<div class="dirtag">${TYPES[st.type].t} · ${NAME[from]} → ${NAME[to]}</div>`;
  let body = '';
  if (st.type === 'match') {
    st.state = st.state || { left: st.ws.map(w => w.id), right: shuffle(st.ws.map(w => w.id)), sel: null, done: new Set(), errs: 0 };
    const S2 = st.state;
    body = `${tag}<p class="sub">Tap a word, then its translation</p><div class="match"><div>${S2.left.map(id => `<button class="cell ${S2.done.has(id) ? 'done' : ''} ${S2.sel === id ? 'sel' : ''}" data-ml="${id}" style="display:block;width:100%;margin-bottom:9px">${esc(label(W[id], from))}</button>`).join('')}</div>
    <div>${S2.right.map(id => `<button class="cell ${S2.done.has(id) ? 'done' : ''}" data-mr="${id}" style="display:block;width:100%;margin-bottom:9px">${esc(label(W[id], to))}</button>`).join('')}</div></div>`;
    return head + body + tip;
  }
  if (st.type === 'choose') {
    const w = st.w, ans = label(w, to);
    body = `${tag}<div class="prompt">${esc(label(w, from))} <button class="spk" data-say="${esc(label(w, from))}|${from}">🔊</button></div>${en && w.en ? `<p class="sub">${esc(w.en)}</p>` : '<p class="sub">&nbsp;</p>'}
    <div class="opts">${st.opts.map(o => `<button class="opt ${sess.answered ? (o === ans ? 'ok' : (st.chosen === o ? 'no' : '')) : ''}" data-opt="${esc(o)}" ${sess.answered ? 'disabled' : ''}>${esc(o)}</button>`).join('')}</div>${fbHtml(st)}`;
  } else if (st.type === 'write') {
    const w = st.w;
    body = `${tag}<div class="prompt">${esc(label(w, from))} <button class="spk" data-say="${esc(label(w, from))}|${from}">🔊</button></div>${en && w.en ? `<p class="sub">${esc(w.en)}</p>` : '<p class="sub">&nbsp;</p>'}
    <input type="text" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type in ${NAME[to]}…" ${sess.answered ? 'disabled' : ''} value="${esc(st.typed || '')}">${sess.answered ? '' : keysHtml(to)}
    ${sess.answered ? '' : `<div class="row" style="margin-top:6px"><button class="btn ghost sm" data-act="hint">💡 Hint (first letter)</button></div>`}${st.hint && !sess.answered ? `<p class="mute">Starts with <b>${esc(acceptedFor(w, st.dir)[0][0])}</b> · ${acceptedFor(w, st.dir)[0].length} letters</p>` : ''}${fbHtml(st)}`;
    return head + body + (sess.answered ? '' : '<button class="btn" data-act="submit">Check</button>') + footBtn() + tip;
  } else if (st.type === 'build') {
    const sn = st.s; st.tokens = st.tokens || buildTokens(sn, to); st.placed = st.placed || [];
    body = `${tag}<div class="prompt sent">${esc(sn[from])} <button class="spk" data-say="${esc(sn[from])}|${from}">🔊</button></div>${en ? `<p class="sub">${esc(sn.en)}</p>` : ''}
    <div class="answer">${st.placed.map(i => `<button class="tile in" data-un="${i}">${esc(st.tokens[i])}</button>`).join('')}</div>
    <div class="bank">${st.tokens.map((t, i) => `<button class="tile ${st.placed.includes(i) ? 'used' : ''}" data-tk="${i}">${esc(t)}</button>`).join('')}</div>${fbHtml(st)}`;
    return head + body + (sess.answered ? '' : `<button class="btn" data-act="submit" ${st.placed.length ? '' : 'disabled'}>Check</button>`) + footBtn() + tip;
  } else if (st.type === 'sentence') {
    const sn = st.s;
    body = `${tag}<div class="prompt sent">${esc(sn[from])} <button class="spk" data-say="${esc(sn[from])}|${from}">🔊</button></div>${en ? `<p class="sub">${esc(sn.en)}</p>` : ''}
    <input type="text" id="ans" autocomplete="off" autocapitalize="sentences" autocorrect="off" spellcheck="false" placeholder="Write the sentence in ${NAME[to]}…" ${sess.answered ? 'disabled' : ''} value="${esc(st.typed || '')}">${sess.answered ? '' : keysHtml(to)}${fbHtml(st)}`;
    return head + body + (sess.answered ? '' : '<button class="btn" data-act="submit">Check</button>') + footBtn() + tip;
  }
  return head + body + footBtn() + tip;
}
const keysHtml = to => `<div class="keys">${(to === 'de' ? 'äöüß' : 'ąćęłńóśźż').split('').map(k => `<button data-key="${k}">${k}</button>`).join('')}</div>`;
const footBtn = () => sess.answered ? `<button class="btn" data-act="next">${sess.i + 1 >= sess.n ? 'Finish' : 'Continue'}</button>` : '';
function buildTokens(sn, to) {
  const toks = sn[to].split(' '), extra = [];
  for (let t = 0; t < 30 && extra.length < 2; t++) { const o = S[rnd(S.length)][to].split(' '), w = o[rnd(o.length)]; if (!toks.includes(w) && !extra.includes(w)) extra.push(w); }
  return shuffle([...toks, ...extra]);
}
function fbHtml(st) {
  if (!sess.answered) return '';
  const f = st.fb; if (!f) return '';
  return `<div class="fb ${f.ok ? 'ok' : 'no'}"><b>${f.ok ? '✓ Correct!' : '✗ Not quite'}</b> ${f.msg || ''}</div>`;
}
function afterSession() {
  const inp = $('#ans'); if (inp && !sess.answered) { inp.focus({ preventScroll: true }); }
  const st = sess.step; if (st && st.type === 'write' && !sess.spokeFor) { /* no auto speak */ }
}

function vResult() {
  const acc = sess.total ? Math.round(100 * sess.ok / sess.total) : 0, u = U();
  return `<div class="big">${acc >= 80 ? '🏆' : acc >= 50 ? '👏' : '💪'}</div><h1 style="text-align:center">${acc >= 80 ? 'Excellent!' : acc >= 50 ? 'Good job!' : 'Keep going!'}</h1>
  <div class="card grid2" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><b>${sess.ok}/${sess.total}</b><span>Correct</span></div><div class="stat"><b>+${sess.xp}</b><span>XP</span></div><div class="stat"><b>🔥 ${u.streak}</b><span>Streak</span></div></div>
  <button class="btn" data-start="${sess.type}">Again</button><button class="btn alt" data-nav="home">Back to menu</button>`;
}

/* ---------- answering ---------- */
function finishStep(ok, hinted, ids) {
  const st = sess.step; let gain = 0;
  if (st.type === 'match') { /* recorded per pair */ }
  else if (st.w) gain = record('w', st.w.id, st.dir, ok, hinted, st.type);
  else if (st.s) gain = record('s', st.s.id, st.dir, ok, hinted, st.type);
  sess.xp += gain; sess.answered = true; sess.total = (sess.total || 0) + 1; if (ok) sess.ok++;
}
function submitText() {
  const st = sess.step, to = LANG[st.dir].to, typed = ($('#ans') || {}).value || '';
  if (!typed.trim()) return;
  st.typed = typed;
  if (st.type === 'write') {
    const r = checkWrite(st.w, st.dir, typed), acc = acceptedFor(st.w, st.dir);
    const more = acc.length > 1 ? ` <span class="mute">(also: ${esc(acc.slice(1, 5).join(', '))})</span>` : '';
    st.fb = r.ok ? { ok: true, msg: esc(r.note || '') + (r.note ? '' : esc(acc[0])) + more } : { ok: false, msg: `Answer: <b>${esc(acc[0])}</b>${more}<br><span class="mute">You wrote: ${esc(typed)}</span>` };
    finishStep(r.ok, st.hint);
  } else {
    const target = st.s[to], a = norm(typed), b = norm(target), ok = a === b || fold(typed, to) === fold(target, to);
    const note = ok && a !== b ? ' Mind the accents: ' + esc(target) : '';
    st.fb = ok ? { ok: true, msg: (note || esc(target)) } : { ok: false, msg: `Answer: <b>${esc(target)}</b><br>${diff(typed, target, to)}` };
    finishStep(ok, false);
  }
  speak(st.type === 'write' ? acceptedFor(st.w, st.dir)[0] : st.s[to], to);
  render();
}
function diff(typed, target, lang) {
  const a = norm(typed).split(' '), b = target.replace(/[.?!]+$/, '').split(' ');
  return `<span class="mute">You wrote:</span> ` + a.map(x => b.some(y => fold(y, lang) === fold(x, lang)) ? esc(x) : `<s>${esc(x)}</s>`).join(' ');
}
function submitBuild() {
  const st = sess.step, to = LANG[st.dir].to, built = st.placed.map(i => st.tokens[i]).join(' '), target = st.s[to];
  const ok = norm(built) === norm(target);
  st.fb = ok ? { ok: true, msg: esc(target) } : { ok: false, msg: `Answer: <b>${esc(target)}</b><br><span class="mute">You built: ${esc(built)}</span>` };
  finishStep(ok, false); speak(target, to); render();
}
function chooseOpt(o) {
  const st = sess.step, to = LANG[st.dir].to, w = st.w, ans = label(w, to);
  const ok = o === ans || (to === 'pl' ? w.pl.some(f => f.toLowerCase() === o.toLowerCase()) : acceptedFor(w, st.dir).some(a => a === o));
  st.chosen = o; if (ok) st.chosen = ans;
  const acc = acceptedFor(w, st.dir), more = acc.length > 1 ? ` <span class="mute">(also: ${esc(acc.filter(a => a !== ans).slice(0, 4).join(', '))})</span>` : '';
  st.fb = { ok, msg: ok ? esc(ans) + more : `Answer: <b>${esc(ans)}</b>${more}` };
  finishStep(ok, false); speak(ans, to); render();
}
function matchTap(side, id) {
  const st = sess.step, m = st.state, from = LANG[st.dir].from;
  if (side === 'l') { m.sel = id; speak(label(W[id], from), from); render(); return; }
  if (m.sel == null) return;
  const left = m.sel;
  if (left === id) {
    m.done.add(id); m.sel = null; record('w', id, st.dir, true, false, 'match');
    sess.xp += 2;
    if (m.done.size === st.ws.length) { sess.answered = true; sess.total = (sess.total || 0) + 1; if (m.errs === 0) sess.ok++; st.fb = null; sess.i++; nextStep(true); return; }
    render();
  } else {
    m.errs++; record('w', left, st.dir, false, false, 'match'); m.sel = null; render();
    const el = document.querySelector(`[data-mr="${id}"]`); if (el) { el.classList.add('no'); setTimeout(() => el.classList.remove('no'), 400); }
  }
}
function nextStep(fromMatch) {
  if (!fromMatch) sess.i++;
  if (sess.i >= sess.n) { view = 'result'; render(); return; }
  sess.step = makeStep(sess.type, U().settings.dir); sess.answered = false; render();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-nav]'); if (!t) return;
  const d = t.dataset;
  if (d.nav) { sess = d.nav === 'home' ? sess : sess; go(d.nav); return; }
  if (d.start) { startSession(d.start); return; }
  if (d.dir) { U().settings.dir = d.dir; save(); render(); return; }
  if (d.opt !== undefined) { chooseOpt(d.opt); return; }
  if (d.ml) { matchTap('l', +d.ml); return; }
  if (d.mr) { matchTap('r', +d.mr); return; }
  if (d.tk !== undefined) { const st = sess.step; if (!sess.answered && !st.placed.includes(+d.tk)) { st.placed.push(+d.tk); render(); } return; }
  if (d.un !== undefined) { const st = sess.step; if (!sess.answered) { st.placed = st.placed.filter(i => i !== +d.un); render(); } return; }
  if (d.key) { const i = $('#ans'); if (i) { const s = i.selectionStart ?? i.value.length; i.value = i.value.slice(0, s) + d.key + i.value.slice(s); i.focus(); i.setSelectionRange(s + 1, s + 1); } return; }
  if (d.say) { const [txt, lg] = d.say.split('|'); const old = U().settings.tts; U().settings.tts = true; speak(txt, lg); U().settings.tts = old; return; }
  if (d.switch) { DB.current = d.switch; save(); flash = ''; go('home'); return; }
  if (d.del) { if (confirm('Delete profile "' + d.del + '" and all its progress?')) { delete DB.users[d.del]; DB.current = Object.keys(DB.users)[0] || null; save(); render(); } return; }
  switch (d.act) {
    case 'add': { const n = $('#newname').value; if (addUser(n, $('#emo').value)) { flash = ''; go('home'); } break; }
    case 'quit': if (confirm('Quit this session? Answered questions are already saved.')) go('home'); break;
    case 'hint': sess.step.hint = true; sess.step.typed = ($('#ans') || {}).value; render(); break;
    case 'submit': sess.step.type === 'build' ? submitBuild() : submitText(); break;
    case 'next': nextStep(); break;
    case 'weak': U().settings.scope = 'weak'; save(); startSession('mix'); break;
    case 'export': { const b = new Blob([JSON.stringify({ app: 'wortschatz', v: 1, name: DB.current, data: U() })], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'wortschatz-' + DB.current + '.json'; a.click(); break; }
    case 'import': $('#file').click(); break;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'file') {
    const f = t.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const j = JSON.parse(r.result); if (j.app !== 'wortschatz') throw 0; DB.users[j.name] = Object.assign(defaults(), j.data); DB.current = j.name; save(); flash = 'Imported profile “' + j.name + '”.'; render(); } catch (err) { flash = 'That file is not a valid backup.'; render(); } };
    r.readAsText(f); return;
  }
  const k = t.dataset.set; if (!k) return;
  const v = t.type === 'checkbox' ? t.checked : (k === 'len' ? +t.value : t.value);
  U().settings[k] = v; save();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && view === 'session') { e.preventDefault(); if (sess.answered) nextStep(); else if ($('#ans')) submitText(); }
  if (e.key === 'Enter' && view === 'profile' && e.target.id === 'newname') { $('[data-act=add]').click(); }
});
if ('serviceWorker' in navigator && /^https:|localhost/.test(location.protocol + location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
view = U() ? 'home' : 'profile';
render();
})();
