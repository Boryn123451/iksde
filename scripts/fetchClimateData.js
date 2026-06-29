import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { HOT_NORTH, HOT_SOUTH, COLD_NORTH, COLD_SOUTH } from './extremeLocations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchClimateData() {
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Filter locations active in current month
  const activeHot = [...HOT_NORTH, ...HOT_SOUTH].filter(loc => loc.months.includes(currentMonth));
  const activeCold = [...COLD_NORTH, ...COLD_SOUTH].filter(loc => loc.months.includes(currentMonth));

  console.log(`Active hot locations for month ${currentMonth}: ${activeHot.length}`);
  console.log(`Active cold locations for month ${currentMonth}: ${activeCold.length}`);

  // We want data for the last 30 days
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2); // 2 days ago to ensure data is available in archive API
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 30);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  console.log(`Fetching data from ${startStr} to ${endStr}...`);

  // Batch requests to avoid URL length limits and rate limits (safe batch size: 50)
  const batchSize = 50;

  async function fetchBatch(locations, isHot) {
    let results = [];
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      
      const payload = {
        latitude: batch.map(loc => loc.lat),
        longitude: batch.map(loc => loc.lon),
        start_date: batch.map(() => startStr),
        end_date: batch.map(() => endStr),
        daily: batch.map(() => isHot ? 'temperature_2m_max' : 'temperature_2m_min'),
        timezone: batch.map(() => 'auto')
      };

      try {
        const response = await fetch('https://archive-api.open-meteo.com/v1/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          console.error(`API Error: ${response.status} ${response.statusText}`);
          const text = await response.text();
          console.error(text);
          continue;
        }

        const data = await response.json();
        // data is an array of responses if multiple locations were requested, or a single object if 1
        const responses = Array.isArray(data) ? data : [data];

        responses.forEach((res, index) => {
          const loc = batch[index];
          if (res && res.daily) {
            const temps = isHot ? res.daily.temperature_2m_max : res.daily.temperature_2m_min;
            const dates = res.daily.time;
            
            if (!temps || temps.length === 0) return;

            // Find max or min
            let extremeVal = isHot ? -Infinity : Infinity;
            let extremeDate = null;
            
            for (let j = 0; j < temps.length; j++) {
              const t = temps[j];
              if (t === null) continue;
              if (isHot && t > extremeVal) { extremeVal = t; extremeDate = dates[j]; }
              if (!isHot && t < extremeVal) { extremeVal = t; extremeDate = dates[j]; }
            }

            if (extremeDate) {
              results.push({
                name: loc.name,
                country: loc.country,
                temp: extremeVal,
                date: extremeDate,
                lat: loc.lat,
                lon: loc.lon
              });
            }
          }
        });

      } catch (err) {
        console.error(`Failed to fetch batch starting at index ${i}:`, err.message);
      }
      
      // Delay to respect rate limits (600/min means 10/sec, so 100ms between requests is safe, let's use 500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return results;
  }

  const hotResults = await fetchBatch(activeHot, true);
  const coldResults = await fetchBatch(activeCold, false);

  // Sort and pick top 10
  hotResults.sort((a, b) => b.temp - a.temp);
  coldResults.sort((a, b) => a.temp - b.temp);

  const topHot = hotResults.slice(0, 10);
  const topCold = coldResults.slice(0, 10);

  const finalData = {
    updated: new Date().toISOString(),
    start_date: startStr,
    end_date: endStr,
    hot: topHot,
    cold: topCold
  };

  const outPath = path.join(__dirname, '../public/data/climateStats.json');
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(finalData, null, 2), 'utf-8');
  console.log(`Saved climateStats.json with ${topHot.length} hot and ${topCold.length} cold extremes.`);
}

fetchClimateData().catch(console.error);
