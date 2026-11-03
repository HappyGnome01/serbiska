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

## [2026-11-01] fix | Jämnare tassar på stigen
- Tassarna läggs nu ut sträcka för sträcka med lika stora mellanrum, en tass per 30 pixlar fritt avstånd. Regeln kommer från de sträckor användaren tyckte såg bra ut.
- Inga tassar mellan sista lektionen i en nivå och första i nästa.

## [2026-11-01] fix | Igelkotten niger
- Igelkotten fick ben som står still på marken. Kroppen sjunker ner över benen, lutar framåt och reser sig igen, i stället för att hela djuret svävar upp och ner.

## [2026-11-01] fix | Igelkottens tomgångsanimation
- Nigningen ersattes av en tomgång som i gamla Nintendo-spel: kroppen hoppar 2 pixlar mellan två lägen utan mjuka övergångar, och ögat blinkar var femte sekund.
- Stegen såg hackiga ut, så kroppen rör sig nu mjukt med 2,8 sekunder per andetag.

## [2026-11-01] fix | Flikarna ligger kvar överst
- Flikarna Idag och Framsteg ligger nu fast högst upp när man scrollar. Kortet med Dagens pass och kortet Dina framsteg scrollar bort med sidan.
- Igelkottens andetag kortades från 2,8 till 1,8 sekunder, fortfarande mjukt.

## [2026-11-01] feature | Flikar med ikoner längst ner
- Flikarna ligger nu längst ner på skärmen och visas som ikoner: två par tassavtryck (Idag), träd (Framsteg) och förstoringsglas (Välj nivå, ny egen flik).
- Kortet Dagens pass togs bort. Pass startas med knappen vid lektionen på stigen. Sviten syns nu bara under Framsteg.
- Nivåtestet togs bort. Gamla testresultat ligger kvar orörda i sparade framsteg men används inte.

## [2026-11-01] feature | Svit och ord du kan bredvid rubriken
- Bredvid rubriken Serbiska står nu 🔥 med antal dagar i rad och 🍃 med antal ord vars senaste betyg är Lätt eller Bra. Raden syns på alla sidor och uppdateras under passet.

## [2026-11-01] feature | Översikt, ny graf och cirklar
- Idag-ikonen visar två tassavtryck. Länken Till min lektion togs bort.
- Fliken Välj nivå heter nu Översikt och varje nivå har en bar med klara lektioner.
- Grafen under Framsteg visar staplade ord i Lätt, Bra och Svårt per dag. Framsteg sparar nu betygen per dag i `gradeDays`, ett nytt fält som inte påverkar befintliga framsteg. Äldre dagar uppskattas ur senaste betyget.
- Två cirklar visar ord du kan av orden i klara lektioner och av alla ord i appen.
- Lektioner klara räknar nu lektioner med gjort pass, samma som Översikt och cirklarna.
- De runda knapparna Lätt, Bra och Svårt visades som fyllda rutor och är nu runda.

## [2026-11-01] feature | Översikt visar nivåer utan att byta
- Ett tryck på en nivå under Översikt visar nivån på stigen under Idag, utan att din lektion ändras. Fliken Idag går tillbaka till igelkotten. Nivåbytet togs därmed bort ur appen, Ångra hoppet finns kvar.
- Texten om antal klara lektioner togs bort under Översikt, baren är kvar.
- Cirklarna flyttades ovanför Din utveckling.
- Svårt är rosa i graf och runda knappar under Framsteg. Knappen Svårt i passet är kvar i gult.

## [2026-11-01] content | Förslag på lektion 61-80
- 100 ord i 20 lektioner skrivna till `raw/forslag-lektion-61-80.md`. Inget är inlagt i appen, orden ska granskas först. Ingen dubblett mot appens 300 ord.

## [2026-11-02] content | Förslag på lektion 81-100
- 100 ord till i 20 lektioner skrivna till `raw/forslag-lektion-81-100.md`, så förslagen är nu 200 ord. Nivå 9 handlar om att föra samtal, nivå 10 om familjens år. Inget är inlagt i appen, orden ska granskas först.
- Ingen dubblett mot appen eller första förslaget, utom *sto* (hundra), som skrivs som *sto* (bord) och behålls medvetet.
- *ti* saknades i appen och ligger nu i lektion 82.

## [2026-11-02] content | Svar från pojkvännen
- Svaren är införda i ordförslagen: *marka*, *avgust*, *vidjećemo*, *snaja*, ny text för *slatko*. Inga frågor är kvar.
- Att vara, dåtid och framtid flyttades till lektion 61-64 i förslaget, övriga lektioner följer efter.
- `l2-s5` ändrades från *Izvini, molim?* till *Izvini?*. Ordvalen står i `CLAUDE.md`.

## [2026-11-02] feature | Markera som gjord, kullerbytta och informationsfönster
- Lektionssidan har knappen Markera som gjord, där du bara betygsätter orden. Det ger ingen svit och räknas inte som pass. Nytt valfritt fält `marked` på passen, befintliga framsteg påverkas inte.
- Igelkotten gör en kullerbytta när en hel nivå blir gjord.
- 🔥 och 🍃 öppnar fönster med mer information.
- Framsteg fick en krona som ikon.

## [2026-11-02] feature | Fliken Träna
- Ny flik med ek-ikon och 22 runda knappar: Svåra ord, 14 ämnen, nutid, dåtid och framtid och 4 grupper småord. Ringen runt knappen visar hur mycket du gjort.
- Kategorierna ligger i nya `data/categories.json`. Alla ord får övas, utom Svåra ord som bara har ord du betygsatt som svåra.
- Nytt valfritt fält `builtSentences` sparar meningar du byggt rätt. Befintliga framsteg påverkas inte.
- Lektioner längre fram än din lektion visas nu alltid som kommande, så att träning inte gör dem streckade.

## [2026-11-02] publish | Träna, Markera som gjord och kullerbytta
- Allt från dagens arbetspass pushat till GitHub Pages. De 200 ordförslagen ligger kvar privat i `raw/` och är inte inlagda.

## [2026-11-02] content | Lektion 61-100
- 200 ord och 200 meningar inlagda i `data/`, så appen har 100 lektioner, 500 ord och 500 meningar.
- Alla nya meningar är egna och har `check: true`, eftersom de inte är granskade.
- Kategorierna under Träna och grammatikförklaringarna är kopplade till de nya lektionerna. Fyra nya kategorier: Samtal, Jobb och studier, Kläder och handla, Djur och natur.
- Kontroll: giltig JSON, 5+5 i alla lektioner, inga dubbletter utom *sto*, inga ekaviska former i listan som söktes.

## [2026-11-02] publish | Lektion 61-100
- 100 lektioner, 500 ord och 500 meningar pushade till GitHub Pages. De 200 nya meningarna är ogranskade och har `check: true`.

## [2026-11-02] feature | Svårare svarsalternativ, 3D och Navigering
- Fel svar i flervalsfrågor väljs bland ord som liknar rätt svar i stavning, tema, kategori eller ordtyp.
- Ny färgskala med högre kontrast, och 3D-kanter på knappar, kort och stigens cirklar.
- Framsteg: texten om sedda ord och siffrorna över grafen är borttagna. Första cirkeln visar gjorda lektioner.
- Översikt heter Navigering och ligger före Framsteg. Klara nivåer blir lila med grön bock.

## [2026-11-02] feature | Mjukare 3D och rör
- Knappar, kort och stigens cirklar fick mjukare 3D och rundare hörn. Barer och ringar ser ut som runda rör.
- Lektioner klara och Pass totalt är borttagna från Framsteg, och Ord du kan heter Ditt ordförråd.
- Bockarna på lektioner och nivåer är borttagna. Nivån du är på i Navigering är ljusare lila.

## [2026-11-02] feature | Tomma rör, 3D-staplar och igelkott
- Cirklarna heter Avklarade lektioner och Ord du lärt dig.
- Tomma barer och ringar ser ut som ljusa rör i stället för hål. Grafens staplar har 3D.
- Ringarna under Träna har ljus bakgrund inuti.
- Igelkotten har fått ljus, skugga och glans i ögat.

## [2026-11-02] publish | Ny stil, Navigering och svårare alternativ
- Svårare svarsalternativ, ny 3D-stil med rör, Navigering med klara nivåer, enklare Framsteg och 3D-igelkott pushade till GitHub Pages.

## [2026-11-03] feature | Tillbaka, låst översta rad och 7 lektioner per nivå
- Tillbaka-knapp i passen: visar förra övningen och ångrar svaret där.
- Översta raden ligger kvar vid scroll och visar 🦔 med din lektion.
- En nivå är 7 lektioner, så det blir 15 nivåer. Navigering visar inte längre lektionsintervallet.

## [2026-11-03] feature | Lektionsfönster, betyg direkt och ljud
- 🦔 öppnar ett fönster om lektionen du är på.
- Tillbaka (←) står först bland knapparna. Repetitionen har Kan inte, Svår, Bra och Lätt direkt i stället för Visa svar.
- 🔊 vid ord och meningar. Spelar en ljudfil om den finns, annars enhetens röst. Skriptet `tools/make-audio.ps1` skapar AI-ljud med Azure Speech när en nyckel finns. Inga filer är skapade än: datorn har ingen serbisk röst och det finns ingen nyckel.

## [2026-11-03] publish | Tillbaka, 7 lektioner per nivå och ljudknapp
- Allt sedan förra pushen pushat till GitHub Pages. Grammatik per ord och mening är inte byggd.

## [2026-11-03] content | Grammatik per ord och mening
- Nytt fält `grammar` i `words.json` och `sentences.json`. 212 ord och 477 meningar pekar på de förklaringar som gäller just dem, resten har ingen.
- Kopplingarna föreslogs av regler (ord som *sam*, *li*, *u/na*, böjningstips i noten) och lästes sedan igenom. Ett 60-tal rättades för hand.
- Fyra nya förklaringar med `check: true`: *kući/kod kuće*, vart eller var, plural, oregelbundna verb.
- Appen visar Förklara grammatiken bara när ordet eller meningen har en förklaring. Lektionssidan visar alla förklaringar i lektionen.

## [2026-11-03] fix | Kroatisk röst hittades inte
- Appen frågade efter telefonens röster bara i ögonblicket du tryckte, när listan ofta är tom på iPhone. Nu laddas listan i förväg, och är den tom får telefonen välja röst för kroatiska.
- Både *hr-HR* och *hr_HR* känns igen. Hittas ingen passande röst visar fönstret vilka språk telefonen har.

## [2026-11-03] feature | Grammatik via tipset och startknapp vid igelkotten
- Knappen Förklara grammatiken är borttagen. Tipset med 💡 öppnar förklaringen när det finns en, i passen och på lektionssidan.
- Starta pass står bredvid igelkotten (74 av 100 lektioner), på andra sidan om lektionen (7) eller under, på en plats utan stigen (19). Kontrollerat för alla 100 lektioner i telefonbredd.

## [2026-11-03] feature | Starta pass på motsatt sida av stigen
- Knappen står på motsatt sida av stigen mot igelkotten, och höjden anpassas efter var det finns plats. Igelkotten flyttar till den trånga sidan när den ryms där.
- Kontrollerat för alla 100 lektioner i telefonbredd: 55 på motsatt sida (81 i samma höjd som lektionen), 45 bredvid igelkotten där lektionen står för nära kanten. Ingen knapp täcker stigen, en lektion eller nivårubriken.

## [2026-11-03] publish | Grammatik per ord, röst och startknapp
- Grammatik per ord och mening, grammatik via tipset, rättad röstsökning och startknappen på motsatt sida pushade till GitHub Pages.
