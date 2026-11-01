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
- Omnämnandena av pojkvännen behålls. GitHub-namnet är anonymt.
- Projektets git använder GitHubs anonyma e-postadress. Säkerhetsspärren stoppade Claude från att ändra kontoinställningen och skapa repot, så användaren gör de klicken själv.

## [2026-10-31] publish | Appen publicerad
- Repo: https://github.com/HappyGnome01/serbiska (publikt). App: https://happygnome01.github.io/serbiska/
- Kontrollerat på den publicerade adressen: startsidan och datafilerna laddar, `raw/` och `.claude/` går inte att nå.
Nästa steg:
1. Testa på telefonen och lägg appen på hemskärmen.
2. Låt pojkvännen granska `data/words.json` och `data/sentences.json`.

## [2026-11-01] query | Framsteg på telefonen, nivåtest och källor
- Användaren: framstegen fanns inte kvar efter att appen lagts på hemskärmen, och innehållet känns för lätt.
- Sparkoden ser rätt ut. Trolig orsak på iPhone: hemskärmsappar har egen lagring, skild från Safari. Inte bekräftat på telefonen.
- Källor testade: Tatoeba (meningar, CC BY) och kaikki.org/Wiktionary (ord, böjning, ekavisk och ijekavisk form). Inga öppna CEFR-listor för serbiska hittades.
- Tatoebas serbiska meningar är ekaviska och mest på kyrilliska. Inget är ändrat i appen än, planen väntar på ok.

## [2026-11-01] fix | Framsteg på iPhone
- Användaren bekräftade förklaringen: hemskärmsappen och Safari har skild lagring.
- Röd varning visas om framsteg inte kan sparas eller läsas. Framsteg-sidan och `process.md` förklarar skillnaden.

## [2026-11-01] feature | Bygg meningen med tomma rader
- Varje ord har en tom rad och skiljetecknen står på plats. Brickorna saknar skiljetecken och första ordet har liten bokstav.
- Testat i webbläsaren med rätt och fel ordning, dubbletter, borttagna brickor och telefonbredd. Alla 75 meningar kan delas upp.

## [2026-11-01] content | Pilot: lektion 11–15
- 25 ord valda ur frekvenslistan och kontrollerade mot Wiktionary. 23 av 25 meningar kommer från Tatoeba, 5 omvandlade till ijekaviska.
- 3 av 25 meningar har `check: true`: `l13-s4`, `l14-s2`, `l15-s5`. Två av dem är egna, eftersom Tatoeba saknar korta svenska meningar med *jer* och *kažem*.
- Urvalet gjordes för hand ur 286 kortare kandidater. Svenska ordöversättningar är Claudes, utifrån Wiktionarys engelska.
- Källor anges under Framsteg. Fältet `source` lades till i `sentences.json`.
Nästa steg: användaren testar lektionerna och pojkvännen svarar på de tre markerade meningarna. Sedan beslut om utbyggnad till 300–500 ord, därefter nivåtestet.
