# qaro-edeska

Generický widget úřední desky pro weby obcí na QARO. Nástupce jednorázových modulů typu `edeska-kadov`: místo repa per obec se deska konfiguruje RSS adresou v URL.

## Jak to funguje

- **Generátor** (`/`) — vložíš RSS kanál úřední desky, dostaneš adresu widgetu + iframe kód.
- **Widget** (`/w/?feed=<RSS URL>&pp=<počet na stránku>`) — vykreslí desku v jednotném designu (karty, stránkování, inline detail, PDF přílohy přes pdf.js na canvas).
- **Proxy** (`/api/fetch?url=…`) — Vercel funkce; řeší chybějící CORS hlavičky (e-Deska.cz nic neposílá) a překóduje windows-1250 / iso-8859-2 na UTF-8. Povolené jsou jen domény z allowlistu v `api/fetch.js` (`*.imunis.cz`, `*.e-deska.cz`).

## Podporované systémy

| Systém | RSS | Detail dokumentu |
|---|---|---|
| Imunis (`<obec>.imunis.cz`) | `/edeska/feed/rss` | HTML stránka → parsují se metadata + přílohy (`/edeska/file?id=…`) |
| e-Deska.cz | `/rss.php?urad=<id>` | `index.php?doc=N` přesměruje rovnou na PDF → rovnou inline viewer |

Nový systém = přidat doménu do `ALLOWED_HOSTS` v `api/fetch.js` a případně adaptér detailu ve `w/index.html` (rozhoduje se podle content-type odpovědi).

## QARO iframe sandbox

QARO embeduje moduly s `sandbox="allow-scripts allow-same-origin allow-popups allow-forms"` — bez `allow-downloads` / `allow-top-navigation` / `allow-popups-to-escape-sandbox`. Proto se PDF renderuje jako pixely na `<canvas>` (pdf.js, `disableWorker: true`) a „nové okno" je popup s vlastním pdf.js rendererem. Viz `edeska-kadov` pro původní zdůvodnění.

## Deploy

Vercel (tým digi-day-team1), auto-deploy z `main`. Statické soubory + `api/fetch.js` jako serverless funkce.

## Příklady

- Kadov (Imunis): `/w/?feed=https%3A%2F%2Fkadov.imunis.cz%2Fedeska%2Ffeed%2Frss`
- Stříbrná (e-Deska.cz): `/w/?feed=https%3A%2F%2Fwww.e-deska.cz%2Frss.php%3Furad%3D410`
