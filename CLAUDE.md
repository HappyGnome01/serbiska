# CLAUDE.md – instruktioner för Claude Code

Den här filen läser Claude Code automatiskt i början av varje arbetspass.

## Projektet
En webbapp för att lära sig **serbiska** på 5–10 minuter per dag.
- **Mål:** kunna prata med pojkvännens familj och vänner (middagar, besök, fester, småprat).
- **Variant:** ijekavisk serbiska (som i Bosnien), t.ex. *mlijeko, hljeb, lijepo, gdje*.
- **Alfabet:** latin som huvudskrift, kyrilliska under (genereras automatiskt av appen).
- Fullständig specifikation: `specs.md`. Arbetsgång: `process.md`.

## Användaren
- Nybörjare i serbiska (A1).
- Vill lära sig **bygga appar med AI**, inte koda på djupet. Förklara därför *vad* du ändrar och *varför* på en övergripande nivå (vilka filer, vilken effekt), inte rad för rad, om hon inte frågar.
- Svara på svenska. Var rak och kritisk: säg till om en idé är dålig, krånglig eller missar något.

## Regler
- **Radera, flytta eller döp aldrig om filer eller mappar** utan att först fråga och säga exakt vad du tänker göra.
- Gör **små, avgränsade ändringar**, en funktion i taget. Vid större ändringar: beskriv planen kort och vänta på ok.
- Efter varje ändring: säg **hur hon testar den**.
- Uppdatera `log.md` efter varje arbetspass. Uppdatera `specs.md` när appens beteende ändras.
- **Inga ramverk, inget byggsteg, inga externa beroenden.** Ren HTML/CSS/JavaScript så att GitHub Pages kan servera filerna direkt.
- Kod: namn på engelska, kommentarer på svenska.
- `raw/` är privat och publiceras aldrig (står i `.gitignore`). För aldrig över namn eller privata detaljer därifrån till `data/` eller `wiki/`.
- Framsteg sparas i webbläsarens localStorage under nyckeln `serbiska-progress-v1`. Ändra aldrig formatet så att befintliga framsteg försvinner. Behövs ett nytt format: skriv kod som konverterar det gamla.

## Filstruktur
| Fil/mapp | Innehåll |
|---|---|
| `index.html` | Sidans skelett |
| `style.css` | Utseende |
| `app.js` | All logik: pass, repetitionsalgoritm, dashboard |
| `data/words.json` | Ordförråd (JSON-databasen) |
| `data/sentences.json` | Exempelmeningar |
| `data/grammar.json` | Grammatikförklaringar kopplade till lektioner |
| `specs.md` | Vad appen ska göra |
| `process.md` | Hur vi arbetar, steg för steg |
| `log.md` | Logg över allt som gjorts (bara tillägg, inget raderas) |
| `wiki/` | Kunskapsbas om serbiska och kulturen (LLM Wiki) |
| `wiki/index.md` | Katalog över alla wikisidor |
| `raw/` | Privata råanteckningar, t.ex. ord hon hört (publiceras inte) |

## Språkinnehållet (data/)
- **Grammatisk referens:** *Normativna gramatika srpskoga jezika* (Piper, Klajn, Dragićević; Matica srpska). Den väger tyngst i grammatikfrågor, och pojkvännens omdöme gäller vad som är naturligt. Claude har inte tillgång till boken: påstå aldrig att något är kontrollerat i den, utan skriv `"check": true` när du inte kan belägga regeln.
- **Kursiv serbiska:** när svenska och serbiska blandas står serbiskan i kursiv. Gäller svar i chatten, `log.md`, wikin, `note` och texterna i `grammar.json`, där den märks `*så här*`.
**words.json**: `{ id, lesson, theme, sr, sv, note?, check? }`
**sentences.json**: `{ id, lesson, sr, sv, note?, alt?, check?, source? }`
**grammar.json**: `{ id, title, lessons, text, examples, check? }`, där `lessons` är lektionsnummer, `text` en lista med stycken och `examples` par av serbiska och svenska.
- id-format: `l<lektion>-<ord-utan-diakritiska-tecken>` och `l<lektion>-s<nummer>`.
- Skriv **bara latin** i `sr`. Appen gör kyrilliska.
- En lektion = **5 ord + 5 meningar**. Meningarna använder lektionens ord och i övrigt helst bara tidigare ord.
- **Nybörjarnivå:** korta meningar, vanliga ord, fraser som helheter ("chunks", t.ex. *drago mi je*) snarare än grammatikregler.
- Teman utgår från verkliga situationer med familj och vänner.
- **Ijekaviska former.** Skriv ekavisk form i `note` när den skiljer sig.
- **Ordval som granskats:** *kuvam* (inte kuham), *juče* (inte jučer), *sto* (inte stol), *Vaskrs* före Uskrs, *prodavnica* före trgovina.
- **Informellt:** *molim te*, inte bara *molim*, när man ber någon man säger du till om något.
- **Feminina former** när användaren pratar om sig själv (*sita sam, umorna, sretna*).
- Skriv grammatiktips i `note` när ett ord böjs (t.ex. *kafa → kafu*).
- Är du osäker på om något är korrekt och naturligt: säg det och sätt `"check": true` så hon kan fråga pojkvännen.
- `source` anger var en mening kommer ifrån, t.ex. `tatoeba:3253759`. Egna meningar saknar `source` och får `"check": true`.
- `alt` listar andra rätta ordföljder med samma ord, t.ex. `["Hvala, dobro."]`. Serbiskans ordföljd är fri, så lägg till `alt` när flera ordningar låter naturliga.
- Meningar får inte börja med ett egennamn: "Bygg meningen" ger första ordet liten bokstav.
- Kontrollera att JSON-filerna är giltiga efter varje ändring.

## Wiki (LLM Wiki-mönstret)
Wikin är en kunskapsbas som **du underhåller**: hon läser, du skriver. Den växer med varje källa och fråga.
- Varje sida är en markdown-fil i `wiki/` med rubrik, kort sammanfattning och länkar till relaterade sidor.
- `wiki/index.md` listar alla sidor med en rad beskrivning. Uppdatera den när du skapar eller ändrar sidor.

### Arbetsflöden
- **Ingest** ("ingest raw/fil.md"): läs filen → föreslå vad som ska bli nya ord, meningar och wikisidor → efter ok: uppdatera `data/`, `wiki/` och `wiki/index.md` → logga.
- **Query** (frågor om serbiska, t.ex. "varför blir kafa kafu?"): svara utifrån `wiki/` först. Erbjud att spara bra svar som en ny wikisida.
- **Lint** ("kör lint"): kontrollera att JSON är giltig, att varje lektion har 5+5, dubbletter, ekaviska former som smugit in, saknade `note` vid böjning, att `wiki/index.md` stämmer och att länkar fungerar. Rapportera, ändra inget utan ok.

## Logg
`log.md` är append-only. Format:
```
## [ÅÅÅÅ-MM-DD] typ | rubrik
- vad som gjordes
```
Typer: `setup`, `feature`, `fix`, `content`, `ingest`, `query`, `lint`, `publish`.
