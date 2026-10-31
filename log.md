# Logg

Append-only. Nyaste sist.

## [2026-10-31] setup | Första prototypen
- `flashcards.html`: enkel flashcard-app med SM-2, 20 ord, framsteg i localStorage.
- Knappen "Igen" bytte namn till "Kunde inte". Nya ord läggs till utan att framsteg nollställs.

## [2026-10-31] setup | Projektstruktur och version 1
- Skapade `CLAUDE.md`, `specs.md`, `process.md`, `log.md`.
- JSON-databas: `data/words.json` och `data/sentences.json`, 10 lektioner, 50 ord, 50 meningar, ijekavisk A1.
- Appen: `index.html`, `style.css`, `app.js`. Dagens pass (3 repetitioner, 5 nya ord, 5 meningar) och dashboard med export/import.
- Wiki enligt LLM Wiki-mönstret: `wiki/index.md` och första sidorna. `raw/` för privata anteckningar.
- Beslut: ijekavisk variant, latin + kyrilliska, GitHub Pages från publikt repo.

## [2026-10-31] fix | Test före leverans
- Automatiskt test av två hela pass och dashboarden.
- Rättat: "null" visades efter rätt byggd mening, och dashboarden kunde inte ritas (listor skickades direkt till sidan).
- "Bygg meningen" gäller nu meningar med minst 2 ord, så att alla lektioner får övningen.
- "1 dagar i rad" → "1 dag i rad".

## [2026-10-31] setup | Lokal testserver
- Datorn saknar Python och Node, så `.claude/serve.ps1` serverar appen med PowerShell på http://localhost:8000/.
- `.claude/launch.json` gör att Claude Code kan starta servern och öppna appen i sin webbläsarpanel.

## [2026-10-31] setup | Städning
- Tog bort `flashcards.html` (första prototypen, ersatt av `index.html` + `app.js`).

## [2026-10-31] setup | Överlämning till Claude Code
Status: version 1 klar och testad automatiskt, men inte testad i en riktig webbläsare än. Inte publicerad.
Nästa steg:
1. Starta en lokal server och låt användaren testa ett pass i webbläsaren.
2. Publicera på GitHub Pages. Användaren skapar GitHub-konto. Plan: Git for Windows installerat, Claude Code gör `git init`, commit och push. Repot måste vara publikt. Kontrollera att `raw/` inte kommer med.
3. Låt pojkvännen granska `data/words.json` och `data/sentences.json`.

## [2026-10-31] publish | Förberedelser för GitHub Pages
- Användaren testade ett helt pass i webbläsaren utan problem och skapade ett GitHub-konto.
- `git init` på grenen `main`. Ingen commit är gjord och inget är publicerat än.
- `.claude/` lades till i `.gitignore`. Kontrollerat att `raw/` och `.claude/` inte kommer med.
- Filerna genomsöktes efter personliga uppgifter: inga namn, e-postadresser eller adresser, men några omnämnanden av pojkvännen och hans familj.
- `process.md`: GitHub Desktop ersatt av arbetsgången där Claude Code sköter git.
