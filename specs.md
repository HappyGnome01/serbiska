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
- Tassavtryck längs en mjuk kurva binder ihop knapparna inom en nivå, en tass per 30 pixlar fritt avstånd och med lika stora mellanrum. Mellan nivåer finns inga tassar. Tassarna går växelvis på varsin sida och pekar dit stigen går. Vägen fram till din lektion är grön, resten dämpad. En igelkott står vid din lektion, på den trånga sidan när den ryms där, med en stillsam tomgångsanimation: kroppen andas mjukt upp och ner och ögat blinkar ibland.
- **Lägen:** gjord (grön, du har gjort ett pass), överhoppad (streckad ring), din lektion (större och rosa), kommande (dämpad).
- Pass startas med knappen vid din lektion på stigen. Igelkotten står på den sida av din lektion där stigen inte fortsätter neråt (ryms den inte där, på andra sidan). Knappen står snett under lektionen och igelkotten, med ungefär samma avstånd till båda (16 pixlar, som mellan en lektion och närmaste tass), utan att täcka stigen, lektionerna, igelkotten eller nivårubriken. Står lektionen nära kanten och stigen går mellan dem väljs närmaste lediga plats under igelkotten.
- **Byta flik under ett pass:** passet ligger kvar. Idag tar dig tillbaka till steget du var på (hade du svarat ångras svaret och steget visas som nytt). Trycker du på Idag medan du gör passet frågar appen "Vill du avbryta övningen?". Ja → stigen, Nej → du stannar kvar. Svar du redan gett i ett avbrutet pass sparas. Under passet är Idag markerad (Träna för träningspass).

## Flikar
Flikarna ligger alltid längst ner på skärmen, på alla sidor, och visas som ikoner:
- **Två tassavtryck:** Idag.
- **Ek:** Träna.
- **Förstoringsglas:** Navigering.
- **Krona:** Framsteg.

Raden överst ligger kvar när du scrollar. Bredvid rubriken Serbiska står 🦔 med din lektion, 🔥 med antal dagar i rad och 🍃 med antal ord du kan: ord vars senaste betyg är Lätt eller Bra, och ❤️ med antal ord du kan stava: ord vars senaste betyg i skrivövningen är Lätt eller Bra. Ett tryck öppnar ett fönster med mer information:
- Fönstren har två lika stora knappar längst ner: 🦔 Visa på stigen, 🔥 Se framsteg, 🍃 och ❤️ Träna, var och en bredvid Stäng.
- **🦔:** lektionen du är på, dess tema, var på nivån du är, hur många som är kvar på nivån, avklarade och överhoppade lektioner, och en knapp till stigen.
- **🔥:** om du gjort ett pass idag, de senaste sju dagarna, längsta sviten och antal dagar du pluggat.
- **🍃:** antal ord i Lätt, Bra och Svårt, hur många ord som ska repeteras nu och listan med orden du kan.
- **❤️:** antal ord i skrivövningen med senaste betyg Lätt, Bra, Svårt och fel, och listan med orden du kan stava.

## Lektionssidor
- Tryck på en lektion för att se orden och meningarna.
- **Gjord eller överhoppad:** Repetera lektionen ger flervalsfrågor, läsning och Bygg meningen. Din plats ändras inte. Ett repetitionspass räknas i grafen och sviten, och en överhoppad lektion blir gjord.
- **Kommande:** titta. Orden räknas inte som sedda.
- **Markera som gjord** finns på alla lektioner som inte är gjorda. Du anger Svårt, Bra eller Lätt för varje ord, och orden kommer sedan med i repetitionerna. Lektionen blir gjord utan att du gör passet. Det ger ingen svit och räknas inte som pass. Är det din lektion går du vidare, annars ändras inte din plats. Efter ett pass hoppar appen över lektioner som redan är gjorda.

## Träna
- Fliken **Träna** har runda knappar i fyra grupper: Extralektioner, Ämnen, Grammatik och Småord. Extralektioner har två knappar: Svåra ord och Lektioner. Kategorierna finns i `data/categories.json` och pekar på lektioner eller på enskilda meningar.
- Ringarna har samma ljusa bakgrund inuti som korten. **Ringen** visar hur stor andel av kategorins ord du kan (Lätt eller Bra). Vid en kategori som bara har meningar visar ringen meningar du byggt rätt. Vid Svåra ord visar ringen andelen betygsatta ord som inte är svåra.
- **Alla ord** i en kategori kan övas, även från lektioner du inte nått. Ord du aldrig sett presenteras innan frågan. Undantag: **Svåra ord** består bara av ord du senast gav Kunde inte eller Svårt.
- **Lektioner** (🎓) övar ord och meningar från onsdagslektionerna med en serbisktalande lärare. De ligger i `data/tutor.json`, utanför stigen, och fylls på allt eftersom. Ord som redan finns i appen pekas ut med `refs` och delar betyg med samma ord på stigen. Ringen visar andelen av orden du kan. Utan ord står det "Inga ord än" och knappen går inte att trycka på. Orden får betyg som andra ord och räknas i 🍃, ❤️, cirklarna, Ditt ordförråd, Din utveckling och Svåra ord. Ord du kan (Lätt eller Bra) kommer med i skrivövningen i dagens pass, men nya ord från lektionerna läggs inte in i passet och flyttar dig inte på stigen.
- Ett pass är upp till 8 flervalsfrågor och 3 Bygg meningen, ord du inte kan först. Kategorier med bara meningar ger upp till 8 Bygg meningen.
- Betygen sparas som vanligt och passet räknas i sviten. Din plats på stigen ändras inte, och lektioner längre fram förblir kommande även om du tränat på deras ord.

## Nivå klar
När sista lektionen på en nivå blir gjord visas ett fönster där igelkotten gör en kullerbytta. Överhoppade lektioner räknas inte som gjorda, så hela nivån måste vara gjord.

## Grammatik
- Varje ord och mening pekar själv på de förklaringar som gäller just den (fältet `grammar`). Har ordet eller meningen en förklaring går tipset med 💡 att trycka på (prickad understrykning och ›), och då öppnas förklaringen. Saknas tips står det bara "💡 Grammatik". Det gäller i passen och på lektionssidan. Det finns ingen separat grammatikknapp. *Danas* har ingen, och *Idem kući* visar verbens ändelser, oregelbundna verb och *kući*.
- På lektionssidan har varje ord och mening sitt eget tips med förklaring.
- Den öppnar ett fönster med kort förklaring och exempel. Innehållet finns i `data/grammar.json`.
- Serbiska står i kursiv när den blandas med svenska, både här och i tipsen vid ord och meningar. I datafilerna märks den `*så här*`.

## Dagens pass (~5–10 min)
1. **Repetition – 3 till 15 ord** från tidigare pass. Antalet växer med hur många ord som behöver befästas: överhoppade ord du inte övat på, och ord du senast gav "Kan inte" eller "Svår" (ett extra ord per 4 sådana, högst 15). Försenade ord kommer först, sedan ord att befästa, sist övriga. Visa ordet → betygsätt direkt med Kan inte, Svår, Bra eller Lätt → svaret visas → Nästa.
   - **Lätt:** ord du senast gav Lätt kommer inte tillbaka i repetitionen, bara i skrivövningen.
   - **Repetition i mening:** ord du senast gav Kan inte, Svår eller Bra repeteras i en mening där ordet finns med (samma stavning, eller en böjd form med ordet som grundform, som *kafu* för *kafa*). Meningen väljs slumpvis bland lektioner du kommit till, och ordet är markerat. Visa översättning → översättningen och "Ordet: *kafa* = kaffe" visas → betygsätt ordet. Hittas ingen mening (17 av 500 ord, mest verb i jag-form som *moram*) blir det ett vanligt ordkort.
   - **Skriv på serbiska:** ord du kan (senaste betyg Bra eller Lätt när du översätter till svenska) får ett eget skrivschema, skilt från att känna igen ordet. Du ser svenskan och skriver serbiskan, med knappar för *č ć š ž đ*. Skrivuppgifter som det är dags för kommer först, sedan högst 3 ord per pass som skrivs för första gången, i lektionernas ordning. Högst 6 skrivuppgifter per pass, och de räknas in i gränsen på 15 repetitioner. Ett ord som ska skrivas visas inte samma pass från serbiska till svenska.
   - **Rättning:** stor bokstav och skiljetecken räknas inte. Saknade *č ć š ž đ* godkänns men stavningen visas. Former i noten (*Man:*, *Artigt:*, *Även:*) och ord med samma svenska betydelse godkänns. Ekavisk form godkänns med en kommentar. En bokstav fel i ett ord på minst 5 bokstäver räknas som Svår. Annars räknas det som Kan inte och ordet kommer tillbaka senare i passet.
2. **Nya ord – 5 ord** från lektionen du är på. Efter passet går appen till nästa lektion. Orden testas i blandad ordning, men det ord som visades sist testas aldrig först.
   - Presentation: ordet, kyrilliska, översättning, tips.
   - Flervalsfråga: "Vad betyder ordet?" (4 alternativ). De fel svaren väljs bland ord som liknar rätt svar i stavning, tema, kategori eller ordtyp, med lite slump. Rätt → grön bock i blank 3D-stil på svaret (längst till höger, sticker upp lite ovanför fältet) och "Hur lätt var det?" i samma stil som rubriken, sedan Svår/Bra/Lätt. Fel → rött kryss på det valda svaret, rätt svar blir grönt, texten "Inte riktigt – ordet kommer tillbaka strax." i rubrikstil. Räknas som "Kan inte" och frågan kommer tillbaka sist.
3. **Meningar – 5 meningar** med lektionens ord.
   - Läs och förstå: serbisk mening → "Visa översättning" + grammatiktips.
   - **Grammatik per ord:** när översättningen visas blir orden i meningen prickstreckade. Trycker du på ett ord (eller ord som hör ihop, som *je prošao*) öppnas ett fönster med betydelsen, en tabell med form, ordboksform och genus, ett tips och de grammatikregler som gäller just den delen. Formen har vardagliga namn med en mening om när den används och fackordet sist: grundform (nominativ), objektform (ackusativ), av-form (genitiv), till-form (dativ), plats-form (lokativ), med-form (instrumental), tilltalsform (vokativ); en/flera för singular/plural; nutid, dåtid, framtid, uppmaning och att-form för verb. Oböjliga ord visar "Form: ändras aldrig". Det fungerar också i lektionsfönstret. Delarna står i fältet `parts` i `sentences.json`, för alla 500 meningar. Ord som saknar del slås upp i ordlistan, och ord som inte finns någonstans går inte att trycka på.
   - Bygg meningen: svensk översättning visas, tryck på serbiska ordbrickor i rätt ordning (meningar med minst 2 ord). Varje ord har en tom rad och skiljetecknen står redan på plats. Brickorna saknar skiljetecken och första ordet har liten bokstav, så att de inte avslöjar ordningen. En mening kan ha flera rätta ordföljder (fältet `alt`). Efter Kontrollera blir brickorna vanlig text: meningen du byggde, i en ruta som är grön med bock eller röd med kryss. Vid fel visas rätt ordning under.
   - Skrivövningen visar på samma sätt grön bock eller rött kryss på fältet, och texten under står i rubrikstil.
4. **Klart:** sammanfattning och svit.

**Tillbaka** (←) står först bland knapparna. Har du svarat på steget visar den samma kort utan svar och ångrar svaret. Annars visar den förra övningen och ångrar svaren sedan dess. Svaret och översättningen tar plats redan innan de visas, och meningskortet har en fast minsta höjd, så att knapparna står still.

Ord som får "Kunde inte" visas igen senare i samma pass (en gång) och först i kön nästa pass.
När alla lektioner är klara visas bara repetition och slumpade meningar, tills nya lektioner läggs till.

## Navigering
- En nivå är 7 lektioner. Med 100 lektioner blir det 15 nivåer, och den sista har 2 lektioner.
- Fliken **Navigering** visar alla nivåer med nivånummer, teman och en bar med hur många lektioner som är klara. Klar betyder att du gjort ett pass på lektionen, så överhoppade lektioner räknas inte. En helt klar nivå är lila och nivån du är på ljusare lila.
- Ett tryck på en nivå visar den på stigen under Idag. Din lektion ändras inte. Tryck på Idag för att komma tillbaka till igelkotten.
- Det går inte längre att byta nivå i appen. Har du hoppat över lektioner tidigare finns **Ångra hoppet** under Framsteg: det tar bort överhoppade ord du inte har övat på och går tillbaka till första lektionen med ord du inte sett.

## Ljud
- 🔊 finns vid ord och meningar i passen och på lektionssidan.
- Finns en ljudfil i `audio/` (listad i `data/audio.json`) spelas den. Annars används enhetens serbiska, bosniska eller kroatiska röst. Visar telefonen ingen röstlista alls, som ofta på iPhone, får telefonen välja röst för kroatiska. Har den bara röster för andra språk visas ett fönster med vilka språk som finns.
- AI-ljudfilerna skapas med `tools/make-audio.ps1` och Azure Speech. Det kräver en egen nyckel, som aldrig sparas i projektet.

## Betygssystem
| Knapp | Värde | Effekt |
|---|---|---|
| Kan inte | 1 | Börja om, visas snart igen |
| Svår | 3 | Kort intervall |
| Bra | 4 | Normalt intervall |
| Lätt | 5 | Längre intervall |

Intervall: 1 dag → 6 dagar → föregående × "lätthet" (startar på 2,5, minst 1,3).

## Dashboard ("Framsteg")
- **Din utveckling:** välj 7 dagar, 30 dagar eller 3 månader. Staplar och datum hålls en bit från grafens kanter, och varje datum står centrerat under sin stapel, så att första och sista datumet får plats.
- **Grafen:** staplade staplar per dag (per vecka vid 3 månader) med alla ord i Lätt, Bra och Svårt som de såg ut när dagen slutade, i samma färger som de runda knapparna. Svårt är rosa där, men knappen Svårt i passet är kvar i gult eftersom Kunde inte är rosa. Har en tabellvy. Från och med nu sparas läget varje dag. Dagar innan dess är en uppskattning utifrån senaste betyget på varje ord.
- **Cirklarna** står överst, ovanför Din utveckling: **Aktivt ordförråd**, ord du kan stava (Lätt eller Bra i skrivövningen), och **Passivt ordförråd**, ord du förstår (Lätt eller Bra), båda av alla ord i appen.
- Samma stil som Idag: kort överst med svit, lila rubrikband och runda knappar.
- **Ditt ordförråd:** antal ord per **senaste betyg** i runda knappar: Lätt, Bra, Svårt. "Kunde inte" visas inte. Ett tryck öppnar ett fönster med orden i gruppen.
- **Exportera/importera** framsteg som JSON-fil (backup och flytt mellan enheter).

## Data
- **Innehåll** (JSON-databasen): `data/words.json`, `data/sentences.json`. Format i `CLAUDE.md`.
- **Framsteg:** webbläsarens localStorage, nyckel `serbiska-progress-v1`.
  - Finns bara på den enhet och i den webbläsare där du pluggar.
  - En statisk sida (GitHub Pages) kan inte skriva till JSON-filerna. Därför sparas framsteg lokalt.
  - På iPhone har appen på hemskärmen en egen lagring, skild från Safari.
  - Om framsteg inte kan sparas eller läsas visas en röd varning överst.
- Nu: 100 lektioner, 500 ord, 500 meningar.
- **Källor:** lektion 11–60 bygger på frekvenslistan och Wiktionary (CC BY-SA 4.0) och på meningar från Tatoeba (CC BY 2.0 FR). Lektion 61–100 är Claudes egna ordval och meningar, märkta `check` tills de är granskade. Materialet hämtas när lektioner skapas och sparas i `data/`, appen anropar inga externa tjänster. Källorna anges under Framsteg.

## Teknik
- Ren HTML/CSS/JavaScript, inga ramverk eller byggsteg.
- Måste köras via en webbserver (lokal server eller GitHub Pages), eftersom webbläsaren inte får läsa JSON-filer direkt från disken.
- Mobilanpassad, ljust och mörkt läge. Hög kontrast och mjuk 3D-känsla: knappar, kort och stigens cirklar är rundade med ljus upptill och skugga nedtill, och knappar trycks ner när du trycker på dem. Barer och ringar ser ut som runda rör som fylls, och tomma rör är ljusa och blanka. Grafens staplar är runda pelare, och igelkotten har ljus, skugga och glans.

## Publicering
GitHub Pages från ett publikt repo. `raw/` publiceras aldrig (`.gitignore`). Se `process.md`.

## Inte med i version 1
- Inloggning eller synk mellan enheter
- Skrivövningar (skriv det serbiska ordet själv)

## Backlog (idéer framåt)
- [ ] Fler lektioner: siffror, tid och datum, hemmet, väder, vanliga verb, presens
- [ ] Ljud via webbläsarens talsyntes (kolla om serbisk röst finns på telefonen) eller inspelningar från pojkvännen
- [x] Skrivövning: svenska → skriv på serbiska (steg 1, i dagens pass)
- [ ] Skrivövningen under Träna, och antal ord du kan skriva under Framsteg (steg 2)
- [ ] Lyssningsövning
- [x] Ikon: igelkottansikte på hemskärmen (`apple-touch-icon.png`, ritas av `tools/make-icon.ps1`)
- [ ] Offline-läge (PWA)
- [ ] Ta bort ord som strukits ur data från sparade framsteg
