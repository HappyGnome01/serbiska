// =====================================================================
// app.js – all logik för appen.
// Innehållet (ord och meningar) finns i data/. Framstegen sparas i webbläsaren.
// =====================================================================

// ---------- 1. Inställningar ----------
const MIN_REVIEWS = 3;            // Minsta antal repetitioner per pass
const MAX_REVIEWS = 15;           // Högsta antal repetitioner per pass
const WORDS_PER_REVIEW = 4;       // En extra repetition per så här många ord att befästa
const NEW_PER_SESSION = 5;        // Nya ord per pass
const NEW_WRITE_PER_SESSION = 3;  // Ord som går in i skrivövningen för första gången, per pass
const MAX_WRITE_PER_SESSION = 6;  // Högst så många skrivuppgifter per pass, räknas in i MAX_REVIEWS
const SENTENCES_PER_SESSION = 5;  // Meningar per pass
const TRAIN_WORDS = 8;            // Ord per träningspass
const TRAIN_SENTENCES = 3;        // Meningar per träningspass, utöver orden
const STORAGE_KEY = "serbiska-progress-v1";
const DAY = 24 * 60 * 60 * 1000;

let WORDS = [];       // Fylls från data/words.json
let SENTENCES = [];   // Fylls från data/sentences.json
let GRAMMAR = [];     // Fylls från data/grammar.json
let CATEGORIES = [];  // Fylls från data/categories.json
// Ord och meningar från onsdagslektionerna (data/tutor.json). De ligger utanför stigen och övas under Träna.
let TUTOR_WORDS = [];
let TUTOR_SENTENCES = [];
// Alla ord du kan lära dig: stigens ord plus de nya orden från onsdagslektionerna. Används i statistiken.
let ALL_WORDS = [];
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
// progress.writing[id] = { reps, interval, ease, due, lastGrade }, skrivövningens eget schema (saknas i äldre framsteg)
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

const VOICE_LANGS = ["sr", "bs", "hr"];

// Telefonen laddar sina röster i efterhand, så listan hämtas i förväg och igen när den ändras
function loadVoices() {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices();
}
if ("speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

function serbianVoice() {
  const voices = loadVoices();
  // Både "hr-HR" och "hr_HR" förekommer
  return VOICE_LANGS.map(code => voices.find(v => v.lang.toLowerCase().replace("_", "-").startsWith(code))).find(Boolean) || null;
}

function speak(id, text) {
  if (AUDIO.has(id)) {
    new Audio(`audio/${id}.mp3`).play().catch(() => {});
    return;
  }
  if (!("speechSynthesis" in window)) return showNoVoice([]);
  const voices = loadVoices();
  const voice = serbianVoice();
  // En tom lista betyder oftast att telefonen inte visar sina röster, inte att de saknas.
  // Då väljer telefonen själv en röst utifrån språket.
  if (!voice && voices.length) return showNoVoice(voices);
  // På iPhone kan ett avbrott precis före en ny uppläsning göra att den nya aldrig hörs
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;  // Sparas, annars kan webbläsaren slänga den innan den hörs
  if (voice) utterance.voice = voice;
  utterance.lang = voice ? voice.lang : "hr-HR";
  utterance.rate = 0.85;  // Lite långsammare än vanligt tal
  let started = false;
  utterance.onstart = () => { started = true; };
  utterance.onerror = e => { started = true; showSpeechProblem(voices, voice, e.error); };
  speechSynthesis.speak(utterance);
  // Hörs inget efter två sekunder visas vad telefonen gjorde, så att det går att felsöka
  setTimeout(() => { if (!started && !speechSynthesis.speaking) showSpeechProblem(voices, voice, "startade inte"); }, 2000);
}

let currentUtterance = null;

function showSpeechProblem(voices, voice, reason) {
  if (document.querySelector("dialog.modal")) return;
  const langs = [...new Set(voices.map(v => v.lang))].sort();
  const standalone = window.navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
  showModal("Inget ljud", [h("h2", {}, "Telefonen spelade inget ljud"),
    h("p", {}, "Kontrollera att ljudet inte är avstängt med knappen på sidan av telefonen och att volymen är uppe." +
      (standalone ? " Prova också att öppna appen i Safari i stället för från hemskärmen." : "")),
    h("div", { class: "modal-list" },
      [["Röst", voice ? `${voice.name} (${voice.lang})` : "ingen vald, telefonen fick välja för hr-HR"],
       ["Röster appen ser", voices.length ? `${voices.length}: ${langs.join(", ")}` : "inga"],
       ["Öppnad från", standalone ? "hemskärmen" : "webbläsaren"],
       ["Orsak", reason]].map(([label, value]) =>
        h("div", { class: "word-row" }, h("span", {}, label), h("span", { class: "muted" }, value))))]);
}

// Visar vilka språk telefonen har röster för, så att det går att se varför ingen passar
function showNoVoice(voices) {
  const langs = [...new Set(voices.map(v => v.lang))].sort();
  showModal("Inget ljud än", [h("h2", {}, "Inget ljud än"),
    h("p", {}, "Ljudfilen är inte skapad än, och appen hittar ingen serbisk, bosnisk eller kroatisk röst."),
    langs.length ? h("p", { class: "muted" }, `Röster på enheten: ${langs.join(", ")}`) : null]);
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
  applyGrade(p, quality);
  delete p.placed;                    // Ordet är nu övat, inte bara överhoppat
  progress.words[id] = p;
  progress.gradeDays[dateStr(new Date())] = countGrades();
  saveProgress();
}

// Skrivövningen har ett eget schema per ord, skilt från att känna igen ordet
function gradeWriting(id, quality) {
  progress.writing = progress.writing || {};
  const p = progress.writing[id] || newProgress();
  applyGrade(p, quality);
  progress.writing[id] = p;
  progress.gradeDays[dateStr(new Date())] = countGrades();  // Grafen visar ord du kan stava
  saveProgress();
}

// Räknar ut nästa repetition: kortare intervall vid svårt, längre vid lätt
function applyGrade(p, quality) {
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
}

const GRADE_KEYS = { 5: "easy", 4: "good", 3: "hard" };

// Ord per senaste betyg just nu. Ord du kan stava (Lätt eller Bra i skrivövningen) räknas som spelled
// och inte också som lätt, bra eller svårt, så att varje ord bara räknas en gång.
// Dagar sparade innan spelled fanns saknar fältet och räknas som 0.
function countGrades() {
  const counts = { spelled: 0, easy: 0, good: 0, hard: 0 };
  const writing = progress.writing || {};
  ALL_WORDS.forEach(w => {
    if (writing[w.id] && writing[w.id].lastGrade >= 4) { counts.spelled++; return; }
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
  ALL_WORDS.forEach(w => {
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

// Skrivuppgifter: först ord vars skrivschema säger att det är dags, sedan högst 3 ord som går in
// i skrivövningen för första gången. De ord du kan (Bra eller Lätt) tas i den ordning de står i lektionerna.
function writingWords(newWords) {
  const writing = progress.writing || {};
  const due = ALL_WORDS.filter(w => writing[w.id] && writing[w.id].due <= Date.now())
    .sort((a, b) => writing[a.id].due - writing[b.id].due);
  const starting = ALL_WORDS.filter(w => !writing[w.id] && !newWords.includes(w) &&
    progress.words[w.id] && progress.words[w.id].lastGrade >= 4).slice(0, NEW_WRITE_PER_SESSION);
  return [...due, ...starting].slice(0, MAX_WRITE_PER_SESSION);
}

function buildSession() {
  const lesson = currentLesson();
  const newWords = WORDS.filter(w => w.lesson === lesson).slice(0, NEW_PER_SESSION);
  const write = writingWords(newWords);

  // Ett ord som ska skrivas visas inte också från serbiska till svenska, då skulle svaret avslöjas.
  // Ord du senast gav Lätt repeteras inte här, bara i skrivövningen.
  const review = WORDS.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade !== 5 && !newWords.includes(w) && !write.includes(w))
    .sort((a, b) => {
      const [p, q] = [progress.words[a.id], progress.words[b.id]];
      return reviewRank(p) - reviewRank(q) || p.due - q.due;
    })
    .slice(0, Math.min(reviewCount(), MAX_REVIEWS - write.length));

  if (!lesson) {
    return { review, write, newWords: [], sentences: shuffle(SENTENCES).slice(0, SENTENCES_PER_SESSION), lesson: null };
  }
  const sentences = SENTENCES.filter(s => s.lesson === lesson).slice(0, SENTENCES_PER_SESSION);
  return { review, write, newWords, sentences, lesson, theme: newWords[0].theme };
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

// Nya ord testas i blandad ordning, men det ord du såg sist kommer inte först,
// annars testas bara korttidsminnet
function quizOrder(newWords) {
  const order = shuffle(newWords);
  const last = newWords[newWords.length - 1];
  if (order.length > 1 && order[0] === last) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

function startSession() {
  session = buildSession();
  queue = [];
  // Steg 1: repetera. Ord du gett Kan inte, Svår eller Bra repeteras i en mening där de finns med.
  const used = new Set(session.sentences.map(s => s.id));
  session.review.forEach(w => {
    const p = progress.words[w.id];
    const sentence = p && [1, 3, 4].includes(p.lastGrade) ? sentenceForWord(w, used) : null;
    if (sentence) { used.add(sentence.id); queue.push({ type: "inSentence", word: w, sentence }); }
    else queue.push({ type: "review", word: w });
  });
  shuffle(session.write).forEach(w => queue.push({ type: "write", word: w }));   //         ...och skriv ord du kan
  session.newWords.forEach(w => queue.push({ type: "intro", word: w }));         // Steg 2: nya ord
  quizOrder(session.newWords).forEach(w => queue.push({ type: "quiz", word: w })); //         ...och testa dem
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
    writing: JSON.stringify(progress.writing || {}),
    gradeDay: progress.gradeDays[today] ? { ...progress.gradeDays[today] } : null,
    built: { ...progress.builtSentences },
    queueLength: queue.length
  };
}

// Har du svarat på steget du står på visar Tillbaka samma steg utan svar. Annars förra steget.
let stepAnswered = false;

function answered() { stepAnswered = true; }

function back() {
  if (!stepAnswered) pos--;
  const s = snapshots[pos];
  const today = dateStr(new Date());
  progress.words = JSON.parse(s.words);
  if (s.gradeDay) progress.gradeDays[today] = s.gradeDay; else delete progress.gradeDays[today];
  progress.builtSentences = s.built;
  progress.writing = JSON.parse(s.writing);
  queue.length = s.queueLength;  // Tar bort omtaget som ett fel svar lade till
  saveProgress();
  showTask();
}

// Pilen ritas som bild, så att den står mitt i knappen oavsett typsnitt
const BACK_ARROW = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`;

// Tillbaka står först bland stegets knappar. afterAnswer = knappen visas efter ett svar, även på första steget.
function backButton(afterAnswer = false) {
  if (pos === 0 && !afterAnswer) return null;
  const button = h("button", { class: "back-btn", "aria-label": afterAnswer ? "Tillbaka till frågan" : "Tillbaka till förra övningen",
    title: "Tillbaka", onclick: back });
  button.innerHTML = BACK_ARROW;
  return button;
}

// Lägger tillbaka ett steg sist i kön (en gång) om du inte kunde det
function retryLater(task) {
  if (!task.retry) queue.push({ ...task, retry: true });
}

// Ett pass pågår tills det är klart eller avbrutet, även om du byter flik under tiden
let sessionActive = false;
let onExercise = false;  // Visas ett steg i passet just nu?

function showTask() {
  if (pos >= queue.length) { sessionActive = false; return showDone(); }
  sessionActive = true;
  const task = queue[pos];
  takeSnapshot();
  stepAnswered = false;
  if (task.type === "review") showReview(task);
  if (task.type === "inSentence") showInSentence(task);
  if (task.type === "intro") showIntro(task);
  if (task.type === "quiz") showQuiz(task);
  if (task.type === "read") showRead(task);
  if (task.type === "build") showBuild(task);
  if (task.type === "write") showWrite(task);
}

// Ram för varje steg: förloppsindikator + rubrik + innehåll
function screen(label, ...content) {
  setNav(session.trained ? "train" : "home");
  onExercise = true;
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
  // Svaret tar plats redan innan det visas, så att knapparna står still
  const answer = h("div", { class: "invisible" }, h("div", { class: "sv" }, w.sv), noteLine(w));
  const hint = h("p", { class: "muted center" }, "Hur väl kan du ordet?");
  const nextRow = h("div", { class: "buttons hidden" }, backButton(true), h("button", { class: "primary", onclick: next }, "Nästa"));
  const grades = gradeButtons(q => {
    gradeWord(w.id, q);
    if (q === 1) retryLater(task);
    answered();
    answer.classList.remove("invisible");
    nextRow.classList.remove("hidden");
    grades.classList.add("hidden");
    hint.classList.add("invisible");
  }, true, backButton());
  screen("Repetition", h("div", { class: "card" }, srBlock(w.sr, "", w.id), answer), hint, grades, nextRow);
}

// Ett ord du inte kunde eller tyckte var svårt, i en mening. Ordet är markerat.
// Du läser, visar översättningen och betygsätter sedan hur väl du kan ordet.
function showInSentence(task) {
  const { word: w, sentence: s } = task;
  const answer = h("div", { class: "invisible" }, h("div", { class: "sv" }, s.sv),
    h("p", { class: "note center" }, mixed(`Ordet: *${w.sr}* = ${w.sv}`)));
  const card = h("div", { class: "card sentence-card" },
    h("div", { class: "sr sentence" }, wordLinks(s, "", wordPositions(s, w))), h("div", { class: "cyr" }, toCyrillic(s.sr)),
    h("div", { class: "speak-row" }, speakButton(s.id, s.sr)), answer);
  const hint = h("p", { class: "muted center" }, "Förstår du meningen och det markerade ordet?");
  const grades = gradeButtons(q => {
    gradeWord(w.id, q);
    if (q === 1) retryLater(task);
    next();
  }, true, backButton(true));
  grades.classList.add("hidden");
  const showBtn = h("button", { class: "primary", onclick: () => {
    answered();
    card.classList.add("revealed");
    answer.classList.remove("invisible");
    hint.textContent = "Hur väl kan du ordet?";
    showRow.classList.add("hidden");
    grades.classList.remove("hidden");
  } }, "Visa översättning");
  const showRow = h("div", { class: "buttons" }, backButton(), showBtn);
  screen("Repetition i mening", card, hint, showRow, grades);
}

function showIntro(task) {
  const w = task.word;
  if (!progress.words[w.id]) { progress.words[w.id] = newProgress(); saveProgress(); }  // Markera som sett
  screen("Nytt ord",
    h("div", { class: "card" }, srBlock(w.sr, "", w.id), h("div", { class: "sv" }, w.sv), noteLine(w)),
    h("div", { class: "buttons" }, backButton(), h("button", { class: "primary", onclick: next }, "Nästa")));
}

// ---------- Skrivövningen: svenska till serbiska ----------
const SERBIAN_LETTERS = ["č", "ć", "š", "ž", "đ"];

// Jämförbar form: små bokstäver, utan skiljetecken och dubbla mellanslag
function normalizeAnswer(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

// Utan serbiska specialtecken, för den som skriver på ett svenskt tangentbord
function withoutDiacritics(text) {
  return text.replace(/đ/g, "dj").replace(/[čć]/g, "c").replace(/š/g, "s").replace(/ž/g, "z");
}

// Rätta svar: ordet, ord med samma svenska betydelse och former i noten som "Man: *umoran*"
function acceptedAnswers(w) {
  const sameMeaning = ALL_WORDS.filter(x => x.sv === w.sv).map(x => x.sr);
  const variants = [...(w.note || "").matchAll(/(?:Man|Kvinna|Till en kvinna|Även|Artigt(?: eller till flera)?):\s*\*([^*]+)\*/g)].map(m => m[1]);
  const ekavian = [...(w.note || "").matchAll(/Ekaviskt: \*([^*]+)\*/g)].map(m => m[1]);
  return { exact: [...sameMeaning, ...variants].map(normalizeAnswer), ekavian: ekavian.map(normalizeAnswer) };
}

// correct, diacritics (rätt men utan č ć š ž đ), ekavian, almost (en bokstav fel) eller wrong
function judgeWriting(input, w) {
  const answer = normalizeAnswer(input);
  const { exact, ekavian } = acceptedAnswers(w);
  if (exact.includes(answer)) return "correct";
  if (exact.map(withoutDiacritics).includes(withoutDiacritics(answer))) return "diacritics";
  if (ekavian.includes(answer) || ekavian.map(withoutDiacritics).includes(withoutDiacritics(answer))) return "ekavian";
  const plain = withoutDiacritics(answer);
  const close = exact.some(a => {
    const target = withoutDiacritics(a);
    return target.length >= 5 && Math.round((1 - spellingLikeness(plain, target)) * Math.max(plain.length, target.length)) === 1;
  });
  return close ? "almost" : "wrong";
}

function showWrite(task) {
  const w = task.word;
  const input = h("input", { type: "text", class: "write-input", autocomplete: "off", autocapitalize: "none", autocorrect: "off",
    spellcheck: "false", lang: "sr-Latn", enterkeyhint: "done", "aria-label": "Skriv ordet på serbiska" });
  const checkBtn = h("button", { class: "primary", disabled: "disabled", onclick: check }, "Kontrollera");
  const letters = h("div", { class: "letter-row" }, SERBIAN_LETTERS.map(letter =>
    h("button", { class: "letter-btn", "aria-label": `Skriv ${letter}`, onclick: () => insertLetter(letter) }, letter)));
  const checkRow = h("div", { class: "buttons" }, backButton(), checkBtn);
  const result = h("div");

  input.addEventListener("input", () => { checkBtn.disabled = !input.value.trim(); });
  input.addEventListener("keydown", e => { if (e.key === "Enter" && input.value.trim()) check(); });

  // Bokstaven hamnar där markören står, och fältet behåller fokus så att tangentbordet ligger kvar
  function insertLetter(letter) {
    const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + letter + input.value.slice(end);
    input.setSelectionRange(start + 1, start + 1);
    input.focus();
    checkBtn.disabled = false;
  }

  function check() {
    if (stepAnswered) return;
    answered();
    const verdict = judgeWriting(input.value, w);
    input.disabled = true;
    letters.classList.add("hidden");
    checkRow.classList.add("hidden");
    const messages = {
      correct: "Hur lätt var det?",
      diacritics: "Rätt, men det stavas med serbiska bokstäver. Hur lätt var det?",
      ekavian: "Rätt, men det är den ekaviska formen. I appen används den ijekaviska. Hur lätt var det?",
      almost: "Nästan! En bokstav blev fel. Det räknas som Svår.",
      wrong: "Inte riktigt – ordet kommer tillbaka strax."
    };
    const answerCard = h("div", { class: "card" }, srBlock(w.sr, "", w.id));
    if (verdict === "almost") gradeWriting(w.id, 3);
    if (verdict === "wrong") { gradeWriting(w.id, 1); retryLater(task); }
    const ok = verdict === "correct" || verdict === "diacritics" || verdict === "ekavian";
    // Fältet färgas som svaren i flervalsfrågan och får bock eller kryss
    input.classList.add(ok ? "correct" : "wrong");
    inputBox.append(optionMark(ok));
    result.replaceChildren(h("div", {},
      h("p", { class: "step-label center quiz-feedback" }, messages[verdict]),
      answerCard,
      ok ? gradeButtons(q => { gradeWriting(w.id, q); next(); }, false, backButton(true))
         : h("div", { class: "buttons" }, backButton(true), h("button", { class: "primary", onclick: next }, "Fortsätt"))));
  }

  const inputBox = h("div", { class: "mark-box" }, input);
  screen("Skriv på serbiska", h("div", { class: "card" }, h("div", { class: "sv write-prompt" }, w.sv)),
    inputBox, letters, checkRow, result);
  input.focus();
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

// Grön bock eller rött kryss på svaret du valde, i blank 3D-stil:
// skugga under, mörk kant, färgen med ljus ovanifrån och en vit glans upptill
function optionMark(ok) {
  const mark = h("span", { class: `option-mark ${ok ? "ok" : "bad"}`, role: "img", "aria-label": ok ? "Rätt" : "Fel" });
  const d = ok ? "M4.6 12.6l4.6 4.6L19.6 5.4" : "M6 6l12 12M18 6L6 18";
  const edge = ok ? "#257a20" : "#9c1e1d";
  mark.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="${d}" stroke="rgba(0,0,0,0.28)" stroke-width="5.6" transform="translate(0.4 1.6)"/>
    <path d="${d}" stroke="${edge}" stroke-width="5.6" transform="translate(0 0.8)"/>
    <path d="${d}" stroke="url(#${ok ? "markOk" : "markBad"})" stroke-width="5"/>
    <path d="${d}" stroke="#fff" stroke-opacity="0.45" stroke-width="1.4" transform="translate(-0.3 -1.2)"/>
  </svg>`;
  return mark;
}

function showQuiz(task) {
  const w = task.word;
  const options = shuffle([w, ...wrongOptionsFor(w)]);
  const after = h("div", {}, pos > 0 ? h("div", { class: "buttons" }, backButton()) : null);
  const buttons = options.map(o => h("button", { class: "option", onclick: () => choose(o) }, o.sv));

  function choose(o) {
    answered();
    buttons.forEach(b => b.disabled = true);
    buttons[options.indexOf(w)].classList.add("correct");
    const chosen = buttons[options.indexOf(o)];
    const ok = o.id === w.id;
    chosen.append(optionMark(ok));
    if (ok) {
      after.replaceChildren(h("p", { class: "step-label center quiz-feedback" }, "Hur lätt var det?"),
        gradeButtons(q => { gradeWord(w.id, q); next(); }, false, backButton(true)));
    } else {
      chosen.classList.add("wrong");
      gradeWord(w.id, 1);
      retryLater(task);
      after.replaceChildren(h("p", { class: "step-label center quiz-feedback" }, "Inte riktigt – ordet kommer tillbaka strax."),
        h("div", { class: "buttons" }, backButton(true), h("button", { class: "primary", onclick: next }, "Fortsätt")));
    }
  }
  screen("Vad betyder ordet?", h("div", { class: "card" }, srBlock(w.sr, "", w.id)), h("div", { class: "options" }, buttons), after);
}

function showRead(task) {
  const s = task.sentence;
  // Översättningen tar plats redan innan den visas och kortet har en fast minsta höjd,
  // så att Visa översättning och Nästa står på samma ställe
  const answer = h("div", { class: "invisible" }, h("div", { class: "sv" }, s.sv), noteLine(s));
  const nextBtn = h("button", { class: "primary hidden", onclick: next }, "Nästa");
  const backBtn = backButton(true);
  if (pos === 0) backBtn.classList.add("invisible");
  // Orden i meningen går att trycka på först när översättningen visas, annars avslöjar de svaret
  const card = h("div", { class: "card sentence-card" },
    h("div", { class: "sr sentence" }, wordLinks(s, "")), h("div", { class: "cyr" }, toCyrillic(s.sr)),
    h("div", { class: "speak-row" }, speakButton(s.id, s.sr)), answer);
  const showBtn = h("button", { class: "primary", onclick: () => {
    answered();
    card.classList.add("revealed");
    answer.classList.remove("invisible");
    backBtn.classList.remove("invisible");
    nextBtn.classList.remove("hidden");
    showBtn.classList.add("hidden");
  } }, "Visa översättning");
  screen("Läs och förstå", card,
    h("div", { class: "buttons" }, backBtn, showBtn, nextBtn));
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
    answered();
    answerRow.querySelectorAll("button").forEach(b => b.disabled = true);
    checkRow.classList.add("hidden");
    // Brickorna blir vanlig text, och hela rutan blir grön eller röd med bock eller kryss
    const written = parts.map((part, i) => part.before + slots[i].word + part.after).join(" ");
    answerRow.replaceChildren(h("span", { class: "built-text" }, written[0].toUpperCase() + written.slice(1)), optionMark(ok));
    answerRow.classList.add("built", ok ? "correct" : "wrong");
    poolRow.classList.add("hidden");  // Den tomma raden med brickor behövs inte längre
    // h() hoppar över null, därför packas allt i en div
    result.replaceChildren(h("div", {},
      ok ? null : h("p", { class: "step-label center quiz-feedback" }, "Nästan! Rätt ordning:"),
      ok ? null : h("div", { class: "card" }, srBlock(s.sr, "sentence", s.id)),
      h("div", { class: "buttons" }, backButton(true), h("button", { class: "primary", onclick: next }, "Nästa"))));
  }

  const checkRow = h("div", { class: "buttons" }, backButton(), checkBtn);
  draw();
  screen("Bygg meningen", h("div", { class: "card" }, h("div", { class: "sv" }, s.sv)),
    answerRow, poolRow, checkRow, result);
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
  const written = (session.write || []).length;
  const finishedLevel = addSession({ date: dateStr(new Date()), lesson: session.lesson,
    reviewed: session.review.length, newWords: session.newWords.length, written });
  if (session.lesson && !session.practice) progress.currentLesson = lessonAfter(session.lesson);
  saveProgress();
  updateHeader();
  main.replaceChildren(
    h("div", { class: "card" },
      h("div", { class: "big" }, session.level ? `Nivå ${session.level} repeterad! 🎉` : "Bra jobbat! 🎉"),
      h("p", {}, `Du repeterade ${session.review.length} ord, ` + (written ? `skrev ${written} på serbiska, ` : "") +
        `lärde dig ${session.newWords.length} nya och övade på ${session.sentences.length} meningar.`),
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
function knownWords(list = ALL_WORDS) {
  return list.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade >= 4);
}

// Ord du kan stava: senaste betyget i skrivövningen var Lätt eller Bra
function spelledWords(list = ALL_WORDS) {
  const writing = progress.writing || {};
  return list.filter(w => writing[w.id] && writing[w.id].lastGrade >= 4);
}

// Stigens mått: höjd i pixlar per rad, sidled i procent av bredden
const ROAD_ROW = 98;
const ROAD_CURRENT = 130;  // Din lektion får plats för startknappen om den hamnar under lektionen
const HOG_OFFSET = 44;     // Avstånd från mitten av din lektion till igelkotten
const HOG_WIDTH = 58;
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
  const blocks = rects(".road-start-btn, .hedgehog");
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

// Skog längs stigen: ett träd, en svamp, en buske eller en sten på andra sidan om lektionen, vid 1–2
// lektioner per nivå (se forestLessons). Valet beror på lektionsnumret, så skogen ser likadan ut varje gång.
// Figurerna är ritade i samma mjuka stil som igelkotten, med en skugga i stället för gräs.
// Lysmaskarna syns bara i mörkt läge. I ljust läge står figuren i "day" på deras plats.
const FOREST = ["gran", "kantarell", "flugsvamp", "lingon", { night: "lysmask", day: "gran" }, "sten",
  "bjorklov", "stubbe", "kotte", "kantarell", { night: "lysmask", day: "ormbunke" }, "ormbunke"];

// Marken under figuren: en skugga i ljust läge, en ljusare jordfläck i mörkt läge (färgen styrs i style.css)
const SHADOW = (cx, cy, rx, ry) => `<ellipse class="ground" cx="${cx}" cy="${cy}" rx="${rx + 2}" ry="${ry + 0.8}"/>`;

// Ett blad på ormbunken: en stjälk med småblad som blir mindre mot toppen
function fernFrond(transform, color) {
  const leaves = [[-4.5, -6, 4.6, 1.9, -22], [4.8, -7, 4.6, 1.9, 22], [-3.8, -12.5, 4, 1.7, -22], [4.4, -13.5, 4, 1.7, 22],
    [-3.6, -19, 3.3, 1.5, -22], [3.4, -20, 3.2, 1.5, 22], [-3.8, -24.5, 2.4, 1.3, -22], [1.6, -25.5, 2.3, 1.3, 22]]
    .map(([cx, cy, rx, ry, a]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${cx} ${cy})"/>`).join("");
  return `<g transform="${transform}"><path d="M0 0Q1 -14 -2 -30" stroke="#6f9a5e" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    `<g fill="${color}">${leaves}<ellipse cx="-2" cy="-29.5" rx="1.4" ry="2.2"/></g></g>`;
}

// Ett grönt björklöv, ritat runt punkten 0,0
const BIRCH_LEAF = `<path d="M-8 0C-6 -6 2 -7 8 0C2 7 -6 6 -8 0Z" fill="#8fb86a"/>` +
  `<path d="M-9.5 0L7 0" stroke="#5f8a55" stroke-width="1" stroke-linecap="round"/>` +
  `<path d="M-3 0L0 -3M1 0L4 -2.5M-3 0L0 3M1 0L4 2.5" stroke="#5f8a55" stroke-width=".7" stroke-linecap="round"/>`;

// Lövet i en grupp som rör sig. nr ger varje löv sin egen takt.
const leafSwaying = (leaf, nr) => `<g class="leaf leaf-${nr}">${leaf}</g>`;

// Varje figur: viewBox-bredd och -höjd, höjd i pixlar på stigen och själva teckningen
const FOREST_ART = {
  gran: { w: 48, h: 60, px: 46, svg: SHADOW(24, 57, 13, 2.5) +
    `<rect x="21.5" y="45" width="5" height="11" rx="2" fill="#7a5a45"/>` +
    `<g stroke-linejoin="round" stroke-width="4"><path d="M7 48L24 26L41 48Z" fill="#4f7a4a" stroke="#4f7a4a"/>` +
    `<path d="M11 37L24 16L37 37Z" fill="#5f8a55" stroke="#5f8a55"/><path d="M15 26L24 6L33 26Z" fill="#6f9a5e" stroke="#6f9a5e"/></g>` +
    `<g stroke="#9cc283" stroke-width="2" stroke-linecap="round" opacity=".75"><path d="M12 45L18 37.5"/><path d="M16 34L21 27"/><path d="M19.5 23L23 15"/></g>` },
  flugsvamp: { w: 48, h: 48, px: 32, svg: SHADOW(24, 45, 11, 2) +
    `<path d="M19 44Q18 32 21 28L27 28Q30 32 29 44Q24 46 19 44Z" fill="#efdccb"/>` +
    `<path d="M19.5 33Q24 35.5 28.5 33" stroke="#cdb59e" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `<path d="M6 29Q7 10 24 9Q41 10 42 29Q24 33 6 29Z" fill="#c8574a"/>` +
    `<path d="M11.5 21Q14 13.5 21 12" stroke="#e8a99d" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>` +
    `<g fill="#fff8ef"><circle cx="16" cy="22" r="2.2"/><circle cx="25" cy="16" r="2.6"/><circle cx="34" cy="22" r="2"/><circle cx="22" cy="26" r="1.5"/><circle cx="31" cy="14" r="1.4"/></g>` },
  kantarell: { w: 44, h: 40, px: 28, svg: SHADOW(22, 37, 14, 2) +
    `<path d="M15 36C15 29 11 23 6 19Q10 15 16 17Q20 14 24 17Q28 15 30 19C25 23 21 29 21 36Z" fill="#e3a743"/>` +
    `<path d="M9 19Q14 16.5 19 18" stroke="#f6cf7d" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
    `<path d="M27 36C27 31 25 28 22 26Q25 23 29 25Q32 23 35 26C32 28 31 31 31 36Z" fill="#d6963a"/>` },
  sten: { w: 52, h: 40, px: 28, svg: SHADOW(26, 37, 20, 2.5) +
    `<path d="M6 35L9 24L17 16L30 13L40 17L46 27L45 35Z" fill="#8a817a" stroke="#8a817a" stroke-width="2" stroke-linejoin="round"/>` +
    `<path d="M9 24L17 16L30 13L40 17L28 22Z" fill="#a79e96" stroke="#a79e96" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M40 17L46 27L45 35L34 35L28 22Z" fill="#746c66" stroke="#746c66" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M12 21Q15 16.5 18 16L30 13Q37 13.5 40.5 17.5Q36 17 33 19.5Q28 16 23 19Q18 17.5 15 21Q13.5 20.5 12 21Z" fill="#7fae5a"/>` +
    `<path d="M31 13.5V9" stroke="#5f8a55" stroke-width="1" stroke-linecap="round"/><circle cx="31" cy="8" r="1.8" fill="#eee4f3"/><circle cx="31" cy="8" r=".7" fill="#e3a743"/>` },
  stubbe: { w: 52, h: 52, px: 38, svg: SHADOW(26, 49, 20, 2.5) +
    `<path d="M11 47Q12 34 12 20L40 20Q40 34 41 47Q46 47 48 49L4 49Q6 47 11 47Z" fill="#8a6a52"/>` +
    `<path d="M16 26V41M37 25V37" stroke="#73563f" stroke-width="1.6" stroke-linecap="round"/>` +
    `<ellipse cx="26" cy="20" rx="14" ry="4.5" fill="#d6b894"/><ellipse cx="26" cy="20" rx="7.5" ry="2.3" stroke="#b8956f" stroke-width="1.2" fill="none"/>` +
    `<path d="M12 20Q16 16 22 18Q19 21 12 20Z" fill="#7fae5a"/><path d="M21 49V40Q26 33 31 40V49Z" fill="#5a4765"/>` +
    `<circle cx="29" cy="44.5" r=".9" fill="#e3a743"/><circle cx="34.5" cy="29" r="2.4" fill="#f2cb83"/>` },
  ormbunke: { w: 48, h: 44, px: 32, svg: SHADOW(24, 42, 12, 2) +
    `<g transform="translate(24 42)">${fernFrond("rotate(-40) scale(.8)", "#6f9a5e")}${fernFrond("scale(-.8 .8) rotate(-40)", "#6f9a5e")}${fernFrond("", "#9cc283")}</g>` },
  lingon: { w: 48, h: 34, px: 26, svg: SHADOW(24, 31, 15, 2) +
    `<g fill="#4f7a4a"><ellipse cx="14" cy="24" rx="7" ry="4.5" transform="rotate(-20 14 24)"/><ellipse cx="34" cy="24" rx="7" ry="4.5" transform="rotate(20 34 24)"/></g>` +
    `<g fill="#5f8a55"><ellipse cx="24" cy="19" rx="8" ry="5"/><ellipse cx="19" cy="27" rx="7" ry="4"/><ellipse cx="30" cy="27" rx="7" ry="4"/></g>` +
    `<g fill="#d0584b"><circle cx="17" cy="22" r="2.6"/><circle cx="22" cy="25.5" r="2.6"/><circle cx="30" cy="20.5" r="2.4"/><circle cx="34" cy="26" r="2.2"/><circle cx="27" cy="27" r="2.4"/></g>` +
    `<g fill="#fff" opacity=".7"><circle cx="16.2" cy="21.2" r=".8"/><circle cx="21.2" cy="24.7" r=".8"/><circle cx="29.3" cy="19.8" r=".7"/><circle cx="26.3" cy="26.2" r=".7"/></g>` },
  kotte: { w: 40, h: 30, px: 20, svg: SHADOW(20, 27.3, 12, 1.8) +
    `<g transform="translate(20 19) rotate(-78) translate(-16 -22)"><rect x="14.8" y="6" width="2.4" height="5" rx="1.2" fill="#6e4c35"/>` +
    `<ellipse cx="16" cy="22" rx="8" ry="12.5" fill="#9a6e4f"/><g stroke="#6e4c35" stroke-width="1.3" fill="none" stroke-linecap="round">` +
    `<path d="M10.5 14.5Q13.2 17 16 14.5Q18.8 17 21.5 14.5"/><path d="M8.5 20Q12.2 23 16 20Q19.8 23 23.5 20"/>` +
    `<path d="M8.6 26Q12.3 29 16 26Q19.7 29 23.4 26"/><path d="M11 31.5Q13.5 33.5 16 31.5Q18.5 33.5 21 31.5"/></g>` +
    `<path d="M21 13Q20 10.5 18 10" stroke="#c49a76" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>` },
  // Svävande björklöv: varje löv ligger i en egen grupp med klassen leaf, som style.css låter vagga lite
  bjorklov: { w: 40, h: 48, px: 36, svg: `<g transform="translate(14 18) rotate(-20)">${leafSwaying(BIRCH_LEAF, 1)}</g>` +
    `<g transform="translate(27 30) rotate(30) scale(.85)">${leafSwaying(BIRCH_LEAF, 2)}</g>` },
  // Tre lysmaskar som blinkar långsamt i var sin takt (animationen ligger i style.css)
  lysmask: { w: 40, h: 30, px: 26, svg: `<g fill="#f2cb83">` +
    `<g class="glow"><circle cx="10" cy="18" r="5" opacity=".22"/><circle cx="10" cy="18" r="1.8"/></g>` +
    `<g class="glow"><circle cx="27" cy="9" r="4.4" opacity=".22"/><circle cx="27" cy="9" r="1.5"/></g>` +
    `<g class="glow"><circle cx="32" cy="23" r="3.6" opacity=".22"/><circle cx="32" cy="23" r="1.2"/></g></g>` },
};

// En figur som SVG. scale gör den lite större eller mindre så att skogen inte ser likformig ut.
function forestSvg(name, scale, extraClass = "", style = "") {
  const art = FOREST_ART[name];
  const height = Math.round(art.px * scale);
  const width = Math.round(height * art.w / art.h);
  return `<svg class="forest-art ${extraClass}" viewBox="0 0 ${art.w} ${art.h}" width="${width}" height="${height}"` +
    `${style ? ` style="${style}"` : ""} aria-hidden="true">${art.svg}</svg>`;
}

// Lektionerna som får en figur, jämnt utspridda: nivåer med jämnt nummer får två (vid nivåns 2:a och 5:e
// lektion), udda nivåer en (vid 5:e lektionen). Inget direkt under nivårubriken, där det blir trångt.
// Är platsen din lektion eller nästa, där igelkotten och startknappen står, flyttas figuren en lektion.
const FOREST_SLOTS = { 1: [5], 2: [2, 5] };

// Svarar med lektion → figur. Figurerna tas i tur och ordning ur FOREST, så att alla kommer med lika ofta
// och samma figur aldrig står två gånger i rad. FOREST_START gör att stubben hamnar på nivå 11.
const FOREST_START = 4;

function forestLessons(current) {
  const chosen = new Map();
  const blocked = l => current && (l === current || l === current + 1);
  const levels = [...new Set(allLessons().map(lessonLevel))];
  levels.forEach(level => {
    const lessons = allLessons().filter(l => lessonLevel(l) === level);
    const slots = FOREST_SLOTS[level % 2 === 0 ? 2 : 1];
    slots.forEach(slot => {
      const index = Math.min(slot, lessons.length) - 1;  // Korta nivåer: sista lektionen
      const candidates = [index, index + 1, index - 1, index + 2].map(i => lessons[i])
        .filter(l => l && (l !== lessons[0] || lessons.length === 1) && !blocked(l) && !chosen.has(l));
      if (candidates.length) chosen.set(candidates[0], FOREST[(chosen.size + FOREST_START) % FOREST.length]);
    });
  });
  return chosen;
}

function forestDeco(lesson, x, center, pick) {
  const n = (lesson * 7919 + 13) % 97;
  const side = x < 50 ? 1 : -1;
  const decoX = Math.min(92, Math.max(8, x + side * (32 + n % 9)));
  const scale = 1 + n % 4 * 0.08;
  const deco = h("span", { class: "forest", "aria-hidden": "true", style: `left:${decoX}%;top:${center - 8 + n % 3 * 8}px` });
  // Löv och lysmaskar börjar röra sig olika långt in, så att de inte rör sig i takt med varandra
  const shift = `--anim-shift:-${n % 7 * 0.6}s`;
  deco.innerHTML = typeof pick === "string" ? forestSvg(pick, scale, "", shift)
    : forestSvg(pick.night, scale, "forest-night", shift) + forestSvg(pick.day, scale, "forest-day");
  return deco;
}

function roadmap(startLabel) {
  const current = currentLesson();
  const points = [];
  const items = [];
  let y = 0;
  let level = 0;
  let start = null;  // Startknappen och var den ska stå, när din lektion finns på stigen
  const forest = forestLessons(current);

  allLessons().forEach((lesson, i) => {
    if (lessonLevel(lesson) !== level) {
      level = lessonLevel(lesson);
      const thisLevel = level;
      items.push(h("div", { class: "road-level", "data-level": level, style: `top:${y}px`, role: "button", tabindex: "0",
        "aria-label": `Nivå ${level}. Repetera eller se översikt.`,
        onclick: () => showLevelChoice(thisLevel),
        onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showLevelChoice(thisLevel); } } }, `Nivå ${level}`));
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
      // Igelkotten och knappen får sina platser när bredden är känd, i placeStartButton
      const hedgehog = h("div", { class: "hedgehog", style: `top:${center - 23}px` });
      hedgehog.innerHTML = HEDGEHOG;
      const button = h("button", { class: "primary road-start-btn", onclick: startSession }, startLabel);
      items.push(hedgehog, button);
      start = { x, center, hedgehog, button, lesson };
    }
    if (forest.has(lesson)) items.push(forestDeco(lesson, x, center, forest.get(lesson)));
    y += status === "current" ? ROAD_CURRENT : ROAD_ROW;
  });

  // Tassavtryck: gången del fram till din lektion, resten dämpad
  const stop = current ? points.findIndex(p => p.lesson === current) : points.length - 1;
  const line = svgEl("svg", { class: "road-line", height: y, "aria-hidden": "true" });
  const road = h("div", { class: "road", style: `height:${y}px` }, line, items);
  // Alla lektioner på din nivå, eftersom stigen bara går mellan dem
  if (start) start.neighbours = points.filter(p => lessonLevel(p.lesson) === lessonLevel(start.lesson));

  // Avtrycken ritas när bredden är känd och om igen när den ändras
  let drawnWidth = 0;
  new ResizeObserver(() => {
    const width = road.clientWidth;
    if (!width || width === drawnWidth) return;
    drawnWidth = width;
    if (start) placeStartButton(road, start);  // Först, så att tassarna inte hamnar under knappen
    drawPaws(road, points, stop);
  }).observe(road);
  return road;
}

// Startknappen står snett under din lektion och igelkotten, utan att täcka stigen,
// lektionerna, igelkotten eller nivårubriken.
const START_ROAD_MARGIN = 16;  // Fritt avstånd mellan knappen och stigens mitt, så att tassarna syns
const START_GAP = 16;         // Önskat avstånd till lektionen och igelkotten, ungefär som till närmaste tass
const START_MAX_SHIFT = 160;   // Längst upp eller ner från din lektion som knappen får flyttas

function placeStartButton(road, { x, center, hedgehog, button, neighbours }) {
  const width = road.clientWidth;
  const w = button.offsetWidth, hgt = button.offsetHeight;
  const nodeX = x / 100 * width;
  // Igelkotten står på den sida där stigen inte fortsätter neråt, så att stigen inte går mellan
  // igelkotten och knappen under. Ryms den inte där får den stå på andra sidan.
  const nextPoint = neighbours.filter(p => p.y > center).sort((a, b) => a.y - b.y)[0];
  const preferRight = nextPoint ? nextPoint.x / 100 * width < nodeX : nodeX < width / 2;
  const fitsRight = nodeX + HOG_OFFSET + HOG_WIDTH <= width, fitsLeft = nodeX - HOG_OFFSET - HOG_WIDTH >= 0;
  const hogRight = preferRight ? fitsRight || !fitsLeft : !fitsLeft && fitsRight;
  hedgehog.style.left = `${hogRight ? nodeX + HOG_OFFSET : nodeX - HOG_OFFSET - HOG_WIDTH}px`;
  hedgehog.classList.toggle("flip", hogRight);  // Igelkotten tittar mot din lektion
  const onRight = hogRight;
  const side = onRight ? -1 : 1;  // Igelkotten till höger ger knappen till vänster, och tvärtom
  const box = road.getBoundingClientRect();
  const local = el => { const r = el.getBoundingClientRect(); return { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top }; };
  const blocked = [".node", ".hedgehog", ".road-level"].flatMap(sel => [...road.querySelectorAll(sel)].map(local));

  // Stigen förenklad till raka linjer mellan lektionerna på din nivå
  const path = neighbours.map(p => ({ x: p.x / 100 * width, y: p.y })).sort((a, b) => a.y - b.y);
  const pathX = y => {
    if (y <= path[0].y) return path[0].x;
    for (let i = 1; i < path.length; i++) {
      if (y <= path[i].y) return path[i - 1].x + (path[i].x - path[i - 1].x) * (y - path[i - 1].y) / (path[i].y - path[i - 1].y);
    }
    return path[path.length - 1].x;
  };
  const crossesRoad = (left, top) => {
    for (let y = top - START_ROAD_MARGIN; y <= top + hgt + START_ROAD_MARGIN; y += 2) {
      if (y < path[0].y - START_ROAD_MARGIN || y > path[path.length - 1].y + START_ROAD_MARGIN) continue;
      const px = pathX(Math.min(Math.max(y, path[0].y), path[path.length - 1].y));
      if (px > left - START_ROAD_MARGIN && px < left + w + START_ROAD_MARGIN) return true;
    }
    return false;
  };
  const free = (left, top) => left >= 0 && left + w <= width && top >= 0 &&
    !blocked.some(b => left < b.right + ROAD_GAP && left + w > b.left - ROAD_GAP && top < b.bottom + ROAD_GAP && top + hgt > b.top - ROAD_GAP) &&
    !crossesRoad(left, top);

  // Knappen står snett under din lektion och igelkotten, med ungefär samma avstånd till båda
  // som mellan en lektion och närmaste tassavtryck. Alla lediga platser provas och den
  // vars avstånd ligger närmast det väljs.
  const hogBox = local(hedgehog);
  const nodeBox = local(road.querySelector(".node.current"));
  const nodeR = (nodeBox.right - nodeBox.left) / 2;
  const cx = nodeBox.left + nodeR, cy = nodeBox.top + nodeR;
  const gapTo = (left, top, b) => Math.hypot(Math.max(b.left - left - w, 0, left - b.right), Math.max(b.top - top - hgt, 0, top - b.bottom));
  let best = null;
  for (let top = Math.round(cy); top <= cy + START_MAX_SHIFT; top += 2) {
    for (let left = 0; left + w <= width; left += 2) {
      const toNode = Math.hypot(Math.max(left - cx, 0, cx - left - w), Math.max(top - cy, 0, cy - top - hgt)) - nodeR;
      const toHog = gapTo(left, top, hogBox);
      const score = Math.abs(toNode - START_GAP) + Math.abs(toHog - START_GAP);
      if ((!best || score < best.score) && free(left, top)) best = { left, top, score };
    }
  }
  if (best && best.score <= START_GAP * 3) {
    button.style.left = `${best.left}px`;
    button.style.top = `${best.top}px`;
    return;
  }

  // Annars: överkanten under igelkotten och neråt tills knappen ryms. Igelkottens sida först, sedan den andra.
  const below = hogBox.bottom + ROAD_GAP;
  for (let dy = 0; dy <= START_MAX_SHIFT; dy += 8) {
    const top = below + dy;
    const px = pathX(top + hgt / 2);
    for (const s of [-side, side]) {
      // Nära stigen först, sedan längre ut åt samma håll
      for (let gap = START_ROAD_MARGIN; gap <= width; gap += 8) {
        const left = s < 0 ? px - gap - w : px + gap;
        if (left < 0 || left + w > width) break;
        if (free(left, top)) {
          button.style.left = `${left}px`;
          button.style.top = `${top}px`;
          return;
        }
      }
    }
  }
  // Ingen plats på den sidan: bredvid igelkotten, eller så nära den som går
  const hog = local(road.querySelector(".hedgehog"));
  const left = onRight ? hog.right + ROAD_GAP : hog.left - ROAD_GAP - w;
  button.style.left = `${Math.min(Math.max(left, 0), width - w)}px`;
  button.style.top = `${center - hgt / 2}px`;
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
      noteLine(w, "lesson-note")))),
    h("p", { class: "step-label" }, "Meningar"),
    h("div", { class: "lesson-list" }, sentences.map(s => h("div", { class: "lesson-item" },
      h("div", { class: "lesson-sr" }, wordLinks(s, "lesson-sentence"), speakButton(s.id, s.sr)),
      h("div", {}, s.sv),
      noteLine(s, "lesson-note")))));
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
    h("p", { class: "center muted" }, `Du har gjort alla ${allLessons().filter(l => lessonLevel(l) === level).length} lektioner på nivån.`)],
    [], "Nästa nivå", { onClose: () => showHome() });
}

// ---------- Fönstren för din lektion, sviten och orden du kan ----------
function showLessonInfo() {
  const lesson = currentLesson();
  const done = doneLessons();
  const total = allLessons().length;
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
  ], [["Visa på stigen", "good", () => showHome()]]);
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
    h("p", { class: "muted" }, "Varje dag med ett pass eller en repetition räknas. Sviten bryts om en hel dag går utan.")],
    [["Se framsteg", "good", showDashboard]]);
}

function showSpelledInfo() {
  const spelled = spelledWords();
  const writing = progress.writing || {};
  const practiced = ALL_WORDS.filter(w => writing[w.id]);
  const byGrade = g => practiced.filter(w => writing[w.id].lastGrade === g).length;
  showModal("Ord du kan stava", [
    h("h2", {}, `❤️ ${spelled.length} av ${ALL_WORDS.length} ord`),
    h("p", {}, "Du kan stava ett ord när du senast skrev det rätt och gav det Lätt eller Bra i skrivövningen."),
    h("div", { class: "modal-list" },
      [["Lätt", byGrade(5)], ["Bra", byGrade(4)], ["Svårt", byGrade(3)], ["Fel senast", byGrade(1)]].map(([label, count]) =>
        h("div", { class: "word-row" }, h("span", {}, label), h("span", { class: "muted" }, String(count))))),
    spelled.length ? h("h2", {}, "Orden") : null,
    spelled.length ? h("div", { class: "modal-list" }, spelled.map(w =>
      h("div", { class: "word-row" }, h("span", {}, h("em", {}, w.sr)), h("span", { class: "muted" }, w.sv)))) : null],
    [["Träna", "good", showTraining]]);
}

function showKnownInfo() {
  const known = knownWords();
  const byGrade = g => ALL_WORDS.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade === g);
  const due = ALL_WORDS.filter(w => progress.words[w.id] && progress.words[w.id].due <= Date.now()).length;
  showModal("Ord du kan", [
    h("h2", {}, `🍃 ${known.length} av ${ALL_WORDS.length} ord`),
    h("p", {}, "Du kan ett ord när du senast gav det Lätt eller Bra."),
    h("div", { class: "modal-list" },
      [["Lätt", byGrade(5).length], ["Bra", byGrade(4).length], ["Svårt", byGrade(3).length], ["Att repetera nu", due]].map(([label, count]) =>
        h("div", { class: "word-row" }, h("span", {}, label), h("span", { class: "muted" }, String(count))))),
    known.length ? h("h2", {}, "Orden") : null,
    known.length ? h("div", { class: "modal-list" }, known.map(w =>
      h("div", { class: "word-row" }, h("span", {}, h("em", {}, w.sr)), h("span", { class: "muted" }, w.sv)))) : null],
    [["Träna", "good", showTraining]]);
}

// ---------- Grammatikfönster ----------
// Text som blandar svenska och serbiska: *serbiska* blir kursivt
function mixed(text) {
  return text.split("*").map((part, i) => i % 2 ? h("em", {}, part) : part);
}

// Förklaringarna som gäller just de här orden och meningarna (fältet grammar), i den ordning de står där
function grammarFor(items) {
  const ids = [...new Set(items.flatMap(item => item.grammar || []))];
  return ids.map(id => GRAMMAR.find(g => g.id === id)).filter(Boolean);
}

// Tipset med glödlampan, som vanlig text. Grammatiken nås genom att trycka på orden i meningarna.
function noteLine(item, extraClass = "") {
  if (!item.note) return null;
  return h("div", { class: `note ${extraClass}` }, mixed("💡 " + item.note));
}

// Modulfönster som stängs med knappen, Esc eller ett tryck utanför
// actions = knappar som står bredvid Stäng, lika stora: [[text, klass, funktion]]. De stänger fönstret först.
// opts.stacked = knapparna under varandra och ett litet kryss uppe till höger i stället för Stäng.
// opts.onClose körs när du trycker på Stäng-knappen (den kan heta något annat, t.ex. Nästa nivå).
function showModal(label, content, actions = [], closeLabel = "Stäng", opts = {}) {
  const closeDialog = () => { if (dialog.open) dialog.close(); dialog.remove(); };
  const actionButtons = actions.map(([text, cls, action]) => h("button", { class: cls, onclick: () => { closeDialog(); action(); } }, text));
  const footer = opts.stacked
    ? h("div", { class: "modal-stack" }, actionButtons)
    : h("div", { class: "buttons modal-close" + (actions.length ? " modal-actions" : "") },
        actionButtons, h("button", { class: "primary", onclick: () => { closeDialog(); if (opts.onClose) opts.onClose(); } }, closeLabel));
  // Krysset ritas som bild, så att det står mitt i knappen oavsett typsnitt
  const cross = opts.stacked ? h("button", { class: "modal-x", "aria-label": "Stäng", onclick: closeDialog }) : null;
  if (cross) cross.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  const dialog = h("dialog", { class: "modal" + (opts.stacked ? " modal-small" : ""), "aria-label": label },
    cross, h("div", { class: "modal-body" }, content, footer));
  dialog.addEventListener("close", () => dialog.remove());  // Esc-tangenten
  dialog.addEventListener("click", e => { if (e.target === dialog) closeDialog(); });  // Tryck utanför stänger
  document.body.append(dialog);
  dialog.showModal();
}

// ---------- Grammatik per ord ----------
// Meningar kan ha fältet parts: delar av meningen med betydelse, grundform, tips och grammatik.
// Ord som inte finns i parts slås upp i ordlistan. Ord som saknas båda ställena går inte att trycka på.
const bareWord = text => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Meningen som ord och skiljetecken, där varje ord har sin del (eller null)
function sentenceTokens(s) {
  const tokens = s.sr.split(" ").map(token => {
    const [, before, word, after] = token.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
    return { before, word, after, part: null };
  });
  let from = 0;
  for (const part of s.parts || []) {
    const words = part.sr.split(" ").map(bareWord);
    for (let i = from; i + words.length <= tokens.length; i++) {
      if (words.every((w, k) => bareWord(tokens[i + k].word) === w && !tokens[i + k].part)) {
        words.forEach((_, k) => { tokens[i + k].part = part; tokens[i + k].first = k === 0; tokens[i + k].size = words.length; });
        from = i + words.length;
        break;
      }
    }
  }
  tokens.forEach(t => {
    if (t.part) return;
    const w = WORDS.find(x => bareWord(x.sr) === bareWord(t.word));
    if (w) { t.part = { sr: w.sr, sv: w.sv, note: w.note, grammar: w.grammar }; t.first = true; t.size = 1; }
  });
  return tokens;
}

// Meningen med ord att trycka på. Ord som hör ihop (som "je prošao") blir en knapp.
// Var ordet står i meningen: samma stavning, eller en böjd form vars grundform är ordet (kafu → kafa)
function wordPositions(s, w) {
  const target = w.sr.split(" ").map(bareWord).filter(Boolean);
  const joined = target.join(" ");
  const tokens = sentenceTokens(s);
  const hits = new Set();
  tokens.forEach((t, i) => {
    const base = t.part && t.part.base ? t.part.base.split(" ").map(bareWord).join(" ") : null;
    if (base === joined) hits.add(i);
    if (target.every((x, k) => tokens[i + k] && bareWord(tokens[i + k].word) === x)) target.forEach((_, k) => hits.add(i + k));
  });
  return hits;
}

// En mening att repetera ordet i, bland lektioner du kommit till. Meningar som redan används i passet undviks.
function sentenceForWord(w, used) {
  const reached = Math.max(currentLesson() || Infinity, w.lesson);
  const candidates = SENTENCES.filter(s => s.lesson <= reached && wordPositions(s, w).size > 0);
  const fresh = candidates.filter(s => !used.has(s.id));
  const pool = fresh.length ? fresh : candidates;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// targets = ordens platser i meningen som ska markeras (ordet du repeterar)
function wordLinks(s, className, targets = new Set()) {
  const tokens = sentenceTokens(s);
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0) out.push(" ");
    out.push(t.before);
    if (!t.part) { out.push(targets.has(i) ? h("span", { class: "target-word" }, t.word) : t.word, t.after); continue; }
    // En del som består av flera ord: orden emellan hör till samma knapp
    const group = tokens.slice(i, i + t.size);
    const label = group.map((g, k) => (k ? g.before : "") + g.word + (k < group.length - 1 ? g.after + " " : "")).join("");
    const part = t.part;
    const isTarget = group.some((_, k) => targets.has(i + k));
    out.push(h("button", { class: "word-link" + (isTarget ? " target-word" : ""), "aria-label": `${label}: förklara`,
      onclick: e => { e.stopPropagation(); showPart(label, part); } }, label));
    out.push(group[group.length - 1].after);
    i += t.size - 1;
  }
  return h("span", { class: className }, out);
}

// Fönstret för en del av meningen: betydelse, grundform, tips och de grammatikregler som gäller
function showPart(label, part) {
  showModal(`Förklaring: ${label}`, [
    h("div", { class: "part-head" },
      h("div", { class: "part-sr" }, label),
      h("div", { class: "muted" }, toCyrillic(label))),
    part.sv ? h("p", { class: "part-sv" }, part.sv) : null,
    ...(partFacts(label, part) || []),
    part.note ? h("p", { class: "note" }, mixed("💡 " + part.note)) : null,
    part.check ? h("p", { class: "muted" }, "Ej granskad av en som har serbiska som modersmål.") : null,
    ...grammarFor([part]).map(grammarSection)]);
}

// Form, grundform och genus som en liten tabell. Oböjliga ord har ingen grundform att visa.
const GENDER_TEXT = { m: "maskulinum (manligt)", f: "femininum (kvinnligt)", n: "neutrum" };

// Kasus med vardagliga namn och när de används. Fackordet visas inom parentes för den som vill veta.
const CASE_TEXT = {
  nominativ: ["grundform", "för den som gör något, eller det man pratar om"],
  ackusativ: ["objektform", "för det man har, vill ha, ser eller gör något med, och efter *u* och *na* när det gäller vart"],
  genitiv: ["av-form", "efter *od*, *iz*, *bez*, siffror och *koliko*, och när något är en del av något (ett glas vatten)"],
  dativ: ["till-form", "för den man ger, säger eller gör något till eller för"],
  lokativ: ["plats-form", "efter *u*, *na* och *o* när det gäller var något är eller vad man pratar om"],
  instrumental: ["med-form", "efter *sa* (med) och för det man gör något med"],
  vokativ: ["tilltalsform", "när man ropar på eller tilltalar någon"]
};
const VERB_TEXT = [["presens", "nutid"], ["imperativ", "uppmaning"], ["infinitiv", "att-form, verbets grundform"], ["oböjligt", "ändras aldrig"]];

// "nominativ singular" → ["grundform, en", "Används för den som gör något … (nominativ singular)"]
function plainForm(form) {
  const kasus = Object.keys(CASE_TEXT).find(c => form.startsWith(c));
  if (kasus) {
    const [name, use] = CASE_TEXT[kasus];
    const rest = form.slice(kasus.length).replace(" singular", ", en").replace(" plural", ", flera").replace(/^,\s*/, ", ");
    return [name + rest, `Används ${use}. Fackord: ${form}.`];
  }
  let text = form;
  VERB_TEXT.forEach(([word, plain]) => { text = text.replace(word, plain); });
  return [text, null];
}

function partFacts(label, part) {
  const rows = [];
  let use = null;
  if (part.form) {
    const [text, explanation] = plainForm(part.form);
    rows.push(["Form", text]);
    use = explanation;
  }
  if (part.form !== "oböjligt" && (part.base || part.form)) rows.push(["Ordboksform", h("em", {}, part.base || label.toLowerCase())]);
  if (part.gender) rows.push(["Genus", GENDER_TEXT[part.gender]]);
  if (!rows.length) return null;
  return [h("div", { class: "modal-list part-facts" }, rows.map(([key, value]) =>
      h("div", { class: "word-row" }, h("span", { class: "muted" }, key), h("span", {}, value)))),
    use ? h("p", { class: "muted part-use" }, mixed(use)) : null];
}

function grammarSection(g) {
  return h("section", {},
    h("h2", {}, mixed(g.title)),
    g.text.map(t => h("p", {}, mixed(t))),
    h("div", { class: "modal-list" }, g.examples.map(([sr, sv]) =>
      h("div", { class: "word-row" }, h("span", {}, h("em", {}, sr)), h("span", { class: "muted" }, mixed(sv))))));
}

function showGrammar(items) {
  showModal("Grammatik", grammarFor(items).map(grammarSection));
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
      onclick: () => showLevelOverview(level), "aria-label": `Nivå ${level}${finished ? ", klar" : ""}${here ? ", du är här" : ""}. Visa lektionerna.` },
      h("div", { class: "level-title" }, `Nivå ${level}` + (here ? " · du är här" : "")),
      h("div", { class: "muted level-themes" }, themes.slice(0, 4).join(", ")),
      h("div", { class: "progress", role: "img", "aria-label": `${done} av ${lessons.length} lektioner klara` },
        h("div", { class: "bar", style: `width:${done / lessons.length * 100}%` })));
  });
  setNav("levels");
  const allDone = doneLessons().length, total = allLessons().length;
  main.replaceChildren(
    // Hur många lektioner du gjort av alla, utan text
    h("div", { class: "progress total-progress", role: "img", "aria-label": `${allDone} av ${total} lektioner klara` },
      h("div", { class: "bar", style: `width:${allDone / total * 100}%` })),
    h("p", { class: "step-label center" }, "Navigering"),
    h("div", { class: "options" }, rows));
}

// Visar en nivå på stigen. Din plats ändras inte.
function showLevel(level) {
  showHome();
  main.querySelector(`[data-level="${level}"]`).scrollIntoView();
}

const LESSON_MARK = { done: "✓", current: "🦔", skipped: "↷", next: "" };

// Fönster med nivåns lektioner och orden i varje. Ett tryck visar lektionen på stigen.
function showLevelOverview(level) {
  const lessons = allLessons().filter(l => lessonLevel(l) === level);
  const items = lessons.map(lesson => {
    const status = lessonStatus(lesson);
    const words = WORDS.filter(w => w.lesson === lesson).map(w => w.sr).join(", ");
    return h("button", { class: "level-lesson", "aria-label": `Lektion ${lesson}, ${lessonTheme(lesson)}, ${STATUS_TEXT[status]}. Visa på stigen.`,
      onclick: e => { e.currentTarget.closest("dialog").close(); showHome(lesson); } },
      h("span", { class: "level-lesson-head" },
        h("span", {}, `Lektion ${lesson} · ${lessonTheme(lesson)}`),
        h("span", { class: "level-lesson-mark", "aria-hidden": "true" }, LESSON_MARK[status])),
      h("span", { class: "muted level-lesson-words" }, h("em", {}, words)));
  });
  showModal(`Nivå ${level}`, [
    h("h2", {}, `Nivå ${level}`),
    h("p", { class: "muted" }, "Tryck på en lektion för att se den på stigen."),
    h("div", { class: "level-lessons" }, items)]);
}

// Tryck på nivårubriken på stigen: repetera förra nivån eller se nivåns lektioner
function showLevelChoice(level) {
  const actions = [["Visa översikt för nivån", "primary", () => showLevelOverview(level)]];
  if (level > 1) actions.push(["Repetera föregående nivå", "", () => startLevelReview(level - 1)]);
  showModal(`Nivå ${level}`, h("h2", { class: "center" }, `Nivå ${level}`), actions, "", { stacked: true });
}

// Repetition av en hel nivå: ord du tycker är svåra, meningar att bygga och ord att skriva.
// Din plats på stigen ändras inte.
const LEVEL_HARD_MAX = 8;
const LEVEL_BUILD = 5;
const LEVEL_WRITE = 5;

function startLevelReview(level) {
  const words = WORDS.filter(w => lessonLevel(w.lesson) === level);
  const sentences = SENTENCES.filter(s => lessonLevel(s.lesson) === level);
  const grade = w => progress.words[w.id] && progress.words[w.id].lastGrade;
  const hard = shuffle(words.filter(w => [1, 3].includes(grade(w)))).slice(0, LEVEL_HARD_MAX);
  // Ord att skriva tas helst bland ord du sett, men inte bland de svåra som just visats med svaret
  const rest = shuffle(words.filter(w => !hard.includes(w)));
  const seen = rest.filter(w => progress.words[w.id]);
  const write = (seen.length >= LEVEL_WRITE ? seen : rest).slice(0, LEVEL_WRITE);
  const built = shuffle(sentences).filter(s => sentenceParts(s).length >= 2).slice(0, LEVEL_BUILD);

  session = { review: hard, write, newWords: [], sentences: built, lesson: null, practice: true, level };
  queue = hard.map(w => ({ type: "review", word: w }));           // 1. Ord du gett Svår eller Kan inte
  built.forEach(s => queue.push({ type: "build", sentence: s })); // 2. Bygg meningar
  write.forEach(w => queue.push({ type: "write", word: w }));     // 3. Skriv ord
  pos = 0;
  showTask();
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
  return ALL_WORDS.filter(w => progress.words[w.id] && [1, 3].includes(progress.words[w.id].lastGrade));
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

// Skriv ord: ord du förstår (Lätt eller Bra) men inte redan gett Lätt i skrivövningen.
// Ord du aldrig skrivit kommer först, sedan ord där skrivschemat säger att det är dags, sist övriga.
function writingPracticeWords() {
  const writing = progress.writing || {};
  const rank = w => !writing[w.id] ? 0 : writing[w.id].due <= Date.now() ? 1 : 2;
  return shuffle(knownWords().filter(w => !(writing[w.id] && writing[w.id].lastGrade === 5)))
    .sort((a, b) => rank(a) - rank(b));
}

// Ett pass med bara skrivuppgifter. Betygen sparas i skrivschemat och räknas i aktivt ordförråd.
function startWritingTraining(words) {
  const picked = words.slice(0, TRAIN_WORDS);
  session = { review: [], write: picked, newWords: [], sentences: [], lesson: null, practice: true, trained: true };
  queue = picked.map(w => ({ type: "write", word: w }));
  pos = 0;
  showTask();
}

function showTraining() {
  setNav("train");
  const hard = hardWords();
  const graded = ALL_WORDS.filter(w => progress.words[w.id] && progress.words[w.id].lastGrade).length;
  const groups = [...new Set(CATEGORIES.map(c => c.group))];
  const tutorKnown = knownWords(TUTOR_WORDS).length;
  const tutorTotal = TUTOR_WORDS.length || TUTOR_SENTENCES.length;
  const known = knownWords();
  const toWrite = writingPracticeWords();
  fillMain(
    h("div", { class: "section-title" }, "Extralektioner"),
    h("div", { class: "train-grid" },
      trainButton("Svåra ord", "🌵", graded ? 1 - hard.length / graded : 0,
        `${hard.length} ord`, hard.length ? () => startTraining(hard, []) : null),
      trainButton("Lektioner", "🎓", TUTOR_WORDS.length ? tutorKnown / TUTOR_WORDS.length : 0,
        TUTOR_WORDS.length ? `${tutorKnown} av ${TUTOR_WORDS.length} ord`
          : TUTOR_SENTENCES.length ? `${TUTOR_SENTENCES.length} meningar` : "Inga ord än",
        tutorTotal ? () => startTraining(TUTOR_WORDS, TUTOR_SENTENCES) : null),
      trainButton("Skriv ord", "✏️", known.length ? spelledWords(known).length / known.length : 0,
        `${toWrite.length} ord`, toWrite.length ? () => startWritingTraining(toWrite) : null)),
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
    const grades = { spelled: 0, ...gradesOn(dateStr(daysAgo(ago))) };  // Veckans stapel visar läget när veckan slutade
    buckets.push({ ...grades, total: grades.spelled + grades.easy + grades.good + grades.hard, label, title: step > 1 ? `Veckan från ${title}` : title });
  }
  return buckets;
}

// Avrundar uppåt till ett jämnt tal, så att mittlinjen i grafen blir ett heltal
function niceMax(value) {
  const scale = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return [2, 4, 6, 8, 10].map(n => n * scale).find(n => n >= value) || scale * 2;
}

// Texten för en stapel: kan stava, lätt, bra och svårt
const bucketText = b => `${b.spelled} kan stava, ${b.easy} lätt, ${b.good} bra, ${b.hard} svårt`;

function chartColumn(bucket, tip) {
  const text = `${bucket.title}: ${bucketText(bucket)}`;
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
    // Först i listan hamnar underst: kan stava längst ner
    ["spelled", "easy", "good", "hard"].map(key => bucket[key]
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
      h("span", {}, h("i", { class: "swatch spelled" }), "Kan stava"),
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
        h("span", {}, b.title), h("span", { class: "muted" }, bucketText(b))))) : null);
}

function showDashboard() {
  setNav("dash");
  // Dagens stapel räknas om, så att den stämmer även om du inte gett något betyg sedan grafen fick Kan stava
  const today = dateStr(new Date()), now = countGrades();
  if (JSON.stringify(gradesOn(today)) !== JSON.stringify(now)) { progress.gradeDays[today] = now; saveProgress(); }
  const seen = ALL_WORDS.filter(w => progress.words[w.id]);
  const byGrade = g => seen.filter(w => progress.words[w.id].lastGrade === g);
  // Den lila först: hur många ord du kan stava (samma som ❤️). Sedan hur väl du förstår orden.
  const groups = [["Kan stava", "spelled", spelledWords()],
    ["Lätt", "easy", byGrade(5)], ["Bra", "good", byGrade(4)], ["Svårt", "hard", byGrade(3)]];
  const rings = h("div", { class: "rings" },
    progressRing(spelledWords().length, ALL_WORDS.length, "Aktivt ordförråd"),
    progressRing(knownWords().length, ALL_WORDS.length, "Passivt ordförråd"));

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
  onExercise = false;
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
  document.getElementById("spelledCount").textContent = `❤️ ${spelledWords().length}`;
}

// Idag: tillbaka till passet om ett pågår. Står du redan i passet frågar appen om du vill avbryta.
function goHome() {
  if (!sessionActive) return showHome();
  if (onExercise) {
    return showModal("Avbryta övningen?", h("p", { class: "big center" }, "Vill du avbryta övningen?"),
      [["Ja, avbryt", "", () => { sessionActive = false; showHome(); }]], "Nej");
  }
  resumeSession();
}

// Visar steget du lämnade. Hade du svarat ångras svaret, så att steget visas som nytt.
function resumeSession() {
  if (stepAnswered) back(); else showTask();
}

document.getElementById("navHome").addEventListener("click", goHome);
document.getElementById("navTrain").addEventListener("click", showTraining);
document.getElementById("navDash").addEventListener("click", showDashboard);
document.getElementById("navLevels").addEventListener("click", showLevelPicker);
document.getElementById("lessonCount").addEventListener("click", showLessonInfo);
document.getElementById("streakCount").addEventListener("click", showStreakInfo);
document.getElementById("knownCount").addEventListener("click", showKnownInfo);
document.getElementById("spelledCount").addEventListener("click", showSpelledInfo);
document.getElementById("themeBtn").addEventListener("click", showThemeChoice);

// Ljust eller mörkt läge. Sparas i en egen nyckel, skild från framstegen. "auto" följer telefonen.
const THEME_KEY = "serbiska-theme";

function currentTheme() {
  try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; }
}

function applyTheme(theme) {
  if (theme === "auto") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try { theme === "auto" ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  // Färgen på telefonens statusrad följer bakgrunden
  const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  document.querySelector('meta[name="theme-color"]').setAttribute("content", bg);
}

function showThemeChoice() {
  const theme = currentTheme();
  const options = [["light", "☀️ Ljust läge"], ["dark", "🌙 Mörkt läge"], ["auto", "📱 Som telefonen"]];
  // Valt läge är grönt, de andra grå
  showModal("Välj läge", h("h2", { class: "center" }, "Utseende"),
    options.map(([value, text]) => [text, value === theme ? "good" : "", () => applyTheme(value)]),
    "", { stacked: true });
}
applyTheme(currentTheme());

// Läs in ord och meningar, visa sedan startsidan
Promise.all([
  fetch("data/words.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/sentences.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("data/grammar.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []),  // Appen fungerar utan
  fetch("data/categories.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []),
  fetch("data/audio.json", { cache: "no-cache" }).then(r => r.json()).catch(() => []),
  fetch("data/tutor.json", { cache: "no-cache" }).then(r => r.json()).catch(() => ({}))
]).then(([words, sentences, grammar, categories, audio, tutor]) => {
  AUDIO = new Set(audio);
  WORDS = words;
  // refs pekar på ord som redan finns i appen, så att de delar betyg och inte blir dubbletter
  TUTOR_WORDS = [...(tutor.refs || []).map(id => words.find(w => w.id === id)).filter(Boolean), ...(tutor.words || [])];
  TUTOR_SENTENCES = tutor.sentences || [];
  ALL_WORDS = [...words, ...(tutor.words || [])];
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
