# Pogoda â€” Deep Weather

ModuĹ‚owa aplikacja pogodowa Vite + vanilla JavaScript. DziaĹ‚a bez backendu i bez prywatnych kluczy API, korzysta z publicznych endpointĂłw Open-Meteo oraz kafli mapowych CARTO/OSM.

## Uruchomienie

Windows BAT:

```bat
start-dev.bat
```

`start-dev.bat` wykrywa zajety port od `5173` i wybiera nastepny wolny. Log procesu Vite trafia do `logs/vite-dev-*.log`.

```bash
npm install
npm run dev
```

Build produkcyjny:

```bash
npm run build
```

PodglÄ…d buildu:

```bash
npm run preview
```

Windows preview:

```bat
start-preview.bat
```

Skrypty npm z tym samym wykrywaniem portu:

```bash
npm run dev:auto
npm run preview:auto
```

Testy:

```bash
npm test
```

## Funkcje

- Prognoza aktualna, godzinowa i dzienna, szczegĂłĹ‚y godzin/dni, wykres canvas.
- Geolokalizacja, miasto domowe, ulubione i ostatnie wyszukiwania.
- AQI, historia pogody, dane morskie, sport, astronomia.
- PWA z manifestem, ikonami i service workerem.
- Tryb offline z ostatniÄ… zapisanÄ… prognozÄ… i statusem cache.
- Alerty pogodowe, indeks komfortu, rekomendacje ubioru i widok najbliĹĽszych 3 godzin.
- PorĂłwnanie do 5 miast.
- Personalizacja widocznoĹ›ci sekcji.
- UdostÄ™pnianie prognozy linkiem przez `lat`, `lon`, `city`, `units`, `theme`.
- Canvasowa mapa pogodowa z kaflami CARTO, warstwami temperatury/opadĂłw/wiatru/chmur, popupami i declutteringiem etykiet.

## Struktura

- `src/api` â€” integracje Open-Meteo i mapowe batch requesty.
- `src/components` â€” renderowanie UI, modali, kart, statusu i paneli.
- `src/features` â€” alerty, komfort, ubranie, najbliĹĽsze godziny, porĂłwnanie i moduĹ‚y mapy.
- `src/services` â€” cache, PWA, ustawienia, geolokalizacja, motyw, jednostki, share.
- `src/state` â€” centralny stan aplikacji.
- `src/utils` â€” daty, jednostki, kody pogody, DOM, kolory.
- `src/styles` â€” CSS aplikacji i mapy.
- `public` â€” manifest, service worker i ikony PWA.

Uwaga: mapa ma dwa poziomy katalogu miast. `public/data/world-cities.min.json` jest katalogiem bazowym z wiÄ™kszymi miastami, a `public/data/world-cities-detail/` zawiera shardy mniejszych miejscowoĹ›ci z GeoNames `cities500`, Ĺ‚adowane dopiero przy wiÄ™kszym zoomie.

## Hosting statyczny

Projekt ma `base: './'` w `vite.config.js`, wiÄ™c build jest odporniejszy na hosting pod katalogiem, np. GitHub Pages. Service worker i manifest uĹĽywajÄ… Ĺ›cieĹĽek wzglÄ™dnych.

## Offline

Service worker cacheâ€™uje app shell i zasoby statyczne. Dane pogodowe sÄ… zapisywane w `localStorage` jako `weather_cache_v3_*`; po starcie aplikacja moĹĽe natychmiast pokazaÄ‡ cache i odĹ›wieĹĽyÄ‡ dane w tle, jeĹ›li poĹ‚Ä…czenie dziaĹ‚a. Cache mapy ma TTL 20 minut i klucze `map_weather_cache_v1_*`.

## Logi

- Logi uruchomienia lokalnego serwera: `logs/vite-dev-*.log` albo `logs/vite-preview-*.log`.
- Logi dzialania aplikacji w przegladarce: `localStorage` pod kluczem `weather_runtime_logs_v1`.
- Eksport logow runtime: panel ustawien -> `Eksportuj logi`.

## Katalog miast mapy

Mapa używa ręcznego katalogu bazowego, pliku `public/data/world-cities.min.json` oraz shardów `public/data/world-cities-detail/*.json`. Katalog bazowy pochodzi z `cities15000`, a shardy szczegółowe z GeoNames `cities500`, po odfiltrowaniu rekordów niebędących miejscowościami, np. dzielnic `PPLX`. Shardy są pobierane tylko dla widocznego obszaru mapy przy większym zoomie.

Aktualizacja:

```bash
curl -L -o .cache/geonames/cities15000.txt https://cdn.jsdelivr.net/npm/cities15000/cities15000.txt
curl -L -o .cache/geonames/cities500.zip https://download.geonames.org/export/dump/cities500.zip
unzip -o .cache/geonames/cities500.zip -d .cache/geonames/cities500
node scripts/generate-world-cities.mjs
```

## Dane bezpieczeĹ„stwa

Dataset `src/data/safety/gpi-2025.json` jest generowany z oficjalnego pliku CSV Vision of Humanity:

`https://www.visionofhumanity.org/wp-content/uploads/2025/06/GPI_2025_2025.csv`

Aktualizacja rÄ™czna:

```bash
# pobierz aktualny CSV GPI z Vision of Humanity i wygeneruj JSON z polami:
# iso3, country, year, rank, score, category, sourceUrl
```

World Bank / UNODC homicide rate jest pobierany z API World Bank i cache'owany per ISO3 przez 7 dni. OstrzeĹĽenia podrĂłĹĽne gov.pl i Government of Canada sÄ… cache'owane przez 24h. Wikivoyage Stay safe jest traktowane jako opisowe wskazĂłwki city-level, nie jako indeks.

## Waluty i koszty

Kursy walut sÄ… pobierane najpierw z publicznego API NBP (`https://api.nbp.pl/api/`) na podstawie tabel A/B i przeliczane krzyĹĽowo przez PLN. Frankfurter pozostaje tylko fallbackiem dla par, ktĂłrych NBP nie obsĹ‚uguje. Lista walut w ustawieniach rĂłwnieĹĽ prĂłbuje najpierw uĹĽyÄ‡ NBP.

Karty kosztĂłw nie symulujÄ… cen. Produkty pochodzÄ… z Open Prices / Open Food Facts, a ceny podrĂłĹĽnicze z listingĂłw Wikivoyage, jeĹ›li realnie wystÄ™pujÄ… w ĹşrĂłdle. Numbeo i Expatistan nie sÄ… scrapowane. LivingCost.net jest tylko opcjonalnym ĹşrĂłdĹ‚em z wĹ‚asnym kluczem uĹĽytkownika.

## Ograniczenia mapy

Warstwy pogodowe sÄ… interpolowanÄ… wizualizacjÄ… na podstawie ograniczonej siatki miast i punktĂłw, nie peĹ‚nÄ… mapÄ… meteorologicznÄ… ani radarem. Kafle CARTO/OSM nie powinny byÄ‡ uĹĽywane do bardzo duĹĽego ruchu bez zmiany providera w konfiguracji.
