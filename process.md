# Arbetsprocess – så bygger du appen med AI

Målet är inte att du ska kunna koda, utan att du ska kunna **styra AI:n** så att den bygger det du vill ha.

## Grundloop för varje förändring
1. **Beskriv vad och varför, inte hur.**
   *"Jag vill se hur många minuter jag pluggat per vecka på dashboarden, för att se om jag håller mig till 5–10 min."*
2. **Be om en plan först** vid större saker.
   *"Gör en kort plan och vänta med att ändra något."* Läs planen och ifrågasätt den.
3. **Låt Claude bygga i små steg.** En sak i taget.
4. **Testa lokalt.** *"Starta en lokal server och öppna appen."* Klicka igenom det nya.
5. **Ge feedback.** Beskriv vad du gjorde, vad som hände och vad du förväntade dig. Bifoga gärna en skärmbild.
6. **Logga.** Claude uppdaterar `log.md` (och `specs.md` om något ändrats).
7. **Publicera** (se nedan) och testa på telefonen.

## Starta ett arbetspass
1. Öppna Claude-appen på datorn → fliken **Code**.
2. Välj mappen `Serbiska`.
3. Claude läser `CLAUDE.md` automatiskt. Börja gärna med: *"Läs log.md och berätta var vi är."*

## Lägga till ord du har hört
1. Skriv en anteckning i `raw/`, t.ex. `raw/2026-11-02-middag.md`: ord, fraser, vad det handlade om.
2. Säg till Claude: *"ingest raw/2026-11-02-middag.md"*.
3. Claude föreslår nya ord och meningar → du godkänner → appen får en ny lektion.

## Bra promptar
- *"Kör lint."* (hälsokontroll av innehåll och wiki)
- *"Varför heter det kafu och inte kafa här?"* (svar från wikin)
- *"Lägg till lektion 11 om siffror 1–10."*
- *"Något känns fel med X. Förklara vad som händer innan du ändrar något."*
- *"Vad är nästa vettiga steg för appen enligt backlogen i specs.md?"*

## Publicera med GitHub Pages
### Första gången (ca 15 min)
Git for Windows är installerat, och Claude Code sköter git åt dig.
1. Skapa ett konto på **github.com**.
2. Logga in på GitHub i Claudes webbläsarpanel. Lösenord och koder skriver du alltid själv.
3. Skapa ett tomt, **publikt** repo och slå på "Keep my email addresses private". Claude kan fylla i formuläret, men säkerhetsspärren stoppar Claude från de sista klicken på kontot. Gratis GitHub Pages kräver ett publikt repo.
4. Claude gör första commit och pushar efter ditt ok. Första gången öppnas ett inloggningsfönster där du själv loggar in.
5. På github.com, i ditt repo: **Settings → Pages** → under "Branch" välj `main` och `/ (root)` → **Save**.
6. Efter någon minut finns appen på `https://<ditt-användarnamn>.github.io/<repo-namn>/`.
7. Öppna adressen på telefonen → **Lägg till på hemskärmen** (iPhone: Dela-knappen; Android: menyn ⋮). På iPhone sparas framsteg separat i ikonen och i Safari, så gör alltid passen från ikonen.

### Varje gång du ändrat något
Säg till Claude: *"Commit och push."* Telefonen visar ändringen efter ungefär en minut. Ladda om sidan om den inte syns.

### Bra att veta
- Repot är publikt: vem som helst med adressen kan se koden och orden. Därför ligger `raw/` i `.gitignore`.
- Dina framsteg sparas på telefonen, inte på GitHub. Uppdateringar raderar dem inte.
- **Ångra:** säg till Claude vilken ändring du vill ångra. Git sparar alla tidigare versioner.
