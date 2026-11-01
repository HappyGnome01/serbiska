# Specifikation – Serbiska-appen

## Syfte
Lära sig tillräckligt med serbiska för att prata med pojkvännens familj och vänner, med **5–10 minuter per dag**.

## Användare
- Svensktalande nybörjare. Kan redan det kyrilliska alfabetet.
- Använder appen på telefonen, utvecklar den på datorn.

## Didaktiska principer
Inspirerat av Duolingo och modern språkdidaktik:
- **Spaced repetition:** ord repeteras precis innan du glömmer dem (SM-2-algoritmen).
- **Aktiv återkallning:** du försöker minnas själv innan svaret visas.
- **Ord i sammanhang:** nya ord övas direkt i meningar.
- **Chunks:** vanliga fraser lärs som helheter (*drago mi je*), grammatik förklaras kort när den dyker upp.
- **Behovsstyrt innehåll:** teman från verkliga situationer: hälsningar, familj, mat, fester.
- **Korta dagliga pass och direkt feedback.** Svit (🔥) som motivation.

## Dagens pass (~5–10 min)
1. **Repetition – 3 ord** från tidigare pass, de mest försenade först. Visa ordet → "Visa svar" → betygsätt.
2. **Nya ord – 5 ord** från nästa lektion.
   - Presentation: ordet, kyrilliska, översättning, tips.
   - Flervalsfråga: "Vad betyder ordet?" (4 alternativ). Rätt → betygsätt Svårt/Bra/Lätt. Fel → räknas som "Kunde inte" och frågan kommer tillbaka sist.
3. **Meningar – 5 meningar** med lektionens ord.
   - Läs och förstå: serbisk mening → "Visa översättning" + grammatiktips.
   - Bygg meningen: svensk översättning visas, tryck på serbiska ordbrickor i rätt ordning (meningar med minst 2 ord). Varje ord har en tom rad och skiljetecknen står redan på plats. Brickorna saknar skiljetecken och första ordet har liten bokstav, så att de inte avslöjar ordningen.
4. **Klart:** sammanfattning och svit.

Ord som får "Kunde inte" visas igen senare i samma pass (en gång) och först i kön nästa pass.
När alla lektioner är klara visas bara repetition och slumpade meningar, tills nya lektioner läggs till.

## Betygssystem
| Knapp | Värde | Effekt |
|---|---|---|
| Kunde inte | 1 | Börja om, visas snart igen |
| Svårt | 3 | Kort intervall |
| Bra | 4 | Normalt intervall |
| Lätt | 5 | Längre intervall |

Intervall: 1 dag → 6 dagar → föregående × "lätthet" (startar på 2,5, minst 1,3).

## Dashboard ("Framsteg")
- Antal ord per **senaste betyg**: Lätt, Bra, Svårt. "Kunde inte" visas inte.
- Ord du har sett (av totalt), lektioner klara, antal pass, svit.
- Utfällbara listor med orden i varje grupp.
- **Exportera/importera** framsteg som JSON-fil (backup och flytt mellan enheter).

## Data
- **Innehåll** (JSON-databasen): `data/words.json`, `data/sentences.json`. Format i `CLAUDE.md`.
- **Framsteg:** webbläsarens localStorage, nyckel `serbiska-progress-v1`.
  - Finns bara på den enhet och i den webbläsare där du pluggar.
  - En statisk sida (GitHub Pages) kan inte skriva till JSON-filerna. Därför sparas framsteg lokalt.
  - På iPhone har appen på hemskärmen en egen lagring, skild från Safari.
  - Om framsteg inte kan sparas eller läsas visas en röd varning överst.
- Nu: 15 lektioner, 75 ord, 75 meningar.
- **Källor:** lektion 11–15 bygger på frekvenslistan och Wiktionary (CC BY-SA 4.0) och på meningar från Tatoeba (CC BY 2.0 FR). Materialet hämtas när lektioner skapas och sparas i `data/`, appen anropar inga externa tjänster. Källorna anges under Framsteg.

## Teknik
- Ren HTML/CSS/JavaScript, inga ramverk eller byggsteg.
- Måste köras via en webbserver (lokal server eller GitHub Pages), eftersom webbläsaren inte får läsa JSON-filer direkt från disken.
- Mobilanpassad, ljust och mörkt läge.

## Publicering
GitHub Pages från ett publikt repo. `raw/` publiceras aldrig (`.gitignore`). Se `process.md`.

## Inte med i version 1
- Inloggning eller synk mellan enheter
- Ljud och uttal
- Skrivövningar (skriv det serbiska ordet själv)

## Backlog (idéer framåt)
- [ ] Fler lektioner: siffror, tid och datum, hemmet, väder, vanliga verb, presens
- [ ] Ljud via webbläsarens talsyntes (kolla om serbisk röst finns på telefonen) eller inspelningar från pojkvännen
- [ ] Skrivövning: svenska → skriv på serbiska
- [ ] Lyssningsövning
- [ ] Ikon och offline-läge (PWA)
- [ ] Ta bort ord som strukits ur data från sparade framsteg
