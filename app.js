// =====================================================================
// app.js – all logik för appen.
// Innehållet (ord och meningar) finns i data/. Framstegen sparas i webbläsaren.
// =====================================================================

// ---------- 1. Inställningar ----------
const REVIEW_PER_SESSION = 3;     // Gamla ord att repetera per pass
const NEW_PER_SESSION = 5;        // Nya ord per pass
const SENTENCES_PER_SESSION = 5;  // Meningar per pass
const STORAGE_KEY = "serbiska-progress-v1";
const DAY = 24 * 60 * 60 * 1000;

let WORDS = [];       // Fylls från data/words.json
let SENTENCES = [];   // Fylls från data/sentences.json
let progress = loadProgress();

let session = null;   // Dagens pass
let queue = [];       // Alla steg i passet, i ordning
let pos = 0;          // Vilket steg vi är på

const main = document.getElementById("main");

// ---------- 2. Spara och ladda framsteg ----------
// progress.words[id] = { reps, interval, ease, due, lastGrade }
// progress.sessions  = [{ date, lesson, reviewed, newWords }]
function loadProgress() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) { showSaveWarning(); }
  return { words: {}, sessions: [] };
}

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
  catch (e) { showSaveWarning(); }
}

// Visar en röd rad överst, en gång, om webbläsaren inte kan spara eller läsa framsteg
function showSaveWarning() {
  if (document.getElementById("saveWarning")) return;
  document.body.prepend(h("div", { id: "saveWarning", class: "warning" },
    "Framstegen kunde inte sparas. Är privat surfning på?"));
}

// ---------- 3. Hjälpfunktioner ----------
// Skapar ett HTML-element: h("button", { class: "primary", onclick: fn }, "Text")
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "class") el.className = value;
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) el.append(child);
  }
  return el;
}

// Blandar en lista slumpmässigt (utan att ändra originalet)
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Dagens datum som "2026-10-31"
function dateStr(d) { return d.toLocaleDateString("sv-SE"); }

// ---------- 4. Latin → kyrilliska ----------
const CYR = { a:"а", b:"б", c:"ц", č:"ч", ć:"ћ", d:"д", đ:"ђ", e:"е", f:"ф", g:"г", h:"х",
  i:"и", j:"ј", k:"к", l:"л", m:"м", n:"н", o:"о", p:"п", r:"р", s:"с", š:"ш", t:"т",
  u:"у", v:"в", z:"з", ž:"ж" };
const CYR_DIGRAPHS = { lj:"љ", nj:"њ", dž:"џ" };  // Två latinska bokstäver = en kyrillisk

function toCyrillic(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    const isUpper = text[i] !== text[i].toLowerCase();
    if (CYR_DIGRAPHS[pair.toLowerCase()]) {
      const c = CYR_DIGRAPHS[pair.toLowerCase()];
      out += isUpper ? c.toUpperCase() : c;
      i++; // hoppa över andra bokstaven
      continue;
    }
    const c = CYR[text[i].toLowerCase()];
    out += c ? (isUpper ? c.toUpperCase() : c) : text[i];
  }
  return out;
}

// Visar serbisk text med kyrilliska under
function srBlock(text, extraClass = "") {
  return [h("div", { class: "sr " + extraClass }, text), h("div", { class: "cyr" }, toCyrillic(text))];
}

// ---------- 5. Repetitionsalgoritmen (förenklad SM-2) ----------
// quality: 1 = Kunde inte, 3 = Svårt, 4 = Bra, 5 = Lätt
function newProgress() {
  return { reps: 0, interval: 0, ease: 2.5, due: Date.now(), lastGrade: null };
}

function gradeWord(id, quality) {
  const p = progress.words[id] || newProgress();
  if (quality < 3) {
    p.reps = 0;
    p.interval = 0;
    p.due = Date.now();               // Kommer först i kön nästa pass
  } else {
    if (p.reps === 0) p.interval = 1;
    else if (p.reps === 1) p.interval = 6;
    else p.interval = Math.round(p.interval * p.ease);
    p.reps++;
    p.due = Date.now() + p.interval * DAY;
  }
  p.ease = Math.max(1.3, p.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  p.lastGrade = quality;
  progress.words[id] = p;
  saveProgress();
}

function gradeButtons(onGrade, includeFail) {
  const defs = [[1, "Kunde inte", "again"], [3, "Svårt", "hard"], [4, "Bra", "good"], [5, "Lätt", "easy"]]
    .filter(d => includeFail || d[0] !== 1);
  return h("div", { class: "buttons" },
    defs.map(([q, label, cls]) => h("button", { class: cls, onclick: () => onGrade(q) }, label)));
}

// ---------- 6. Bygg dagens pass ----------
function buildSession() {
  // 3 ord från tidigare pass: de som är mest "försenade" först
  const review = WORDS.filter(w => progress.words[w.id])
    .sort((a, b) => progress.words[a.id].due - progress.words[b.id].due)
    .slice(0, REVIEW_PER_SESSION);

  // Nya ord: nästa lektion som har ord du inte sett
  const unseen = WORDS.filter(w => !progress.words[w.id]);
  if (unseen.length === 0) {
    return { review, newWords: [], sentences: shuffle(SENTENCES).slice(0, SENTENCES_PER_SESSION), lesson: null };
  }
  const lesson = Math.min(...unseen.map(w => w.lesson));
  const newWords = unseen.filter(w => w.lesson === lesson).slice(0, NEW_PER_SESSION);
  const sentences = SENTENCES.filter(s => s.lesson === lesson).slice(0, SENTENCES_PER_SESSION);
  return { review, newWords, sentences, lesson, theme: newWords[0].theme };
}

// Delar en mening i ord och fasta skiljetecken:
// "Zdravo, kako si?" → zdravo + "," / kako / si + "?"
// Första ordet får liten bokstav, så att brickan inte avslöjar var meningen börjar.
function sentenceParts(sentence) {
  const parts = sentence.sr.split(" ").map(token => {
    const [, before, word, after] = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    return { before, word, after };
  });
  parts[0].word = parts[0].word[0].toLowerCase() + parts[0].word.slice(1);
  return parts;
}

function startSession() {
  session = buildSession();
  queue = [];
  session.review.forEach(w => queue.push({ type: "review", word: w }));          // Steg 1: repetera
  session.newWords.forEach(w => queue.push({ type: "intro", word: w }));         // Steg 2: nya ord
  shuffle(session.newWords).forEach(w => queue.push({ type: "quiz", word: w }));  //         ...och testa dem
  session.sentences.forEach(s => queue.push({ type: "read", sentence: s }));     // Steg 3: läs meningar
  session.sentences.filter(s => sentenceParts(s).length >= 2)
    .forEach(s => queue.push({ type: "build", sentence: s }));                   //         ...och bygg dem
  pos = 0;
  showTask();
}

function next() { pos++; showTask(); }

// Lägger tillbaka ett steg sist i kön (en gång) om du inte kunde det
function retryLater(task) {
  if (!task.retry) queue.push({ ...task, retry: true });
}

function showTask() {
  if (pos >= queue.length) return showDone();
  const task = queue[pos];
  if (task.type === "review") showReview(task);
  if (task.type === "intro") showIntro(task);
  if (task.type === "quiz") showQuiz(task);
  if (task.type === "read") showRead(task);
  if (task.type === "build") showBuild(task);
}

// Ram för varje steg: förloppsindikator + rubrik + innehåll
function screen(label, ...content) {
  setNav(null);
  main.replaceChildren(
    h("div", { class: "progress" }, h("div", { class: "bar", style: `width:${(pos / queue.length) * 100}%` })),
    h("p", { class: "step-label center" }, label),
    ...content
  );
}

// ---------- 7. Stegen i passet ----------
function showReview(task) {
  const w = task.word;
  const answer = h("div", { class: "hidden" }, h("div", { class: "sv" }, w.sv), w.note ? h("div", { class: "note" }, w.note) : null);
  const grades = gradeButtons(q => {
    gradeWord(w.id, q);
    if (q === 1) retryLater(task);
    next();
  }, true);
  grades.classList.add("hidden");
  const showBtn = h("button", { class: "primary", onclick: () => {
    answer.classList.remove("hidden");
    grades.classList.remove("hidden");
    showBtn.classList.add("hidden");
  } }, "Visa svar");
  screen("Repetition", h("div", { class: "card" }, srBlock(w.sr), answer), h("div", { class: "buttons" }, showBtn), grades);
}

function showIntro(task) {
  const w = task.word;
  if (!progress.words[w.id]) { progress.words[w.id] = newProgress(); saveProgress(); }  // Markera som sett
  screen("Nytt ord",
    h("div", { class: "card" }, srBlock(w.sr), h("div", { class: "sv" }, w.sv), w.note ? h("div", { class: "note" }, "💡 " + w.note) : null),
    h("div", { class: "buttons" }, h("button", { class: "primary", onclick: next }, "Nästa")));
}

function showQuiz(task) {
  const w = task.word;
  const wrongOptions = shuffle(WORDS.filter(x => x.id !== w.id && x.sv !== w.sv)).slice(0, 3);
  const options = shuffle([w, ...wrongOptions]);
  const after = h("div");
  const buttons = options.map(o => h("button", { class: "option", onclick: () => choose(o) }, o.sv));

  function choose(o) {
    buttons.forEach(b => b.disabled = true);
    buttons[options.indexOf(w)].classList.add("correct");
    if (o.id === w.id) {
      after.replaceChildren(h("p", { class: "feedback ok" }, "Rätt! Hur lätt var det?"),
        gradeButtons(q => { gradeWord(w.id, q); next(); }, false));
    } else {
      buttons[options.indexOf(o)].classList.add("wrong");
      gradeWord(w.id, 1);
      retryLater(task);
      after.replaceChildren(h("p", { class: "feedback bad" }, "Inte riktigt – ordet kommer tillbaka strax."),
        h("div", { class: "buttons" }, h("button", { class: "primary", onclick: next }, "Fortsätt")));
    }
  }
  screen("Vad betyder ordet?", h("div", { class: "card" }, srBlock(w.sr)), h("div", { class: "options" }, buttons), after);
}

function showRead(task) {
  const s = task.sentence;
  const answer = h("div", { class: "hidden" }, h("div", { class: "sv" }, s.sv), s.note ? h("div", { class: "note" }, "💡 " + s.note) : null);
  const nextBtn = h("button", { class: "primary hidden", onclick: next }, "Nästa");
  const showBtn = h("button", { class: "primary", onclick: () => {
    answer.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
    showBtn.classList.add("hidden");
  } }, "Visa översättning");
  screen("Läs och förstå", h("div", { class: "card" }, srBlock(s.sr, "sentence"), answer), h("div", { class: "buttons" }, showBtn, nextBtn));
}

function showBuild(task) {
  const s = task.sentence;
  const parts = sentenceParts(s);
  const pool = shuffle(parts.map((part, i) => ({ word: part.word, i })));  // i skiljer på dubbletter
  const slots = parts.map(() => null);  // Vilken bricka som ligger på varje tom rad
  const answerRow = h("div", { class: "tiles answer-row" });
  const poolRow = h("div", { class: "tiles" });
  const result = h("div");
  const checkBtn = h("button", { class: "primary", onclick: check }, "Kontrollera");

  function draw() {
    answerRow.replaceChildren(...parts.map((part, i) => h("span", { class: "slot-group" },
      part.before,
      slots[i]
        ? h("button", { class: "tile", onclick: () => { slots[i] = null; draw(); } }, slots[i].word)
        : h("span", { class: "slot" }),
      part.after)));
    poolRow.replaceChildren(...pool.filter(t => !slots.includes(t)).map(t =>
      h("button", { class: "tile", onclick: () => { slots[slots.indexOf(null)] = t; draw(); } }, t.word)));
    checkBtn.disabled = slots.includes(null);
  }

  function check() {
    // Serbiskans ordföljd är fri, så en mening kan ha flera rätta svar (fältet alt)
    const wordsOf = sr => sentenceParts({ sr }).map(p => p.word.toLowerCase()).join(" ");
    const ok = [s.sr, ...(s.alt || [])].map(wordsOf).includes(slots.map(t => t.word.toLowerCase()).join(" "));
    answerRow.querySelectorAll("button").forEach(b => b.disabled = true);
    checkBtn.classList.add("hidden");
    // h() hoppar över null, därför packas allt i en div
    result.replaceChildren(h("div", {},
      h("p", { class: ok ? "feedback ok" : "feedback bad" }, ok ? "Rätt! 🎉" : "Nästan! Rätt ordning:"),
      ok ? null : h("div", { class: "card" }, srBlock(s.sr, "sentence")),
      h("div", { class: "buttons" }, h("button", { class: "primary", onclick: next }, "Nästa"))));
  }

  draw();
  screen("Bygg meningen", h("div", { class: "card" }, h("div", { class: "sv" }, s.sv)),
    answerRow, poolRow, h("div", { class: "buttons" }, checkBtn), result);
}

function showDone() {
  progress.sessions.push({ date: dateStr(new Date()), lesson: session.lesson,
    reviewed: session.review.length, newWords: session.newWords.length });
  saveProgress();
  main.replaceChildren(
    h("div", { class: "card" },
      h("div", { class: "big" }, "Bra jobbat! 🎉"),
      h("p", {}, `Du repeterade ${session.review.length} ord, lärde dig ${session.newWords.length} nya och övade på ${session.sentences.length} meningar.`),
      h("p", { class: "muted" }, streakText())),
    h("div", { class: "buttons" },
      h("button", { class: "primary", onclick: showHome }, "Till startsidan"),
      h("button", { onclick: showDashboard }, "Se framsteg")));
}

// ---------- 8. Startsidan ----------
function streak() {
  const days = new Set(progress.sessions.map(s => s.date));
  const d = new Date();
  if (!days.has(dateStr(d))) d.setDate(d.getDate() - 1);  // Svit räknas även om du inte kört idag än
  let count = 0;
  while (days.has(dateStr(d))) { count++; d.setDate(d.getDate() - 1); }
  return count;
}

// "🔥 1 dag i rad" / "🔥 3 dagar i rad"
function streakText() {
  const n = streak();
  return `🔥 ${n} ${n === 1 ? "dag" : "dagar"} i rad`;
}

function showHome() {
  setNav("home");
  const s = buildSession();
  const doneToday = progress.sessions.some(x => x.date === dateStr(new Date()));
  const parts = [];
  if (s.review.length) parts.push(`${s.review.length} ${s.review.length === 1 ? "repetition" : "repetitioner"}`);
  if (s.newWords.length) parts.push(`${s.newWords.length} nya ord`);
  parts.push(`${s.sentences.length} meningar`);
  main.replaceChildren(
    h("div", { class: "card" },
      h("p", { class: "step-label" }, s.lesson ? `Lektion ${s.lesson}: ${s.theme}` : "Alla lektioner klara!"),
      h("div", { class: "big" }, doneToday ? "Dagens pass är klart ✅" : "Dagens pass"),
      h("p", { class: "muted" }, parts.join(" · ") + " · ca 5–10 min"),
      s.lesson ? null : h("p", { class: "note" }, "Be Claude lägga till fler lektioner. Tills dess repeterar du.")),
    h("div", { class: "buttons" },
      h("button", { class: "primary", onclick: startSession }, doneToday ? "Kör ett pass till" : "Starta")),
    h("p", { class: "center muted" }, streakText()));
}

// ---------- 9. Dashboard ----------
let chartDays = 7;  // Vald period i grafen: 7, 30 eller 91 dagar

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Summerar alla pass mellan två dagar (räknat i dagar bakåt från idag)
function sumSessions(fromAgo, toAgo) {
  const from = dateStr(daysAgo(fromAgo)), to = dateStr(daysAgo(toAgo));
  const list = progress.sessions.filter(s => s.date >= from && s.date <= to);
  return {
    sessions: list.length,
    newWords: list.reduce((sum, s) => sum + s.newWords, 0),
    reviewed: list.reduce((sum, s) => sum + s.reviewed, 0),
    activeDays: new Set(list.map(s => s.date)).size
  };
}

// En stapel per dag, eller per vecka när perioden är längre än 30 dagar
function chartBuckets(days) {
  const step = days > 30 ? 7 : 1;
  const buckets = [];
  for (let ago = days - step; ago >= 0; ago -= step) {
    const first = daysAgo(ago + step - 1);
    const label = days === 7
      ? first.toLocaleDateString("sv-SE", { weekday: "short" })
      : first.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
    const title = first.toLocaleDateString("sv-SE", { weekday: "short", day: "numeric", month: "short" });
    buckets.push({ ...sumSessions(ago + step - 1, ago), label, title: step > 1 ? `Veckan från ${title}` : title });
  }
  return buckets;
}

// Avrundar uppåt till ett jämnt tal, så att mittlinjen i grafen blir ett heltal
function niceMax(value) {
  const scale = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return [2, 4, 6, 8, 10].map(n => n * scale).find(n => n >= value) || scale * 2;
}

// Liten etikett som visar förändringen mot föregående period
function deltaPill(now, before) {
  if (!before) return null;
  const change = Math.round((now - before) / before * 100);
  return h("span", { class: "delta " + (change < 0 ? "down" : "up") }, `${change < 0 ? "↓" : "↑"} ${Math.abs(change)} %`);
}

function metric(label, now, before) {
  return h("div", { class: "metric" },
    h("div", { class: "metric-label" }, label),
    h("div", { class: "metric-value" }, String(now)),
    deltaPill(now, before));
}

function chartColumn(bucket, tip) {
  const total = bucket.newWords + bucket.reviewed;
  const text = `${bucket.title}: ${bucket.newWords} nya ord, ${bucket.reviewed} repetitioner`;
  const show = e => {
    const plot = e.currentTarget.parentElement;
    const center = e.currentTarget.offsetLeft + e.currentTarget.offsetWidth / 2;
    tip.textContent = text;
    tip.style.left = `${Math.min(80, Math.max(20, center / plot.offsetWidth * 100))}%`;
    tip.classList.remove("hidden");
  };
  const hide = () => tip.classList.add("hidden");
  return h("button", { class: "chart-col", "aria-label": text,
    onmouseenter: show, onfocus: show, onclick: show, onmouseleave: hide, onblur: hide },
    bucket.newWords ? h("span", { class: "chart-seg new", style: `flex-grow:${bucket.newWords}` }) : null,
    bucket.reviewed ? h("span", { class: "chart-seg review", style: `flex-grow:${bucket.reviewed}` }) : null,
    h("span", { class: "chart-space", style: `flex-grow:${total ? 0 : 1}` }));
}

function progressChart(buckets) {
  const max = niceMax(Math.max(...buckets.map(b => b.newWords + b.reviewed), 1));
  const tip = h("div", { class: "chart-tip hidden" });
  const every = Math.ceil(buckets.length / 7);  // Visar bara var n:te datum så att de får plats
  return h("div", { class: "chart" },
    h("div", { class: "chart-area" },
      h("div", { class: "chart-axis" }, h("span", {}, String(max)), h("span", {}, String(max / 2)), h("span", {}, "0")),
      h("div", { class: "chart-plot" },
        h("div", { class: "chart-line", style: "top:0" }),
        h("div", { class: "chart-line", style: "top:50%" }),
        h("div", { class: "chart-line", style: "top:100%" }),
        tip,
        buckets.map(b => h("div", { class: "chart-slot" },
          h("div", { class: "chart-bar", style: `height:${(b.newWords + b.reviewed) / max * 100}%` }, chartColumn(b, tip)))))),
    h("div", { class: "chart-labels" }, buckets.map((b, i) =>
      h("span", {}, (buckets.length - 1 - i) % every === 0 ? b.label : ""))),
    h("div", { class: "chart-legend" },
      h("span", {}, h("i", { class: "swatch new" }), "Nya ord"),
      h("span", {}, h("i", { class: "swatch review" }), "Repetitioner")));
}

function progressSection() {
  const now = sumSessions(chartDays - 1, 0);
  const before = sumSessions(chartDays * 2 - 1, chartDays);
  const buckets = chartBuckets(chartDays);
  const ranges = [[7, "7 dagar"], [30, "30 dagar"], [91, "3 månader"]];
  return h("div", {},
    h("div", { class: "section-head" },
      h("p", { class: "step-label" }, "Din utveckling"),
      h("div", { class: "ranges" }, ranges.map(([days, label]) =>
        h("button", { class: "range-btn" + (days === chartDays ? " active" : ""),
          onclick: () => { chartDays = days; showDashboard(); } }, label)))),
    h("div", { class: "card chart-card" },
      h("div", { class: "metrics" },
        metric("Pass", now.sessions, before.sessions),
        metric("Nya ord", now.newWords, before.newWords),
        metric("Repetitioner", now.reviewed, before.reviewed),
        metric("Aktiva dagar", now.activeDays, before.activeDays)),
      now.sessions ? progressChart(buckets) : h("p", { class: "muted" }, "Inga pass under den här perioden.")),
    now.sessions ? h("details", {},
      h("summary", {}, "Visa som tabell"),
      buckets.filter(b => b.sessions).map(b => h("div", { class: "word-row" },
        h("span", {}, b.title), h("span", { class: "muted" }, `${b.newWords} nya, ${b.reviewed} rep.`)))) : null);
}

function showDashboard() {
  setNav("dash");
  const seen = WORDS.filter(w => progress.words[w.id]);
  const byGrade = g => seen.filter(w => progress.words[w.id].lastGrade === g);
  const groups = [["Lätt", "easy", byGrade(5)], ["Bra", "good", byGrade(4)], ["Svårt", "hard", byGrade(3)]];
  const lessons = [...new Set(WORDS.map(w => w.lesson))];
  const lessonsDone = lessons.filter(l => WORDS.filter(w => w.lesson === l).every(w => progress.words[w.id])).length;

  const fileInput = h("input", { type: "file", accept: ".json", class: "hidden",
    onchange: e => { if (e.target.files[0]) importProgress(e.target.files[0]); } });

  // Allt packas i en div så att listor och null hanteras av h()
  main.replaceChildren(h("div", {},
    progressSection(),
    h("p", { class: "step-label", style: "margin-top:24px" }, "Ord du kan"),
    h("div", { class: "stats" }, groups.map(([label, cls, list]) =>
      h("div", { class: "stat " + cls }, h("div", { class: "num" }, String(list.length)), h("div", { class: "muted" }, label)))),
    h("div", { class: "card summary" },
      h("div", {}, `📚 Ord du har sett: ${seen.length} av ${WORDS.length}`),
      h("div", {}, `✅ Lektioner klara: ${lessonsDone} av ${lessons.length}`),
      h("div", {}, `🗓️ Pass totalt: ${progress.sessions.length}`),
      h("div", {}, "Svit: " + streakText())),
    groups.map(([label, cls, list]) => list.length ? h("details", {},
      h("summary", {}, `${label} (${list.length})`),
      list.map(w => h("div", { class: "word-row" }, h("span", {}, w.sr), h("span", { class: "muted" }, w.sv)))) : null),
    h("p", { class: "step-label", style: "margin-top:24px" }, "Säkerhetskopia"),
    h("p", { class: "muted" }, "Framstegen sparas bara här. På iPhone är appen på hemskärmen och Safari skilda platser, så använd alltid samma. Exportera då och då som backup."),
    h("div", { class: "buttons" },
      h("button", { onclick: exportProgress }, "Exportera"),
      h("button", { onclick: () => fileInput.click() }, "Importera")),
    fileInput,
    h("p", { class: "muted credits" }, "Källor: meningar från ",
      h("a", { href: "https://tatoeba.org/" }, "Tatoeba"), " (CC BY 2.0 FR), vissa anpassade till ijekaviska. Ordkontroll och frekvens från ",
      h("a", { href: "https://en.wiktionary.org/" }, "Wiktionary"), " (CC BY-SA 4.0).")));
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
  const link = h("a", { href: URL.createObjectURL(blob), download: `serbiska-framsteg-${dateStr(new Date())}.json` });
  document.body.append(link);
  link.click();
  link.remove();
}

function importProgress(file) {
  file.text().then(text => {
    const data = JSON.parse(text);
    if (!data.words || !data.sessions) throw new Error("fel format");
    if (confirm("Ersätta dina nuvarande framsteg med innehållet i filen?")) {
      progress = data;
      saveProgress();
      showDashboard();
    }
  }).catch(() => alert("Filen kunde inte läsas."));
}

// ---------- 10. Navigering och start ----------
function setNav(active) {
  document.getElementById("navHome").classList.toggle("active", active === "home");
  document.getElementById("navDash").classList.toggle("active", active === "dash");
}
document.getElementById("navHome").addEventListener("click", showHome);
document.getElementById("navDash").addEventListener("click", showDashboard);

// Läs in ord och meningar, visa sedan startsidan
Promise.all([
  fetch("data/words.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/sentences.json", { cache: "no-cache" }).then(r => r.json())
]).then(([words, sentences]) => {
  WORDS = words;
  SENTENCES = sentences;
  showHome();
}).catch(() => {
  main.replaceChildren(h("div", { class: "card" },
    h("p", {}, "Kunde inte läsa ordlistan."),
    h("p", { class: "note" }, "Öppnade du index.html direkt från datorn? Appen behöver köras via en lokal server eller GitHub Pages. Be Claude Code: \"Starta en lokal server för appen\".")));
});
