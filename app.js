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
const TRAIN_WORDS = 8;            // Ord per träningspass
const TRAIN_SENTENCES = 3;        // Meningar per träningspass, utöver orden
const STORAGE_KEY = "serbiska-progress-v1";
const DAY = 24 * 60 * 60 * 1000;

let WORDS = [];       // Fylls från data/words.json
let SENTENCES = [];   // Fylls från data/sentences.json
let GRAMMAR = [];     // Fylls från data/grammar.json
let CATEGORIES = [];  // Fylls från data/categories.json
let progress = loadProgress();

let session = null;   // Dagens pass
let queue = [];       // Alla steg i passet, i ordning
let pos = 0;          // Vilket steg vi är på

const main = document.getElementById("main");

// ---------- 2. Spara och ladda framsteg ----------
// progress.words[id] = { reps, interval, ease, due, lastGrade, placed? }
// progress.sessions  = [{ date, lesson, reviewed, newWords, marked? }], marked = lektionen markerades som gjord utan pass
// progress.placement = gammalt resultat från nivåtestet, som är borttaget. Används inte längre.
// progress.currentLesson = nästa lektion (saknas tills du gjort ett pass eller bytt nivå)
// progress.gradeDays = { "ÅÅÅÅ-MM-DD": { easy, good, hard } }, antal ord per betyg när dagen slutade
// progress.builtSentences = { id: true }, meningar du byggt rätt (saknas i äldre framsteg)
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

// Visar serbisk text med kyrilliska under, och en ljudknapp när id finns
function srBlock(text, extraClass = "", id = null) {
  return [h("div", { class: "sr " + extraClass }, text), h("div", { class: "cyr" }, toCyrillic(text)),
    id ? h("div", { class: "speak-row" }, speakButton(id, text)) : null];
}

// ---------- Ljud ----------
// Ljudfiler skapas av tools/make-audio.ps1 och listas i data/audio.json.
// Saknas en fil används enhetens egen serbiska, bosniska eller kroatiska röst om den finns.
let AUDIO = new Set();

function serbianVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices();
  return ["sr", "bs", "hr"].map(code => voices.find(v => v.lang.toLowerCase().startsWith(code))).find(Boolean) || null;
}

function speak(id, text) {
  if (AUDIO.has(id)) {
    new Audio(`audio/${id}.mp3`).play().catch(() => {});
    return;
  }
  const voice = serbianVoice();
  if (!voice) {
    showModal("Inget ljud än", [h("h2", {}, "Inget ljud än"),
      h("p", {}, "Ljudfilen är inte skapad än, och den här enheten har ingen serbisk, bosnisk eller kroatisk röst.")]);
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.85;  // Lite långsammare än vanligt tal
  speechSynthesis.speak(utterance);
}

function speakButton(id, text) {
  return h("button", { class: "speak-btn", "aria-label": `Lyssna: ${text}`,
    onclick: e => { e.stopPropagation(); speak(id, text); } }, "🔊");
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

// first = knapp som läggs först i raden, till exempel Tillbaka
function gradeButtons(onGrade, includeFail, first = null) {
  const defs = [[1, "Kan inte", "again"], [3, "Svår", "hard"], [4, "Bra", "good"], [5, "Lätt", "easy"]]
    .filter(d => includeFail || d[0] !== 1);
  return h("div", { class: "buttons grade-row" }, first,
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

// Läget innan varje steg visades, så att Tillbaka kan ångra svaret och visa steget igen
let snapshots = [];

// Hela ordlistan sparas, så att även ett svar på steget du lämnar ångras
function takeSnapshot() {
  const today = dateStr(new Date());
  snapshots[pos] = {
    words: JSON.stringify(progress.words),
    gradeDay: progress.gradeDays[today] ? { ...progress.gradeDays[today] } : null,
    built: { ...progress.builtSentences },
    queueLength: queue.length
  };
}

function back() {
  pos--;
  const s = snapshots[pos];
  const today = dateStr(new Date());
  progress.words = JSON.parse(s.words);
  if (s.gradeDay) progress.gradeDays[today] = s.gradeDay; else delete progress.gradeDays[today];
  progress.builtSentences = s.built;
  queue.length = s.queueLength;  // Tar bort omtaget som ett fel svar lade till
  saveProgress();
  showTask();
}

// Tillbaka står först bland stegets knappar, från andra steget
function backButton() {
  return pos > 0 ? h("button", { class: "back-btn", "aria-label": "Tillbaka till förra övningen", title: "Tillbaka", onclick: back }, "←") : null;
}

// Lägger tillbaka ett steg sist i kön (en gång) om du inte kunde det
function retryLater(task) {
  if (!task.retry) queue.push({ ...task, retry: true });
}

function showTask() {
  if (pos >= queue.length) return showDone();
  const task = queue[pos];
  takeSnapshot();
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
// Du betygsätter direkt hur väl du kan ordet. Sedan visas svaret så att du kan kontrollera.
function showReview(task) {
  const w = task.word;
  const answer = h("div", { class: "hidden" }, h("div", { class: "sv" }, w.sv), w.note ? h("div", { class: "note" }, mixed(w.note)) : null);
  const hint = h("p", { class: "muted center" }, "Hur väl kan du ordet?");
  const nextRow = h("div", { class: "buttons hidden" }, backButton(), h("button", { class: "primary", onclick: next }, "Nästa"));
  const grades = gradeButtons(q => {
    gradeWord(w.id, q);
    if (q === 1) retryLater(task);
    [answer, nextRow].forEach(el => el.classList.remove("hidden"));
    [grades, hint].forEach(el => el.classList.add("hidden"));
  }, true, backButton());
  screen("Repetition", h("div", { class: "card" }, srBlock(w.sr, "", w.id), answer), hint, grades, nextRow);
}

function showIntro(task) {
  const w = task.word;
  if (!progress.words[w.id]) { progress.words[w.id] = newProgress(); saveProgress(); }  // Markera som sett
  screen("Nytt ord",
    h("div", { class: "card" }, srBlock(w.sr, "", w.id), h("div", { class: "sv" }, w.sv), w.note ? h("div", { class: "note" }, mixed("💡 " + w.note)) : null),
    h("div", { class: "buttons" }, backButton(), h("button", { class: "primary", onclick: next }, "Nästa"), grammarButton(w.lesson)));
}

// Hur lika två texter stavas, från 0 till 1 (räknar hur många bokstäver som måste ändras)
function spellingLikeness(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const nextRow = [i];
    for (let j = 1; j <= b.length; j++) {
      nextRow[j] = Math.min(row[j] + 1, nextRow[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = nextRow;
  }
  return 1 - row[b.length] / Math.max(a.length, b.length, 1);
}

// Sorts ord: fråga, uppmaning, verb, fras eller enstaka ord
function wordKind(w) {
  if (w.sr.endsWith("?")) return "question";
  if (w.sr.endsWith("!")) return "command";
  if (w.sv.startsWith("jag ")) return "verb";
  return w.sr.includes(" ") ? "phrase" : "word";
}

function sharesCategory(a, b) {
  return CATEGORIES.some(c => c.lessons && c.lessons.includes(a.lesson) && c.lessons.includes(b.lesson));
}

// Högre poäng = lättare att förväxla med rätt svar
function confusionScore(w, x) {
  return spellingLikeness(w.sr, x.sr) * 3 + spellingLikeness(w.sv, x.sv) * 2 +
    (w.theme === x.theme ? 2 : 0) + (sharesCategory(w, x) ? 1.5 : 0) + (wordKind(w) === wordKind(x) ? 1.5 : 0);
}

// Tre felaktiga svar bland de 8 ord som mest liknar rätt svar, slumpade så att frågan varierar.
// Svar som innehåller varandra ("jag vill" och "jag vill, ja gärna") kan båda vara rätt och hoppas över.
function wrongOptionsFor(w) {
  const candidates = WORDS.filter(x => x.id !== w.id && !x.sv.includes(w.sv) && !w.sv.includes(x.sv))
    .map(x => ({ word: x, score: confusionScore(w, x) }))
    .sort((a, b) => b.score - a.score);
  const seen = new Set();
  const unique = candidates.filter(({ word }) => !seen.has(word.sv) && seen.add(word.sv));
  return shuffle(unique.slice(0, 8)).slice(0, 3).map(({ word }) => word);
}

function showQuiz(task) {
  const w = task.word;
  const options = shuffle([w, ...wrongOptionsFor(w)]);
  const after = h("div", {}, pos > 0 ? h("div", { class: "buttons" }, backButton()) : null);
  const buttons = options.map(o => h("button", { class: "option", onclick: () => choose(o) }, o.sv));

  function choose(o) {
    buttons.forEach(b => b.disabled = true);
    buttons[options.indexOf(w)].classList.add("correct");
    if (o.id === w.id) {
      after.replaceChildren(h("p", { class: "feedback ok" }, "Rätt! Hur lätt var det?"),
        gradeButtons(q => { gradeWord(w.id, q); next(); }, false, backButton()));
    } else {
      buttons[options.indexOf(o)].classList.add("wrong");
      gradeWord(w.id, 1);
      retryLater(task);
      after.replaceChildren(h("p", { class: "feedback bad" }, "Inte riktigt – ordet kommer tillbaka strax."),
        h("div", { class: "buttons" }, backButton(), h("button", { class: "primary", onclick: next }, "Fortsätt")));
    }
  }
  screen("Vad betyder ordet?", h("div", { class: "card" }, srBlock(w.sr, "", w.id)), h("div", { class: "options" }, buttons), after);
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
  screen("Läs och förstå", h("div", { class: "card" }, srBlock(s.sr, "sentence", s.id), answer),
    h("div", { class: "buttons" }, backButton(), showBtn, nextBtn, grammarButton(s.lesson)));
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
    if (ok) {
      progress.builtSentences = { ...progress.builtSentences, [s.id]: true };
      saveProgress();
    }
    answerRow.querySelectorAll("button").forEach(b => b.disabled = true);
    checkBtn.classList.add("hidden");
    // h() hoppar över null, därför packas allt i en div
    result.replaceChildren(h("div", {},
      h("p", { class: ok ? "feedback ok" : "feedback bad" }, ok ? "Rätt! 🎉" : "Nästan! Rätt ordning:"),
      ok ? null : h("div", { class: "card" }, srBlock(s.sr, "sentence", s.id)),
      h("div", { class: "buttons" }, h("button", { class: "primary", onclick: next }, "Nästa"))));
  }

  draw();
  screen("Bygg meningen", h("div", { class: "card" }, h("div", { class: "sv" }, s.sv)),
    answerRow, poolRow, h("div", { class: "buttons" }, backButton(), checkBtn), result);
}

// Sparar att en lektion gjorts. Svarar med nivån om lektionen var den sista som saknades där.
function addSession(entry) {
  const wasDone = progress.sessions.some(s => s.lesson === entry.lesson);
  progress.sessions.push(entry);
  if (!entry.lesson || wasDone) return null;
  const level = lessonLevel(entry.lesson);
  const levelDone = allLessons().filter(l => lessonLevel(l) === level).every(l => doneLessons().includes(l));
  return levelDone ? level : null;
}

// Nästa lektion du inte gjort, så att du inte hamnar på en du redan markerat som gjord
function lessonAfter(lesson) {
  return allLessons().find(l => l > lesson && !doneLessons().includes(l)) || lastLessonNumber() + 1;
}

function showDone() {
  const finishedLevel = addSession({ date: dateStr(new Date()), lesson: session.lesson,
    reviewed: session.review.length, newWords: session.newWords.length });
  if (session.lesson && !session.practice) progress.currentLesson = lessonAfter(session.lesson);
  saveProgress();
  updateHeader();
  main.replaceChildren(
    h("div", { class: "card" },
      h("div", { class: "big" }, "Bra jobbat! 🎉"),
      h("p", {}, `Du repeterade ${session.review.length} ord, lärde dig ${session.newWords.length} nya och övade på ${session.sentences.length} meningar.`),
      h("p", { class: "muted" }, streakText())),
    h("div", { class: "buttons" },
      session.trained
        ? h("button", { class: "primary", onclick: showTraining }, "Till Träna")
        : h("button", { class: "primary", onclick: () => showHome(session.practice ? session.lesson : undefined) }, "Till stigen"),
      h("button", { onclick: showDashboard }, "Se framsteg")));
  if (finishedLevel) celebrateLevel(finishedLevel);
}

// ---------- 8. Startsidan ----------
// Pass du verkligen gjort. Lektioner du bara markerat som gjorda ger inte svit eller statistik.
function studySessions() {
  return progress.sessions.filter(s => !s.marked);
}

function streak() {
  const days = new Set(studySessions().map(s => s.date));
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

// Den längsta sviten du haft
function longestStreak() {
  const days = [...new Set(studySessions().map(s => s.date))].sort();
  let best = 0, run = 0, before = null;
  days.forEach(day => {
    const time = new Date(day + "T12:00").getTime();
    run = before && Math.round((time - before) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    before = time;
  });
  return best;
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
  // Lektioner längre fram är kommande även om du tränat på deras ord under Träna
  if (currentLesson() && lesson > currentLesson()) return "next";
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
  <defs>
    <radialGradient id="hogBack" cx="0.42" cy="0.2" r="0.9">
      <stop offset="0" stop-color="#dcc5b0"/>
      <stop offset="0.5" stop-color="#a98c76"/>
      <stop offset="1" stop-color="#6a5142"/>
    </radialGradient>
    <radialGradient id="hogFace" cx="0.55" cy="0.25" r="0.85">
      <stop offset="0" stop-color="#fff8ef"/>
      <stop offset="0.55" stop-color="#efdccb"/>
      <stop offset="1" stop-color="#c4a68e"/>
    </radialGradient>
    <linearGradient id="hogLeg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a58a76"/>
      <stop offset="1" stop-color="#65503f"/>
    </linearGradient>
    <radialGradient id="hogCheek">
      <stop offset="0" stop-color="#eaa89c"/>
      <stop offset="1" stop-color="#eaa89c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse class="hedgehog-shadow" cx="30" cy="44.6" rx="24" ry="2.2" fill="#000" opacity="0.2"/>
  <g fill="url(#hogLeg)">
    <rect x="17" y="33" width="6" height="11" rx="3"/>
    <rect x="33" y="33" width="6" height="11" rx="3"/>
    <ellipse cx="21" cy="43.2" rx="5" ry="2.4"/>
    <ellipse cx="37" cy="43.2" rx="5" ry="2.4"/>
  </g>
  <g class="hedgehog-body">
    <path d="M5 34 L2 27 L8 26 L6 18 L13 20 L14 11 L21 15 L25 7 L30 14 L37 9 L38 18 L43 22 Q50 26 49 33 Q48 38 41 38 L12 38 Q6 38 5 34Z" fill="url(#hogBack)"/>
    <path d="M11 30 L9 24 M18 28 L17 20 M25 26 L26 16 M32 27 L34 18" stroke="#fff" stroke-opacity="0.35" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <path d="M34 38 Q31 24 42 22 Q52 25 55 32 Q56 35 53 36 Q47 39 41 38Z" fill="url(#hogFace)"/>
    <g class="hedgehog-eye">
      <circle cx="44" cy="29" r="1.9" fill="#2f2925"/>
      <circle cx="44.7" cy="28.3" r="0.6" fill="#fff"/>
    </g>
    <circle cx="55" cy="33" r="2.1" fill="#2f2925"/>
    <circle cx="55.6" cy="32.3" r="0.6" fill="#fff" opacity="0.8"/>
    <ellipse cx="40" cy="33.5" rx="3.6" ry="2.6" fill="url(#hogCheek)"/>
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
      items.push(h("div", { class: "road-level", "data-level": level, style: `top:${y}px` }, `Nivå ${level}`));
      y += ROAD_LEVEL;
    }
    const x = 50 + Math.sin(i * ROAD_TURN) * ROAD_SWING;
    const status = lessonStatus(lesson);
    const center = y + 46;
    points.push({ x, y: center, lesson });
    items.push(h("button", { class: `node ${status}`, style: `left:${x}%;top:${center}px`, "data-lesson": lesson,
      "aria-label": `Lektion ${lesson}: ${lessonTheme(lesson)}, ${STATUS_TEXT[status].toLowerCase()}`,
      onclick: () => showLesson(lesson) },
      String(lesson)));
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
  const doneToday = studySessions().some(x => x.date === dateStr(new Date()));
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
        ? h("button", { class: "good", onclick: () => startPractice(lesson) }, "Repetera lektionen") : null,
      status === "done" ? null : h("button", { onclick: () => showMarkDone(lesson) }, "Markera som gjord")),
    status === "next" ? h("p", { class: "muted center" }, "Du kommer hit senare. Du kan titta redan nu.") : null,
    status === "done" || status === "skipped" ? h("p", { class: "muted center" }, "Din plats på stigen ändras inte.") : null,
    h("p", { class: "step-label" }, "Ord"),
    h("div", { class: "lesson-list" }, words.map(w => h("div", { class: "lesson-item" },
      h("div", { class: "lesson-sr" }, w.sr, h("span", { class: "muted lesson-cyr" }, " " + toCyrillic(w.sr)), speakButton(w.id, w.sr)),
      h("div", {}, w.sv),
      w.note ? h("div", { class: "note lesson-note" }, mixed(w.note)) : null))),
    h("p", { class: "step-label" }, "Meningar"),
    h("div", { class: "lesson-list" }, sentences.map(s => h("div", { class: "lesson-item" },
      h("div", { class: "lesson-sr" }, s.sr, speakButton(s.id, s.sr)),
      h("div", {}, s.sv),
      s.note ? h("div", { class: "note lesson-note" }, mixed(s.note)) : null))));
}

// Markera en lektion som gjord: ange bara hur väl du kan varje ord
function showMarkDone(lesson) {
  setNav(null);
  const words = WORDS.filter(w => w.lesson === lesson);
  const picked = {};
  const saveBtn = h("button", { class: "primary", disabled: "disabled", onclick: save }, "Spara");

  function row(w) {
    const group = h("div", { class: "mark-grades" });
    const choices = [[3, "Svårt", "hard"], [4, "Bra", "good"], [5, "Lätt", "easy"]].map(([q, label, cls]) =>
      h("button", { class: cls, onclick: e => {
        picked[w.id] = q;
        group.classList.add("chosen");
        group.querySelectorAll("button").forEach(b => b.classList.toggle("picked", b === e.currentTarget));
        saveBtn.disabled = Object.keys(picked).length < words.length;
      } }, label));
    group.append(...choices);
    return h("div", { class: "lesson-item" },
      h("div", { class: "lesson-sr" }, w.sr, h("span", { class: "muted lesson-cyr" }, " " + toCyrillic(w.sr))),
      h("div", {}, w.sv),
      group);
  }

  function save() {
    const wasCurrent = lesson === currentLesson();
    words.forEach(w => gradeWord(w.id, picked[w.id]));
    const finishedLevel = addSession({ date: dateStr(new Date()), lesson, reviewed: 0, newWords: 0, marked: true });
    if (wasCurrent) progress.currentLesson = lessonAfter(lesson);
    saveProgress();
    showHome(wasCurrent ? undefined : lesson);
    if (finishedLevel) celebrateLevel(finishedLevel);
  }

  fillMain(
    h("button", { class: "link-btn", onclick: () => showLesson(lesson) }, "← Tillbaka"),
    h("div", { class: "card" },
      h("div", { class: "big" }, `Lektion ${lesson}`),
      h("p", { class: "muted" }, "Hur väl kan du orden? Orden kommer sedan med i repetitionerna.")),
    h("div", { class: "lesson-list" }, words.map(row)),
    h("div", { class: "buttons" }, saveBtn));
}

// Kullerbytta när alla lektioner på en nivå är gjorda
function celebrateLevel(level) {
  const hedgehog = h("div", { class: "hedgehog-flip" });
  hedgehog.innerHTML = HEDGEHOG;
  showModal(`Nivå ${level} klar`, [
    h("div", { class: "flip-stage" }, hedgehog),
    h("h2", { class: "center" }, `Nivå ${level} klar! 🎉`),
    h("p", { class: "center muted" }, `Du har gjort alla ${allLessons().filter(l => lessonLevel(l) === level).length} lektioner på nivån.`)]);
}

// ---------- Fönstren för din lektion, sviten och orden du kan ----------
function showLessonInfo() {
  const lesson = currentLesson();
  const done = doneLessons();
  const total = allLessons().length;
  const goToRoad = () => { document.querySelector("dialog.modal").close(); showHome(); };
  if (!lesson) {
    showModal("Din lektion", [h("h2", {}, "🦔 Alla lektioner klara"),
      h("p", {}, "Du har kommit igenom alla lektioner. Passen repeterar nu ord och meningar.")]);
    return;
  }
  const level = lessonLevel(lesson);
  const inLevel = allLessons().filter(l => lessonLevel(l) === level);
  const skipped = allLessons().filter(l => lessonStatus(l) === "skipped").length;
  showModal("Din lektion", [
    h("h2", {}, `🦔 Lektion ${lesson} av ${total}`),
    h("p", {}, `Igelkotten står vid lektionen du är på: ${lessonTheme(lesson)}. Nästa pass lär dig dess ord och meningar.`),
    h("div", { class: "modal-list" },
      [["Nivå", `${level}, lektion ${inLevel.indexOf(lesson) + 1} av ${inLevel.length}`],
       ["Kvar på nivån", String(inLevel.filter(l => !done.includes(l)).length)],
       ["Avklarade lektioner", `${done.length} av ${total}`],
       ["Överhoppade lektioner", String(skipped)]].map(([label, value]) =>
        h("div", { class: "word-row" }, h("span", {}, label), h("span", { class: "muted" }, value)))),
    h("div", { class: "buttons" }, h("button", { class: "good", onclick: goToRoad }, "Visa på stigen"))]);
}

function showStreakInfo() {
  const days = new Set(studySessions().map(s => s.date));
  const today = dateStr(new Date());
  const week = [6, 5, 4, 3, 2, 1, 0].map(ago => daysAgo(ago));
  showModal("Din svit", [
    h("h2", {}, streakText()),
    h("p", {}, days.has(today) ? "Du har gjort ett pass idag. Sviten är säker." : "Gör ett pass idag så håller du sviten vid liv."),
    h("div", { class: "week-dots" }, week.map(d => h("div", { class: "week-dot" },
      h("span", {}, days.has(dateStr(d)) ? "🔥" : "·"),
      d.toLocaleDateString("sv-SE", { weekday: "short" })))),
    h("div", { class: "modal-list" },
      h("div", { class: "word-row" }, h("span", {}, "Längsta sviten"), h("span", { class: "muted" }, `${longestStreak()} ${longestStreak() === 1 ? "dag" : "dagar"}`)),
      h("div", { class: "word-row" }, h("span", {}, "Dagar du pluggat"), h("span", { class: "muted" }, String(days.size)))),
    h("p", { class: "muted" }, "Varje dag med ett pass eller en repetition räknas. Sviten bryts om en hel dag går utan.")]);
}

function showKnownInfo() {
  const known = knownWords();
  const byGrade = g => WORDS.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade === g);
  const due = WORDS.filter(w => progress.words[w.id] && progress.words[w.id].due <= Date.now()).length;
  showModal("Ord du kan", [
    h("h2", {}, `🍃 ${known.length} av ${WORDS.length} ord`),
    h("p", {}, "Du kan ett ord när du senast gav det Lätt eller Bra."),
    h("div", { class: "modal-list" },
      [["Lätt", byGrade(5).length], ["Bra", byGrade(4).length], ["Svårt", byGrade(3).length], ["Att repetera nu", due]].map(([label, count]) =>
        h("div", { class: "word-row" }, h("span", {}, label), h("span", { class: "muted" }, String(count))))),
    known.length ? h("h2", {}, "Orden") : null,
    known.length ? h("div", { class: "modal-list" }, known.map(w =>
      h("div", { class: "word-row" }, h("span", {}, h("em", {}, w.sr)), h("span", { class: "muted" }, w.sv)))) : null]);
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
// En nivå = 7 lektioner
const LESSONS_PER_LEVEL = 7;

function lessonLevel(lesson) { return Math.ceil(lesson / LESSONS_PER_LEVEL); }
function lastLessonNumber() { return Math.max(...WORDS.map(w => w.lesson)); }

// Navigering: hur långt du kommit på varje nivå, och välj själv var du vill jobba
function showLevelPicker() {
  const levels = lessonLevel(lastLessonNumber());
  const lesson = currentLesson();
  const currentLevel = lesson ? lessonLevel(lesson) : null;
  const rows = Array.from({ length: levels }, (_, i) => i + 1).map(level => {
    const themes = [...new Set(WORDS.filter(w => lessonLevel(w.lesson) === level).map(w => w.theme))];
    const here = level === currentLevel;
    const lessons = allLessons().filter(l => lessonLevel(l) === level);
    const done = doneLessons().filter(l => lessonLevel(l) === level).length;
    const finished = done === lessons.length;
    return h("button", { class: "option level-option" + (finished ? " level-done" : "") + (here ? " level-here" : ""),
      onclick: () => showLevel(level), "aria-label": `Nivå ${level}${finished ? ", klar" : ""}${here ? ", du är här" : ""}` },
      h("div", { class: "level-title" }, `Nivå ${level}` + (here ? " · du är här" : "")),
      h("div", { class: "muted level-themes" }, themes.slice(0, 4).join(", ")),
      h("div", { class: "progress", role: "img", "aria-label": `${done} av ${lessons.length} lektioner klara` },
        h("div", { class: "bar", style: `width:${done / lessons.length * 100}%` })));
  });
  setNav("levels");
  main.replaceChildren(
    h("p", { class: "step-label center" }, "Navigering"),
    h("div", { class: "options" }, rows));
}

// Visar en nivå på stigen. Din plats ändras inte.
function showLevel(level) {
  showHome();
  main.querySelector(`[data-level="${level}"]`).scrollIntoView();
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

// ---------- Träna ----------
function categoryWords(category) {
  return WORDS.filter(w => (category.lessons || []).includes(w.lesson));
}

function categorySentences(category) {
  return SENTENCES.filter(s => category.sentences ? category.sentences.includes(s.id) : category.lessons.includes(s.lesson));
}

// Ord du senast tyckte var svåra eller inte kunde. Bara ord du betygsatt räknas.
function hardWords() {
  return WORDS.filter(w => progress.words[w.id] && [1, 3].includes(progress.words[w.id].lastGrade));
}

// Hur mycket du gjort: ord du kan, eller meningar du byggt rätt när kategorin bara har meningar
function categoryProgress(category) {
  const words = categoryWords(category);
  if (words.length) return { done: knownWords(words).length, total: words.length, unit: "ord" };
  const sentences = categorySentences(category);
  const built = progress.builtSentences || {};
  return { done: sentences.filter(s => built[s.id]).length, total: sentences.length, unit: "meningar" };
}

// Ord du inte kan än kommer först. Ord du aldrig sett presenteras innan frågan.
function startTraining(words, sentences) {
  if (!progress.currentLesson && currentLesson()) progress.currentLesson = currentLesson();  // Nya ord får inte flytta din plats
  const picked = shuffle(words).sort((a, b) => knownWords([a]).length - knownWords([b]).length).slice(0, TRAIN_WORDS);
  const built = shuffle(sentences).filter(s => sentenceParts(s).length >= 2).slice(0, picked.length ? TRAIN_SENTENCES : TRAIN_WORDS);
  session = { review: picked, newWords: [], sentences: built, lesson: null, practice: true, trained: true };
  queue = picked.filter(w => !progress.words[w.id]).map(w => ({ type: "intro", word: w }));
  shuffle(picked).forEach(w => queue.push({ type: "quiz", word: w }));
  built.forEach(s => queue.push({ type: "build", sentence: s }));
  pos = 0;
  showTask();
}

function trainButton(title, icon, share, detail, start) {
  return h("button", { class: "train-btn", "aria-label": `${title}: ${detail}`, ...(start ? { onclick: start } : { disabled: "disabled" }) },
    h("span", { class: "train-ring" }, ringSvg(share), h("span", { class: "train-icon", "aria-hidden": "true" }, icon)),
    h("span", { class: "train-title" }, title),
    h("span", { class: "muted train-detail" }, detail));
}

function showTraining() {
  setNav("train");
  const hard = hardWords();
  const graded = WORDS.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade).length;
  const groups = [...new Set(CATEGORIES.map(c => c.group))];
  fillMain(
    h("div", { class: "section-title" }, "Svåra ord"),
    h("div", { class: "train-grid" }, trainButton("Svåra ord", "🌵", graded ? 1 - hard.length / graded : 0,
      `${hard.length} ord`, hard.length ? () => startTraining(hard, []) : null)),
    ...groups.map(group => [
      h("div", { class: "section-title" }, group),
      h("div", { class: "train-grid" }, CATEGORIES.filter(c => c.group === group).map(c => {
        const { done, total, unit } = categoryProgress(c);
        return trainButton(c.title, c.icon, total ? done / total : 0, `${done} av ${total} ${unit}`,
          total ? () => startTraining(categoryWords(c), categorySentences(c)) : null);
      }))]).flat());
}

// ---------- 10. Dashboard ----------
let chartDays = 7;  // Vald period i grafen: 7, 30 eller 91 dagar

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
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

// Ring som fylls till en viss andel, från 0 till 1
function ringSvg(share) {
  const radius = 42;
  const length = 2 * Math.PI * radius;
  const circle = (cls, stroke) => svgEl("circle", { class: cls, cx: 50, cy: 50, r: radius, ...(stroke ? { stroke } : {}) });
  const ring = svgEl("svg", { class: "ring-svg", viewBox: "0 0 100 100", "aria-hidden": "true" });
  ring.append(circle("ring-track"), circle("", "url(#ringDent)"));
  if (share) {
    // Färgen och ljuset ovanpå får samma längd, så att ringen ser ut som ett rör som fylls
    [circle("ring-value"), circle("", "url(#ringShine)")].forEach(part => {
      part.setAttribute("stroke-dasharray", `${share * length} ${length}`);
      ring.append(part);
    });
  }
  return ring;
}

// Cirkel som fylls i takt med hur mycket du gjort av ett totalt antal
function progressRing(known, total, label) {
  return h("div", { class: "ring", role: "img", "aria-label": `${label}: ${known} av ${total}` },
    h("div", { class: "ring-circle" }, ringSvg(known / total),
      h("div", { class: "ring-text" }, h("span", { class: "ring-num" }, String(known)), h("span", { class: "muted" }, `av ${total}`))),
    h("div", { class: "muted ring-label" }, label));
}

function progressSection() {
  const buckets = chartBuckets(chartDays);
  const withWords = buckets.filter(b => b.total);
  const ranges =[[7, "7 dagar"], [30, "30 dagar"], [91, "3 månader"]];
  return h("div", {},
    h("div", { class: "section-title" }, "Din utveckling"),
    h("div", { class: "ranges" }, ranges.map(([days, label]) =>
      h("button", { class: "range-btn" + (days === chartDays ? " active" : ""),
        onclick: () => { chartDays = days; showDashboard(); } }, label))),
    h("div", { class: "card chart-card" },
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
  const rings = h("div", { class: "rings" },
    progressRing(done.length, lessons.length, "Avklarade lektioner"),
    progressRing(knownWords().length, WORDS.length, "Ord du lärt dig"));

  const fileInput = h("input", { type: "file", accept: ".json", class: "hidden",
    onchange: e => { if (e.target.files[0]) importProgress(e.target.files[0]); } });

  // Allt packas i en div så att listor och null hanteras av h()
  main.replaceChildren(h("div", {},
    h("div", { class: "today" },
      h("div", { class: "today-title" }, "Dina framsteg"),
      h("div", { class: "muted today-streak" }, streakText())),
    rings,
    progressSection(),
    h("div", { class: "section-title" }, "Ditt ordförråd"),
    h("div", { class: "stats" }, groups.map(([label, cls, list]) =>
      h("button", { class: "stat " + cls, "aria-label": `${label}: ${list.length} ord. Visa orden.`, onclick: () => showWords(label, list) },
        h("span", { class: "stat-num" }, String(list.length)), label))),
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
  document.getElementById("navTrain").classList.toggle("active", active === "train");
  document.getElementById("navDash").classList.toggle("active", active === "dash");
  document.getElementById("navLevels").classList.toggle("active", active === "levels");
  updateHeader();
}

// Raden bredvid rubriken: din lektion, svit och ord du kan (senaste betyg Lätt eller Bra)
function updateHeader() {
  const lesson = currentLesson();
  const lessonBtn = document.getElementById("lessonCount");
  lessonBtn.textContent = `🦔 ${lesson || "✓"}`;
  lessonBtn.setAttribute("aria-label", lesson ? `Din lektion: ${lesson}. Visa mer.` : "Alla lektioner klara. Visa mer.");
  document.getElementById("streakCount").textContent = `🔥 ${streak()}`;
  document.getElementById("knownCount").textContent = `🍃 ${knownWords().length}`;
}

document.getElementById("navHome").addEventListener("click", () => showHome());
document.getElementById("navTrain").addEventListener("click", showTraining);
document.getElementById("navDash").addEventListener("click", showDashboard);
document.getElementById("navLevels").addEventListener("click", showLevelPicker);
document.getElementById("lessonCount").addEventListener("click", showLessonInfo);
document.getElementById("streakCount").addEventListener("click", showStreakInfo);
document.getElementById("knownCount").addEventListener("click", showKnownInfo);

// Läs in ord och meningar, visa sedan startsidan
Promise.all([
  fetch("data/words.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/sentences.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/grammar.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []),  // Appen fungerar utan
  fetch("data/categories.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []),
  fetch("data/audio.json", { cache: "no-cache" }).then(r => r.json()).catch(() => [])
]).then(([words, sentences, grammar, categories, audio]) => {
  AUDIO = new Set(audio);
  WORDS = words;
  SENTENCES = sentences;
  GRAMMAR = grammar;
  CATEGORIES = categories;
  seedGradeDays();
  showHome();
}).catch(() => {
  main.replaceChildren(h("div", { class: "card" },
    h("p", {}, "Kunde inte läsa ordlistan."),
    h("p", { class: "note" }, "Öppnade du index.html direkt från datorn? Appen behöver köras via en lokal server eller GitHub Pages. Be Claude Code: \"Starta en lokal server för appen\".")));
});
