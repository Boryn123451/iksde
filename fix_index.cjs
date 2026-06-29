const fs = require('fs');

const path = 'index.html';
const content = fs.readFileSync(path, 'utf8');

const heroMarker = '      <!-- Hero -->';
const insightsMarker = '      <!-- Insights -->';

const startIndex = content.indexOf(heroMarker);
// We want to find the LAST occurrence of Insights marker before other things, or just the regular one.
// Since there's only one Insights marker (hopefully) we can just indexOf it.
const endIndex = content.indexOf(insightsMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found");
  process.exit(1);
}

const correctHtml = `      <!-- Hero -->
      <div class="hero-card" id="heroCard">
        <div class="hero-bg-icon" id="heroBgIcon">☀️</div>
        <div class="hero-top">
          <div>
            <div id="heroIcon" class="hero-icon-main">—</div>
            <div id="heroDesc" class="hero-desc">—</div>
          </div>
          <div>
            <div id="heroTemp" class="hero-temp">—°</div>
            <div id="heroFeelsLike" class="hero-feels">Odczuwalna: —°</div>
          </div>
        </div>
        <div class="hero-mini-row">
          <div class="hero-mini-item">💧 <span class="val" id="heroHumidity">—</span>%</div>
          <div class="hero-mini-item">💨 <span class="val" id="heroWind">—</span> <span id="heroWindUnit">km/h</span> <span id="heroWindDir" style="color:var(--accent)">—</span></div>
          <div class="hero-mini-item">☁️ <span class="val" id="heroClouds">—</span>%</div>
          <div class="hero-mini-item">🌡️ <span class="val" id="heroPressure">—</span> <span id="heroPressureUnit">hPa</span></div>
        </div>
      </div>

      <!-- Hourly -->
      <div class="section-wrap" style="padding:0; animation: fadeSlideUp .4s ease .1s both;">
        <div id="hourlyStrip" class="hourly-strip"></div>
      </div>

      <!-- Daily -->
      <div id="dailyGrid" class="daily-grid"></div>

      <!-- Details -->
      <div id="detailsGrid" class="details-grid">
        <!-- Wind -->
        <div class="detail-tile">
          <div class="tile-label">💨 Wiatr</div>
          <div class="tile-value" id="tileWindSpeed">—</div>
          <div class="compass-wrap">
            <div id="tileWindCompass"></div>
            <span class="tile-sub" id="tileWindDir">—</span>
          </div>
        </div>
        <!-- Humidity -->
        <div class="detail-tile">
          <div class="tile-label">💧 Wilgotność</div>
          <div class="tile-value" id="tileHumidity">—</div>
          <div class="humidity-bar-wrap"><div class="humidity-bar-fill" id="tileHumidityBar" style="width:0%"></div></div>
        </div>
        <!-- Pressure -->
        <div class="detail-tile">
          <div class="tile-label">🌡️ Ciśnienie</div>
          <div class="tile-value" id="tilePressure">—</div>
          <div class="tile-sub" id="tilePressureArrow">—</div>
        </div>
        <!-- Cloud cover -->
        <div class="detail-tile">
          <div class="tile-label">☁️ Zachmurzenie</div>
          <div class="tile-value" id="tileClouds">—</div>
          <div class="humidity-bar-wrap"><div class="humidity-bar-fill" id="tileCloudsBar" style="width:0%;background:var(--muted)"></div></div>
        </div>
        <!-- Sunrise/sunset -->
        <div class="detail-tile">
          <div class="tile-label">🌅 Wschód / Zachód</div>
          <div style="display:flex;gap:1rem;font-family:'Space Mono';font-size:.95rem;font-weight:700">
            <span id="tileSunrise">—</span>
            <span style="color:var(--muted)">→</span>
            <span id="tileSunset">—</span>
          </div>
          <div id="tileSunArc" class="sun-arc-wrap"></div>
        </div>
        <!-- Feels like -->
        <div class="detail-tile">
          <div class="tile-label">🌡️ Odczuwalna</div>
          <div class="tile-value" id="tileFeelsLike">—</div>
          <div class="tile-sub" id="tileFeelsDiff">—</div>
        </div>
        <!-- Precipitation -->
        <div class="detail-tile">
          <div class="tile-label">🌂 Opady dziś</div>
          <div class="tile-value" id="tilePrecip">—</div>
          <div class="tile-sub" id="tilePrecipSub">mm</div>
        </div>
        <!-- UV -->
        <div class="detail-tile">
          <div class="tile-label">☀️ UV Index</div>
          <div class="tile-value" id="tileUV">—</div>
          <div id="tileUVGauge" style="width:100%;height:8px;border-radius:4px;background:linear-gradient(90deg,#56d364,#f0a500,#f85149,#bc8cff);margin:.2rem 0;position:relative;">
            <div id="tileUVIndicator" style="position:absolute;top:-2px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #000;left:0%;transform:translateX(-50%);transition:left .5s ease;"></div>
          </div>
          <div class="tile-sub" id="tileUVLabel">—</div>
        </div>
        <!-- Comfort -->
        <div class="detail-tile detail-tile--comfort" id="comfortSection">
          <div class="tile-label">😊 Komfort</div>
          <div class="comfort-ring-wrap" id="comfortRing"></div>
          <div class="tile-sub" id="comfortReasons"></div>
        </div>
      </div>

`;

const newContent = content.substring(0, startIndex) + correctHtml + content.substring(endIndex);
fs.writeFileSync(path, newContent, 'utf8');
console.log("Successfully fixed index.html structure");
