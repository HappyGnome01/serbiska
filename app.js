// =====================================================================
// app.js – all logik för appen.
// Innehållet (ord och meningar) finns i data/. Framstegen sparas i webbläsaren.
// =====================================================================

// ---------- 1. Inställningar ----------
const MIN_REVIEWS = 3;            // Minsta antal repetitioner per pass
const MAX_REVIEWS = 15;           // Högsta antal repetitioner per pass
const WORDS_PER_REVIEW = 4;       // En extra repetition per så här många ord att befästa
const NEW_PER_SESSION = 5;        // Nya ord per pass
const SENTENCES_PER_SESSION = 5;  // Meningar per pass
const STORAGE_KEY = "serbiska-progress-v1";
const DAY = 24 * 60 * 60 * 1000;

let WORDS = [];       // Fylls från data/words.json
let SENTENCES = [];   // Fylls från data/sentences.json
let GRAMMAR = [];     // Fylls från data/grammar.json
let progress = loadProgress();

let session = null;   // Dagens pass
let queue = [];       // Alla steg i passet, i ordning
let pos = 0;          // Vilket steg vi är på

const main = document.getElementById("main");

// ---------- 2. Spara och ladda framsteg ----------
// progress.words[id] = { reps, interval, ease, due, lastGrade, placed? }
// progress.sessions  = [{ date, lesson, reviewed, newWords }]
// progress.placement = gammalt resultat från nivåtestet, som är borttaget. Används inte längre.
// progress.currentLesson = nästa lektion (saknas tills du gjort ett pass eller bytt nivå)
// progress.gradeDays = { "ÅÅÅÅ-MM-DD": { easy, good, hard } }, antal ord per betyg när dagen slutade
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
// Byter innehåll på sidan. Tomma delar hoppas över, annars visas ordet "null".
function fillMain(...children) {
  main.replaceChildren(...children.filter(child => child !== null));
}

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
  delete p.placed;                    // Ordet är nu övat, inte bara överhoppat
  progress.words[id] = p;
  progress.gradeDays[dateStr(new Date())] = countGrades();
  saveProgress();
}

const GRADE_KEYS = { 5: "easy", 4: "good", 3: "hard" };

// Ord per senaste betyg just nu
function countGrades() {
  const counts = { easy: 0, good: 0, hard: 0 };
  WORDS.forEach(w => {
    const key = progress.words[w.id] && GRADE_KEYS[progress.words[w.id].lastGrade];
    if (key) counts[key]++;
  });
  return counts;
}

// Äldre framsteg saknar betyg per dag. Historiken byggs då upp ur senaste betyget och
// dagen det gavs, så den blir en uppskattning: tidigare betyg på samma ord är inte sparade.
function seedGradeDays() {
  if (progress.gradeDays) return;
  const perDay = {};
  WORDS.forEach(w => {
    const p = progress.words[w.id];
    const key = p && GRADE_KEYS[p.lastGrade];
    if (!key) return;
    const day = dateStr(new Date(p.due - p.interval * DAY));
    perDay[day] = perDay[day] || { easy: 0, good: 0, hard: 0 };
    perDay[day][key]++;
  });
  const total = { easy: 0, good: 0, hard: 0 };
  progress.gradeDays = {};
  Object.keys(perDay).sort().forEach(day => {
    Object.keys(total).forEach(key => total[key] += perDay[day][key]);
    progress.gradeDays[day] = { ...total };
  });
  saveProgress();
}

// Betygen som gällde en viss dag: senaste sparade dag fram till och med den
function gradesOn(date) {
  const last = Object.keys(progress.gradeDays).filter(d => d <= date).sort().pop();
  return last ? progress.gradeDays[last] : { easy: 0, good: 0, hard: 0 };
}

function gradeButtons(onGrade, includeFail) {
  const defs = [[1, "Kunde inte", "again"], [3, "Svårt", "hard"], [4, "Bra", "good"], [5, "Lätt", "easy"]]
    .filter(d => includeFail || d[0] !== 1);
  return h("div", { class: "buttons" },
    defs.map(([q, label, cls]) => h("button", { class: cls, onclick: () => onGrade(q) }, label)));
}

// ---------- 6. Bygg dagens pass ----------
// Ord att befästa: överhoppade ord du inte övat på, eller ord du senast tyckte var svåra
function needsWork(p) {
  return p.placed || p.lastGrade === 1 || p.lastGrade === 3;
}

// Fler ord att befästa ger fler repetitioner per pass
function reviewCount() {
  const backlog = Object.values(progress.words).filter(needsWork).length;
  return Math.min(MAX_REVIEWS, Math.max(MIN_REVIEWS, Math.ceil(backlog / WORDS_PER_REVIEW)));
}

// Ordning: först försenade ord, sedan ord att befästa, sist övriga
function reviewRank(p) {
  if (p.due <= Date.now()) return 0;
  return needsWork(p) ? 1 : 2;
}

// Lektionen du är på. Utan sparad lektion: den första med ord du inte sett.
function currentLesson() {
  if (progress.currentLesson <= Math.max(...WORDS.map(w => w.lesson))) return progress.currentLesson;
  const unseen = WORDS.filter(w => !progress.words[w.id]);
  return unseen.length ? Math.min(...unseen.map(w => w.lesson)) : null;
}

function buildSession() {
  const lesson = currentLesson();
  const newWords = WORDS.filter(w => w.lesson === lesson).slice(0, NEW_PER_SESSION);

  const review = WORDS.filter(w => progress.words[w.id] && !newWords.includes(w))
    .sort((a, b) => {
      const [p, q] = [progress.words[a.id], progress.words[b.id]];
      return reviewRank(p) - reviewRank(q) || p.due - q.due;
    })
    .slice(0, reviewCount());

  if (!lesson) {
    return { review, newWords: [], sentences: shuffle(SENTENCES).slice(0, SENTENCES_PER_SESSION), lesson: null };
  }
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

// Repetition av en lektion: övar orden och meningarna, men flyttar dig inte på stigen
function startPractice(lesson) {
  const words = WORDS.filter(w => w.lesson === lesson);
  const sentences = SENTENCES.filter(s => s.lesson === lesson);
  session = { review: words, newWords: [], sentences, lesson, practice: true };
  queue = shuffle(words).map(w => ({ type: "quiz", word: w }));
  sentences.forEach(s => queue.push({ type: "read", sentence: s }));
  sentences.filter(s => sentenceParts(s).length >= 2).forEach(s => queue.push({ type: "build", sentence: s }));
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
  fillMain(
    h("div", { class: "progress" }, h("div", { class: "bar", style: `width:${(pos / queue.length) * 100}%` })),
    h("p", { class: "step-label center" }, label),
    ...content
  );
}

// ---------- 7. Stegen i passet ----------
function showReview(task) {
  const w = task.word;
  const answer = h("div", { class: "hidden" }, h("div", { class: "sv" }, w.sv), w.note ? h("div", { class: "note" }, mixed(w.note)) : null);
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
    h("div", { class: "card" }, srBlock(w.sr), h("div", { class: "sv" }, w.sv), w.note ? h("div", { class: "note" }, mixed("💡 " + w.note)) : null),
    h("div", { class: "buttons" }, h("button", { class: "primary", onclick: next }, "Nästa"), grammarButton(w.lesson)));
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
  const answer = h("div", { class: "hidden" }, h("div", { class: "sv" }, s.sv), s.note ? h("div", { class: "note" }, mixed("💡 " + s.note)) : null);
  const nextBtn = h("button", { class: "primary hidden", onclick: next }, "Nästa");
  const showBtn = h("button", { class: "primary", onclick: () => {
    answer.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
    showBtn.classList.add("hidden");
  } }, "Visa översättning");
  screen("Läs och förstå", h("div", { class: "card" }, srBlock(s.sr, "sentence"), answer),
    h("div", { class: "buttons" }, showBtn, nextBtn, grammarButton(s.lesson)));
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
  if (session.lesson && !session.practice) progress.currentLesson = session.lesson + 1;
  saveProgress();
  updateHeader();
  main.replaceChildren(
    h("div", { class: "card" },
      h("div", { class: "big" }, "Bra jobbat! 🎉"),
      h("p", {}, `Du repeterade ${session.review.length} ord, lärde dig ${session.newWords.length} nya och övade på ${session.sentences.length} meningar.`),
      h("p", { class: "muted" }, streakText())),
    h("div", { class: "buttons" },
      h("button", { class: "primary", onclick: () => showHome(session.practice ? session.lesson : undefined) }, "Till stigen"),
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

function allLessons() {
  return [...new Set(WORDS.map(w => w.lesson))].sort((a, b) => a - b);
}

function lessonTheme(lesson) {
  return WORDS.find(w => w.lesson === lesson).theme;
}

// Lektionens läge på stigen: current, done, skipped eller next
function lessonStatus(lesson) {
  if (lesson === currentLesson()) return "current";
  if (progress.sessions.some(s => s.lesson === lesson)) return "done";
  return WORDS.some(w => w.lesson === lesson && progress.words[w.id]) ? "skipped" : "next";
}

const STATUS_TEXT = { current: "Din lektion", done: "Gjord", skipped: "Överhoppad", next: "Kommande" };

// Lektioner du gjort ett pass på. Överhoppade räknas inte.
function doneLessons() {
  return allLessons().filter(lesson => progress.sessions.some(s => s.lesson === lesson));
}

// Ord du kan: senaste betyg är Lätt eller Bra
function knownWords(list = WORDS) {
  return list.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade >= 4);
}

// Stigens mått: höjd i pixlar per rad, sidled i procent av bredden
const ROAD_ROW = 98;
const ROAD_CURRENT = 160;  // Din lektion får plats för startknappen
const ROAD_LEVEL = 62;
const ROAD_SWING = 38;
const ROAD_TURN = 0.9;  // Högre värde ger fler svängar
const ROAD_STEP = 30;   // En tass per så många pixlar fritt avstånd mellan knapparna
const ROAD_SIDE = 6;    // Tassarna går växelvis på varsin sida om stigens mitt
const ROAD_GAP = 6;     // Fritt utrymme runt startknappen och igelkotten

// Ett tassavtryck: trampdyna och fyra tår, med tårna uppåt
const PAW = "M-3.6 2a3.6 3 0 1 0 7.2 0a3.6 3 0 1 0-7.2 0Z" +
  "M-5.6-1.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z" +
  "M-2.9-3.8a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z" +
  "M.1-3.8a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z" +
  "M2.8-1.6a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z";

// Benen står still och kroppen rör sig, så att igelkotten stannar på marken
const HEDGEHOG = `<svg viewBox="0 0 58 46" aria-hidden="true">
  <g fill="#8d7360">
    <rect x="17" y="33" width="6" height="11" rx="3"/>
    <rect x="33" y="33" width="6" height="11" rx="3"/>
    <ellipse cx="21" cy="43.2" rx="5" ry="2.4"/>
    <ellipse cx="37" cy="43.2" rx="5" ry="2.4"/>
  </g>
  <g class="hedgehog-body">
    <path d="M5 34 L2 27 L8 26 L6 18 L13 20 L14 11 L21 15 L25 7 L30 14 L37 9 L38 18 L43 22 Q50 26 49 33 Q48 38 41 38 L12 38 Q6 38 5 34Z" fill="#a98c76"/>
    <path d="M34 38 Q31 24 42 22 Q52 25 55 32 Q56 35 53 36 Q47 39 41 38Z" fill="#efdccb"/>
    <circle class="hedgehog-eye" cx="44" cy="29" r="1.8" fill="#4d4540"/>
    <circle cx="55" cy="33" r="2" fill="#4d4540"/>
    <ellipse cx="39" cy="33" rx="2.6" ry="1.7" fill="#e9b7ae"/>
  </g>
</svg>`;

function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

// Mjuk kurva från en knapp till nästa, utan knyck vid knapparna
function roadSegment(points, i) {
  const from = points[i], to = points[i + 1];
  const back = points[i - 1] || from;
  const ahead = points[i + 2] || to;
  return `M ${from.x} ${from.y} C ${from.x + (to.x - back.x) / 6} ${from.y + (to.y - back.y) / 6} ` +
    `${to.x - (ahead.x - from.x) / 6} ${to.y - (ahead.y - from.y) / 6} ${to.x} ${to.y}`;
}

// Sätter tassavtryck med lika stora mellanrum mellan knapparna i varje nivå.
// Mellan nivåer blir det inga, och avtryck som skulle hamna under något hoppas över.
function drawPaws(road, points, stop) {
  const box = road.getBoundingClientRect();
  const rects = selector => [...road.querySelectorAll(selector)].map(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top };
  });
  const radii = rects(".node").map(n => (n.right - n.left) / 2);
  const blocks = rects(".road-start button, .hedgehog");
  const isFree = (x, y) =>
    !blocks.some(b => x > b.left - ROAD_GAP && x < b.right + ROAD_GAP && y > b.top - ROAD_GAP && y < b.bottom + ROAD_GAP);

  const line = road.querySelector(".road-line");
  const curve = svgEl("path", {});
  line.replaceChildren(curve);
  const walked = svgEl("g", { class: "road-walked" });
  const ahead = svgEl("g", { class: "road-ahead" });
  const pixels = points.map(p => ({ x: p.x / 100 * box.width, y: p.y }));

  points.slice(1).forEach((point, i) => {
    if (lessonLevel(points[i].lesson) !== lessonLevel(point.lesson)) return;
    curve.setAttribute("d", roadSegment(pixels, i));
    const room = curve.getTotalLength() - radii[i] - radii[i + 1];
    const count = Math.max(1, Math.floor(room / ROAD_STEP));
    for (let n = 1; n <= count; n++) {
      const length = radii[i] + room * n / (count + 1);
      const p = curve.getPointAtLength(length);
      const next = curve.getPointAtLength(length + 1);
      const angle = Math.atan2(next.y - p.y, next.x - p.x);
      const side = count === 1 ? 0 : (n % 2 ? ROAD_SIDE : -ROAD_SIDE);
      const x = p.x - Math.sin(angle) * side;
      const y = p.y + Math.cos(angle) * side;
      if (!isFree(x, y)) continue;
      const degrees = angle * 180 / Math.PI + 90;  // Tårna pekar dit stigen går
      (i < stop ? walked : ahead).append(svgEl("path",
        { d: PAW, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${degrees.toFixed(0)})` }));
    }
  });
  line.replaceChildren(ahead, walked);
}

function roadmap(startLabel) {
  const current = currentLesson();
  const points = [];
  const items = [];
  let y = 0;
  let level = 0;

  allLessons().forEach((lesson, i) => {
    if (lessonLevel(lesson) !== level) {
      level = lessonLevel(lesson);
      items.push(h("div", { class: "road-level", style: `top:${y}px` }, `Nivå ${level}`));
      y += ROAD_LEVEL;
    }
    const x = 50 + Math.sin(i * ROAD_TURN) * ROAD_SWING;
    const status = lessonStatus(lesson);
    const center = y + 46;
    points.push({ x, y: center, lesson });
    items.push(h("button", { class: `node ${status}`, style: `left:${x}%;top:${center}px`, "data-lesson": lesson,
      "aria-label": `Lektion ${lesson}: ${lessonTheme(lesson)}, ${STATUS_TEXT[status].toLowerCase()}`,
      onclick: () => showLesson(lesson) },
      String(lesson),
      status === "done" ? h("span", { class: "node-check" }, "✓") : null));
    if (status === "current") {
      const onRight = x < 50;  // Igelkotten står på den sida där det finns plats
      const hedgehog = h("div", { class: "hedgehog" + (onRight ? " flip" : ""),
        style: `left:calc(${x}% ${onRight ? "+ 44px" : "- 102px"});top:${center - 23}px` });
      hedgehog.innerHTML = HEDGEHOG;
      items.push(hedgehog,
        h("div", { class: "road-start", style: `top:${center + 48}px` },
          h("button", { class: "primary", onclick: startSession }, startLabel)));
    }
    y += status === "current" ? ROAD_CURRENT : ROAD_ROW;
  });

  // Tassavtryck: gången del fram till din lektion, resten dämpad
  const stop = current ? points.findIndex(p => p.lesson === current) : points.length - 1;
  const line = svgEl("svg", { class: "road-line", height: y, "aria-hidden": "true" });
  const road = h("div", { class: "road", style: `height:${y}px` }, line, items);

  // Avtrycken ritas när bredden är känd och om igen när den ändras
  let drawnWidth = 0;
  new ResizeObserver(() => {
    const width = road.clientWidth;
    if (!width || width === drawnWidth) return;
    drawnWidth = width;
    drawPaws(road, points, stop);
  }).observe(road);
  return road;
}

function scrollToLesson(lesson) {
  const node = main.querySelector(`[data-lesson="${lesson}"]`);
  if (node) node.scrollIntoView({ block: "center" });
}

// focus = lektionen stigen ska visa, annars din egen
function showHome(focus) {
  setNav("home");
  const s = buildSession();
  const doneToday = progress.sessions.some(x => x.date === dateStr(new Date()));
  const startLabel = doneToday ? "Kör ett pass till" : "Starta pass";
  fillMain(
    s.lesson ? null : h("div", { class: "card" },
      h("div", { class: "big" }, "Alla lektioner klara!"),
      h("p", { class: "note" }, "Be Claude lägga till fler lektioner. Tills dess repeterar du."),
      h("div", { class: "buttons" }, h("button", { class: "primary", onclick: startSession }, startLabel))),
    roadmap(startLabel));
  scrollToLesson(typeof focus === "number" ? focus : s.lesson);
}

// En lektion: se innehållet och repetera, utan att din plats ändras
function showLesson(lesson) {
  setNav(null);
  const status = lessonStatus(lesson);
  const words = WORDS.filter(w => w.lesson === lesson);
  const sentences = SENTENCES.filter(s => s.lesson === lesson);
  fillMain(
    h("button", { class: "link-btn", onclick: () => showHome(lesson) }, "← Till stigen"),
    h("div", { class: "card" },
      h("p", { class: "step-label" }, `Nivå ${lessonLevel(lesson)} · ${STATUS_TEXT[status]}`),
      h("div", { class: "big" }, `Lektion ${lesson}`),
      h("p", { class: "muted" }, lessonTheme(lesson))),
    h("div", { class: "buttons" },
      grammarButton(lesson),
      status === "current" ? h("button", { class: "primary", onclick: startSession }, "Starta pass") : null,
      status === "done" || status === "skipped"
        ? h("button", { class: "good", onclick: () => startPractice(lesson) }, "Repetera lektionen") : null),
    status === "next" ? h("p", { class: "muted center" }, "Du kommer hit senare. Du kan titta redan nu.") : null,
    status === "done" || status === "skipped" ? h("p", { class: "muted center" }, "Din plats på stigen ändras inte.") : null,
    h("p", { class: "step-label" }, "Ord"),
    h("div", { class: "lesson-list" }, words.map(w => h("div", { class: "lesson-item" },
      h("div", { class: "lesson-sr" }, w.sr, h("span", { class: "muted lesson-cyr" }, " " + toCyrillic(w.sr))),
      h("div", {}, w.sv),
      w.note ? h("div", { class: "note lesson-note" }, mixed(w.note)) : null))),
    h("p", { class: "step-label" }, "Meningar"),
    h("div", { class: "lesson-list" }, sentences.map(s => h("div", { class: "lesson-item" },
      h("div", { class: "lesson-sr" }, s.sr),
      h("div", {}, s.sv),
      s.note ? h("div", { class: "note lesson-note" }, mixed(s.note)) : null))));
}

// ---------- Grammatikfönster ----------
// Text som blandar svenska och serbiska: *serbiska* blir kursivt
function mixed(text) {
  return text.split("*").map((part, i) => i % 2 ? h("em", {}, part) : part);
}

function grammarFor(lesson) {
  return GRAMMAR.filter(g => g.lessons.includes(lesson));
}

// Knapp för de som vill veta mer. Visas bara där det finns en förklaring.
function grammarButton(lesson) {
  if (!grammarFor(lesson).length) return null;
  return h("button", { class: "grammar-btn", onclick: () => showGrammar(lesson) }, "Förklara grammatiken");
}

// Modulfönster som stängs med knappen, Esc eller ett tryck utanför
function showModal(label, content) {
  const closeDialog = () => { dialog.close(); dialog.remove(); };
  const dialog = h("dialog", { class: "modal", "aria-label": label },
    h("div", { class: "modal-body" }, content,
      h("div", { class: "buttons modal-close" }, h("button", { class: "primary", onclick: closeDialog }, "Stäng"))));
  dialog.addEventListener("close", () => dialog.remove());  // Esc-tangenten
  dialog.addEventListener("click", e => { if (e.target === dialog) closeDialog(); });  // Tryck utanför stänger
  document.body.append(dialog);
  dialog.showModal();
}

function showGrammar(lesson) {
  showModal("Grammatik", grammarFor(lesson).map(g => h("section", {},
    h("h2", {}, mixed(g.title)),
    g.text.map(t => h("p", {}, mixed(t))),
    h("div", { class: "modal-list" }, g.examples.map(([sr, sv]) =>
      h("div", { class: "word-row" }, h("span", {}, h("em", {}, sr)), h("span", { class: "muted" }, mixed(sv))))))));
}

// Orden med ett visst senaste betyg
function showWords(label, list) {
  showModal(`Ord: ${label}`, [
    h("h2", {}, `${label} (${list.length})`),
    list.length
      ? h("div", { class: "modal-list" }, list.map(w =>
          h("div", { class: "word-row" }, h("span", {}, h("em", {}, w.sr)), h("span", { class: "muted" }, w.sv))))
      : h("p", { class: "muted" }, "Inga ord här än.")]);
}

// ---------- 9. Nivåer ----------
// En nivå = 10 lektioner
const LESSONS_PER_LEVEL = 10;

function lessonLevel(lesson) { return Math.ceil(lesson / LESSONS_PER_LEVEL); }
function lastLessonNumber() { return Math.max(...WORDS.map(w => w.lesson)); }

const levelChangeNote = "Ord du redan har övat på sparas. Överhoppade ord kommer tillbaka i repetitionen.";

// Flyttar dig till en lektion, framåt eller bakåt. Ord med riktiga framsteg lämnas alltid orörda.
function moveToLesson(lesson) {
  WORDS.forEach(w => {
    const p = progress.words[w.id];
    if (w.lesson >= lesson && p && p.placed) delete progress.words[w.id];  // Bakåt: blir nya ord igen
    if (w.lesson < lesson && !p) {
      progress.words[w.id] = {
        reps: 2,
        interval: 6,
        ease: 2.5,
        due: Date.now() + (1 + Math.random() * 13) * DAY,
        lastGrade: null,
        placed: true
      };
    }
  });
  progress.currentLesson = lesson;
  saveProgress();
  showHome();
}

// Översikt: hur långt du kommit på varje nivå, och välj själv var du vill jobba
function showLevelPicker() {
  const levels = lessonLevel(lastLessonNumber());
  const lesson = currentLesson();
  const currentLevel = lesson ? lessonLevel(lesson) : null;
  const rows = Array.from({ length: levels }, (_, i) => i + 1).map(level => {
    const first = (level - 1) * LESSONS_PER_LEVEL + 1;
    const themes = [...new Set(WORDS.filter(w => lessonLevel(w.lesson) === level).map(w => w.theme))];
    const here = level === currentLevel;
    const lessons = allLessons().filter(l => lessonLevel(l) === level);
    const done = doneLessons().filter(l => lessonLevel(l) === level).length;
    return h("button", { class: "option level-option", ...(here ? { disabled: "" } : {}), onclick: () => moveToLesson(first) },
      h("div", { class: "level-title" }, `Nivå ${level} · lektion ${first}–${first + LESSONS_PER_LEVEL - 1}` + (here ? " · du är här" : "")),
      h("div", { class: "muted level-themes" }, themes.slice(0, 4).join(", ")),
      h("div", { class: "progress" }, h("div", { class: "bar", style: `width:${done / lessons.length * 100}%` })),
      h("div", { class: "muted level-themes" }, `${done} av ${lessons.length} lektioner klara`));
  });
  setNav("levels");
  main.replaceChildren(
    h("p", { class: "step-label center" }, "Översikt"),
    h("p", { class: "muted center" }, levelChangeNote),
    h("div", { class: "options" }, rows));
}

// Tar bort ord du hoppat över och inte har övat på
function undoPlacement() {
  if (!confirm("Ångra hoppet? Ord du inte har övat på blir nya igen. Dina övriga framsteg påverkas inte.")) return;
  Object.keys(progress.words).filter(id => progress.words[id].placed).forEach(id => delete progress.words[id]);
  delete progress.placement;
  delete progress.currentLesson;
  saveProgress();
  showDashboard();
}

// ---------- 10. Dashboard ----------
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
    const grades = gradesOn(dateStr(daysAgo(ago)));  // Veckans stapel visar läget när veckan slutade
    buckets.push({ ...grades, total: grades.easy + grades.good + grades.hard, label, title: step > 1 ? `Veckan från ${title}` : title });
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
  const text = `${bucket.title}: ${bucket.easy} lätt, ${bucket.good} bra, ${bucket.hard} svårt`;
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
    ["easy", "good", "hard"].map(key => bucket[key]
      ? h("span", { class: "chart-seg " + key, style: `flex-grow:${bucket[key]}` }) : null),
    h("span", { class: "chart-space", style: `flex-grow:${bucket.total ? 0 : 1}` }));
}

function progressChart(buckets) {
  const max = niceMax(Math.max(...buckets.map(b => b.total), 1));
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
          h("div", { class: "chart-bar", style: `height:${b.total / max * 100}%` }, chartColumn(b, tip)))))),
    h("div", { class: "chart-labels" }, buckets.map((b, i) =>
      h("span", {}, (buckets.length - 1 - i) % every === 0 ? b.label : ""))),
    h("div", { class: "chart-legend" },
      h("span", {}, h("i", { class: "swatch easy" }), "Lätt"),
      h("span", {}, h("i", { class: "swatch good" }), "Bra"),
      h("span", {}, h("i", { class: "swatch hard" }), "Svårt")));
}

// Cirkel som fylls i takt med hur många ord du kan av ett totalt antal
function progressRing(known, total, label) {
  const radius = 42;
  const length = 2 * Math.PI * radius;
  const circle = cls => svgEl("circle", { class: cls, cx: 50, cy: 50, r: radius });
  const ring = svgEl("svg", { class: "ring-svg", viewBox: "0 0 100 100", "aria-hidden": "true" });
  ring.append(circle("ring-track"));
  if (known) {
    const value = circle("ring-value");
    value.setAttribute("stroke-dasharray", `${known / total * length} ${length}`);
    ring.append(value);
  }
  return h("div", { class: "ring", role: "img", "aria-label": `${label}: ${known} av ${total} ord` },
    h("div", { class: "ring-circle" }, ring,
      h("div", { class: "ring-text" }, h("span", { class: "ring-num" }, String(known)), h("span", { class: "muted" }, `av ${total}`))),
    h("div", { class: "muted ring-label" }, label));
}

function progressSection() {
  const now = sumSessions(chartDays - 1, 0);
  const before = sumSessions(chartDays * 2 - 1, chartDays);
  const buckets = chartBuckets(chartDays);
  const withWords = buckets.filter(b => b.total);
  const ranges =[[7, "7 dagar"], [30, "30 dagar"], [91, "3 månader"]];
  return h("div", {},
    h("div", { class: "section-title" }, "Din utveckling"),
    h("div", { class: "ranges" }, ranges.map(([days, label]) =>
      h("button", { class: "range-btn" + (days === chartDays ? " active" : ""),
        onclick: () => { chartDays = days; showDashboard(); } }, label))),
    h("div", { class: "card chart-card" },
      h("div", { class: "metrics" },
        metric("Pass", now.sessions, before.sessions),
        metric("Nya ord", now.newWords, before.newWords),
        metric("Repetitioner", now.reviewed, before.reviewed),
        metric("Aktiva dagar", now.activeDays, before.activeDays)),
      withWords.length ? progressChart(buckets) : h("p", { class: "muted" }, "Inga ord med betyg än.")),
    withWords.length ? h("details", {},
      h("summary", {}, "Visa som tabell"),
      withWords.map(b => h("div", { class: "word-row" },
        h("span", {}, b.title), h("span", { class: "muted" }, `${b.easy} lätt, ${b.good} bra, ${b.hard} svårt`)))) : null);
}

function showDashboard() {
  setNav("dash");
  const seen = WORDS.filter(w => progress.words[w.id]);
  const byGrade = g => seen.filter(w => progress.words[w.id].lastGrade === g);
  const groups = [["Lätt", "easy", byGrade(5)], ["Bra", "good", byGrade(4)], ["Svårt", "hard", byGrade(3)]];
  const lessons = allLessons();
  const done = doneLessons();
  const wordsDone = WORDS.filter(w => done.includes(w.lesson));

  const fileInput = h("input", { type: "file", accept: ".json", class: "hidden",
    onchange: e => { if (e.target.files[0]) importProgress(e.target.files[0]); } });

  // Allt packas i en div så att listor och null hanteras av h()
  main.replaceChildren(h("div", {},
    h("div", { class: "today" },
      h("div", {},
        h("div", { class: "today-title" }, "Dina framsteg"),
        h("div", { class: "muted today-meta" }, `${seen.length} av ${WORDS.length} ord sedda`)),
      h("div", { class: "muted today-streak" }, streakText())),
    progressSection(),
    h("div", { class: "section-title" }, "Ord du kan"),
    h("div", { class: "rings" },
      progressRing(knownWords(wordsDone).length, wordsDone.length, "I klara lektioner"),
      progressRing(knownWords().length, WORDS.length, "I hela appen")),
    h("div", { class: "stats" }, groups.map(([label, cls, list]) =>
      h("button", { class: "stat " + cls, "aria-label": `${label}: ${list.length} ord. Visa orden.`, onclick: () => showWords(label, list) },
        h("span", { class: "stat-num" }, String(list.length)), label))),
    h("div", { class: "card summary" },
      h("div", { class: "word-row" }, h("span", {}, "Lektioner klara"), h("span", { class: "muted" }, `${done.length} av ${lessons.length}`)),
      h("div", { class: "word-row" }, h("span", {}, "Pass totalt"), h("span", { class: "muted" }, String(progress.sessions.length)))),
    Object.values(progress.words).some(p => p.placed) ? h("div", { class: "buttons" },
      h("button", { class: "link-btn", onclick: undoPlacement }, "Ångra hoppet")) : null,
    h("div", { class: "section-title" }, "Säkerhetskopia"),
    h("div", { class: "card" },
      h("p", { class: "muted backup-text" }, "Framstegen sparas bara här. På iPhone är appen på hemskärmen och Safari skilda platser, så använd alltid samma. Exportera då och då som backup."),
      h("div", { class: "buttons" },
        h("button", { class: "good", onclick: exportProgress }, "Exportera"),
        h("button", { class: "easy", onclick: () => fileInput.click() }, "Importera"))),
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
      seedGradeDays();
      showDashboard();
    }
  }).catch(() => alert("Filen kunde inte läsas."));
}

// ---------- 11. Navigering och start ----------
function setNav(active) {
  window.scrollTo(0, 0);  // Stigen är lång, så varje ny vy börjar överst
  document.getElementById("navHome").classList.toggle("active", active === "home");
  document.getElementById("navDash").classList.toggle("active", active === "dash");
  document.getElementById("navLevels").classList.toggle("active", active === "levels");
  updateHeader();
}

// Raden bredvid rubriken: svit och ord du kan (senaste betyg Lätt eller Bra)
function updateHeader() {
  document.getElementById("streakCount").textContent = `🔥 ${streak()}`;
  document.getElementById("knownCount").textContent = `🍃 ${knownWords().length}`;
}

document.getElementById("navHome").addEventListener("click", () => showHome());
document.getElementById("navDash").addEventListener("click", showDashboard);
document.getElementById("navLevels").addEventListener("click", showLevelPicker);

// Läs in ord och meningar, visa sedan startsidan
Promise.all([
  fetch("data/words.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/sentences.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/grammar.json", { cache: "no-cache" }).then(r => r.json()).catch(() => [])  // Appen fungerar utan
]).then(([words, sentences, grammar]) => {
  WORDS = words;
  SENTENCES = sentences;
  GRAMMAR = grammar;
  seedGradeDays();
  showHome();
}).catch(() => {
  main.replaceChildren(h("div", { class: "card" },
    h("p", {}, "Kunde inte läsa ordlistan."),
    h("p", { class: "note" }, "Öppnade du index.html direkt från datorn? Appen behöver köras via en lokal server eller GitHub Pages. Be Claude Code: \"Starta en lokal server för appen\".")));
});
