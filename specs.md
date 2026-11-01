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

## Idag: stigen
- Idag-sidan är en slingrande stig med en rund knapp per lektion, indelad i nivåer. Sidan öppnas vid din lektion: tidigare lektioner ligger uppåt, kommande nedåt.
- Tassavtryck längs en mjuk kurva binder ihop knapparna inom en nivå, en tass per 30 pixlar fritt avstånd och med lika stora mellanrum. Mellan nivåer finns inga tassar. Tassarna går växelvis på varsin sida och pekar dit stigen går. Vägen fram till din lektion är grön, resten dämpad. En igelkott står vid din lektion med en stillsam tomgångsanimation som i gamla spel: kroppen hoppar mellan två lägen och ögat blinkar ibland.
- **Lägen:** gjord (grön med bock, du har gjort ett pass), överhoppad (streckad ring), din lektion (större och rosa), kommande (dämpad).
- Överst står alltid Dagens pass med lektionens nummer och namn, plus sviten. Är dagens pass gjort står nästa pass där. Under finns Till min lektion, nivåtestet och Välj nivå.

## Lektionssidor
- Tryck på en lektion för att se orden och meningarna.
- **Gjord eller överhoppad:** Repetera lektionen ger flervalsfrågor, läsning och Bygg meningen. Din plats ändras inte. Ett repetitionspass räknas i grafen och sviten, och en överhoppad lektion blir gjord.
- **Kommande:** bara titta. Orden räknas inte som sedda.

## Grammatik
- Knappen **Förklara grammatiken** visas på lektionssidan och i stegen Nytt ord och Läs och förstå, när lektionen har en förklaring.
- Den öppnar ett fönster med kort förklaring och exempel. Innehållet finns i `data/grammar.json`.
- Serbiska står i kursiv när den blandas med svenska, både här och i tipsen vid ord och meningar. I datafilerna märks den `*så här*`.

## Dagens pass (~5–10 min)
1. **Repetition – 3 till 15 ord** från tidigare pass. Antalet växer med hur många ord som behöver befästas: överhoppade ord du inte övat på, och ord du senast gav "Kunde inte" eller "Svårt" (ett extra ord per 4 sådana, högst 15). Försenade ord kommer först, sedan ord att befästa, sist övriga. Visa ordet → "Visa svar" → betygsätt.
2. **Nya ord – 5 ord** från lektionen du är på. Efter passet går appen till nästa lektion.
   - Presentation: ordet, kyrilliska, översättning, tips.
   - Flervalsfråga: "Vad betyder ordet?" (4 alternativ). Rätt → betygsätt Svårt/Bra/Lätt. Fel → räknas som "Kunde inte" och frågan kommer tillbaka sist.
3. **Meningar – 5 meningar** med lektionens ord.
   - Läs och förstå: serbisk mening → "Visa översättning" + grammatiktips.
   - Bygg meningen: svensk översättning visas, tryck på serbiska ordbrickor i rätt ordning (meningar med minst 2 ord). Varje ord har en tom rad och skiljetecknen står redan på plats. Brickorna saknar skiljetecken och första ordet har liten bokstav, så att de inte avslöjar ordningen. En mening kan ha flera rätta ordföljder (fältet `alt`).
4. **Klart:** sammanfattning och svit.

Ord som får "Kunde inte" visas igen senare i samma pass (en gång) och först i kön nästa pass.
När alla lektioner är klara visas bara repetition och slumpade meningar, tills nya lektioner läggs till.

## Nivåtest
Hittar var du ska börja, och nås via en länk på startsidan. Tar 3–5 minuter.
- En nivå är 10 lektioner. Varje nivå har 4 frågor: 3 ord och 1 mening, med svarsalternativ från samma nivå och knappen "Vet inte".
- Testet börjar på nivå 2. Minst 3 rätt ger nästa nivå, annars nivån under, tills gränsen är hittad. Det ger 8–20 frågor.
- Resultatet visas som lektioner, inte som en officiell nivå som A1 eller A2.
- Testet kan göras om. Föreslår det en annan nivå, uppåt eller nedåt, väljer du "Byt till lektion X" eller "Stanna på lektion Y". Samma nivå ger inget byte.

## Byta nivå
- **Välj nivå** på startsidan visar alla nivåer med teman. Ett tryck flyttar dig till nivåns första lektion.
- **Framåt:** ord i tidigare lektioner blir sedda och kommer tillbaka i repetitionen. Ord du svarat fel på i testet repeteras först.
- **Bakåt:** överhoppade ord du inte övat på blir nya igen. En lektion du redan gjort visas på nytt.
- Ord du redan övat på ändras aldrig av ett nivåbyte, och passhistoriken påverkas inte.
- **Ångra hoppet** under Framsteg tar bort överhoppade ord du inte har övat på och går tillbaka till första lektionen med ord du inte sett.

## Betygssystem
| Knapp | Värde | Effekt |
|---|---|---|
| Kunde inte | 1 | Börja om, visas snart igen |
| Svårt | 3 | Kort intervall |
| Bra | 4 | Normalt intervall |
| Lätt | 5 | Längre intervall |

Intervall: 1 dag → 6 dagar → föregående × "lätthet" (startar på 2,5, minst 1,3).

## Dashboard ("Framsteg")
- **Din utveckling:** välj 7 dagar, 30 dagar eller 3 månader. Visar pass, nya ord, repetitioner och aktiva dagar med förändring mot föregående period, plus staplar per dag (per vecka vid 3 månader) och en tabellvy. Bygger på de pass som redan sparas.
- Samma stil som Idag: fast kort överst med ord du har sett och svit, lila rubrikband och runda knappar.
- Antal ord per **senaste betyg** i runda knappar: Lätt, Bra, Svårt. "Kunde inte" visas inte. Ett tryck öppnar ett fönster med orden i gruppen.
- Lektioner klara och antal pass.
- **Exportera/importera** framsteg som JSON-fil (backup och flytt mellan enheter).

## Data
- **Innehåll** (JSON-databasen): `data/words.json`, `data/sentences.json`. Format i `CLAUDE.md`.
- **Framsteg:** webbläsarens localStorage, nyckel `serbiska-progress-v1`.
  - Finns bara på den enhet och i den webbläsare där du pluggar.
  - En statisk sida (GitHub Pages) kan inte skriva till JSON-filerna. Därför sparas framsteg lokalt.
  - På iPhone har appen på hemskärmen en egen lagring, skild från Safari.
  - Om framsteg inte kan sparas eller läsas visas en röd varning överst.
- Nu: 60 lektioner, 300 ord, 300 meningar.
- **Källor:** lektion 11–60 bygger på frekvenslistan och Wiktionary (CC BY-SA 4.0) och på meningar från Tatoeba (CC BY 2.0 FR). Materialet hämtas när lektioner skapas och sparas i `data/`, appen anropar inga externa tjänster. Källorna anges under Framsteg.

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
