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

## [2026-11-01] content | Granskning av piloten
- Pojkvännen godkände alla tre markerade meningarna. `check` togs bort.
- `l14-s2` fick komma före *jer*: *Ne mogu, jer idem kući.*

## [2026-11-01] fix | Flera rätta ordföljder
- Pojkvännen: både *Hvala, dobro* och *Dobro, hvala* går bra, och det senare är mest naturligt. `l1-s4` ändrades och fältet `alt` lades till.
- Användaren bekräftade att framstegen finns kvar efter omstart av hemskärmsappen.
- "1 repetitioner" rättat.

## [2026-11-01] feature | Graf under Framsteg
- Siffror med förändring, staplar per dag eller vecka, tabellvy och val av period, i umamis stil. Inga nya beroenden.
- Bygger på sparade pass, så formatet på framstegen är oförändrat. Färgerna klarade kontrollen för färgblindhet i ljust och mörkt läge.

## [2026-11-01] content | Lektion 16–60
- 225 nya ord och 225 nya meningar. Appen har nu 60 lektioner, 300 ord och 300 meningar.
- 141 meningar kommer från Tatoeba, en del omvandlade till ijekaviska eller feminina former. 84 är egna och har `check: true`.
- Wiktionary visade att *dole* är ekaviskt, så ordet blev *dolje*. Ekavisk skanning av alla meningar gav inga träffar.
- Granskningslista för pojkvännen: `raw/granska-lektion-16-60.md`, med fem ordfrågor om vad familjen säger.
Nästa steg: pojkvännen granskar listan, sedan nivåtestet.

## [2026-11-01] content | Granskning av lektion 16–60
- Pojkvännens ordval: *kuvam*, *juče*, *sto*, *Vaskrs* före Uskrs och *prodavnica* före trgovina. Reglerna står i `CLAUDE.md`.
- Ändrade meningar: `l30-s1`, `l30-s2` (molim te), `l31-s4`, `l47-s3`, `l49-s3`, `l52-s1`, `l52-s5`, `l58-s2`. Hans "l20-s2" tolkades som `l30-s2`.
- Övriga markerade meningar godkändes, och alla `check` togs bort.
- `l52-s5` innehåller inte längre lektionens ord *do*.
- Rättat: trasiga tecken i anteckningen till *sto*.

## [2026-11-01] feature | Nivåtest
- Anpassat test med 6 nivåer, 4 frågor per nivå och start på nivå 2. Resultatet anges som lektion.
- Ord som hoppas över sparas som sedda med `placed: true` och kommer tillbaka i repetitionen. `progress.placement` är nytt, gamla framsteg fungerar som förut.
- Ångra finns under Framsteg.
- Automatiskt testat i webbläsaren: alla vägar, befintliga framsteg, ångra, omtest och hopp över allt.

## [2026-11-01] feature | Fler repetitioner och fritt nivåval
- Repetitioner per pass går från 3 till 15 beroende på överhoppade och svåra ord.
- `progress.currentLesson` är nytt och håller reda på lektionen. Äldre framsteg utan fältet fungerar som förut.
- Nytt nivåtest ger valet att byta eller stanna, även till en lägre nivå. "Välj nivå" på startsidan byter nivå manuellt.
- Ord med riktiga framsteg ändras aldrig av ett nivåbyte. Testat automatiskt åt båda håll i webbläsaren.

## [2026-11-01] feature | Stig, tema, lektionssidor och grammatik
- Nytt tema med dämpade pastellfärger och runda former, i ljust och mörkt läge.
- Idag är nu en stig med 60 lektioner, streckad linje, nivårubriker och en igelkott vid din lektion.
- Lektionssidor visar ord och meningar. Repetition flyttar dig inte. Kommande lektioner går bara att titta på.
- `data/grammar.json` har 18 förklaringar för 38 lektioner, alla med `check: true`. Granskningslista: `raw/granska-grammatik.md`.
- Testat automatiskt i webbläsaren: lägen, repetition, riktigt pass, grammatikfönster, telefonbredd och mörkt läge.

## [2026-11-01] content | Granskning av grammatiken och kursiv serbiska
- Pojkvännens granskning: *Nemam kafu* ändrades till *Nemam kafe* (partitiv genitiv). Regeln står nu under negation och genitiv. Övrigt godkändes och alla `check` togs bort.
- Serbiska står nu i kursiv i `note` och `grammar.json`, märkt `*så här*`. Appen visar märkningen med funktionen `mixed`.
- *Normativna gramatika srpskoga jezika* (Matica srpska) är grammatisk referens. Claude har inte tillgång till boken, så inget i appen är kontrollerat i den.
- Grammatikfönstret stängs nu direkt, utan att ligga kvar osynligt.

## [2026-11-01] feature | Tassavtryck på stigen
- Stigen är nu en enda mjuk kurva utan knyck vid knapparna, ritad i riktiga pixlar och omritad när bredden ändras.
- Strecken ersattes av tassavtryck. Avtryck som skulle hamna under knappar, rubriker eller igelkotten hoppas över. Knapparna står glesare så att det får plats tassar emellan.
- Rättat: ordet "null" syntes på Idag och på lektionssidor, ett fel från bygget av stigen.

## [2026-11-01] feature | Glesare tassar, passets namn och ny stil på Framsteg
- Stigen har hälften så tätt mellan tassarna, fler svängar och kortare avstånd, så sidan blev kortare.
- Dagens pass visar lektionens nummer och namn. Texten om antal repetitioner, nya ord och tid togs bort.
- Framsteg har fått samma stil som Idag: fast kort överst, lila rubrikband och runda knappar.
- Lätt, Bra och Svårt öppnar ett fönster med orden. Det ersätter de utfällbara listorna. Grammatiken använder samma fönster.
