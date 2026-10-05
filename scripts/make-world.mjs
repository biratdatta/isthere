// Builds public/geo/world.json: land dots for the live globe + country centroids (ISO alpha-2 → [lon, lat]).
// One-off; the output is committed. To regenerate:
//   npm i --no-save world-atlas@2 topojson-client@3 d3-geo@3 i18n-iso-countries@7 && node scripts/make-world.mjs
import fs from 'node:fs';
import { feature } from 'topojson-client';
import { geoContains, geoCentroid } from 'd3-geo';
import countries from 'i18n-iso-countries';
const land110 = JSON.parse(fs.readFileSync('node_modules/world-atlas/land-110m.json', 'utf8'));
const c110 = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-110m.json', 'utf8'));
const land = feature(land110, land110.objects.land);
const dots = [];
const STEP = 2.2;
for (let lat = -58; lat <= 82; lat += STEP) {
  const n = Math.max(8, Math.round((360 / STEP) * Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < n; i++) {
    const lon = -180 + (360 / n) * i;
    if (geoContains(land, [lon, lat])) dots.push([Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
  }
}
const cents = {};
for (const f of feature(c110, c110.objects.countries).features) {
  const a2 = countries.numericToAlpha2(String(f.id).padStart(3, '0'));
  if (a2) {
    const [lon, lat] = geoCentroid(f);
    cents[a2] = [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10];
  }
}
// Small countries missing from the 110m map
Object.assign(cents, { SG: [103.8, 1.35], HK: [114.2, 22.3], MT: [14.4, 35.9], BH: [50.6, 26.1], MU: [57.6, -20.3], LU: [6.1, 49.8], MC: [7.4, 43.7], AD: [1.5, 42.5], LI: [9.55, 47.15], BB: [-59.55, 13.15], MV: [73.5, 4.2] });
fs.writeFileSync('public/geo/world.json', JSON.stringify({ dots, cents }));
console.log(dots.length, Object.keys(cents).length, fs.statSync('public/geo/world.json').size);
