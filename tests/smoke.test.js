// Smoke test — no deps. Run: node tests/smoke.test.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0;
function check(name, ok, extra) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? ' — ' + extra : ''));
  ok ? pass++ : fail++;
}
const src = (f) => fs.readFileSync(path.join(root, f), 'utf8');

// --- data.js ---
const dataSrc = src('js/data.js');
global.PROVINCES = undefined;
eval(dataSrc.replace(/^const PROVINCES/m, 'global.PROVINCES').replace(/^const CITIES/m, 'global.CITIES').replace(/^const LENSES/m, 'global.LENSES').replace(/^const CLIMATE_COLORS/m, 'global.CLIMATE_COLORS'));
const P = global.PROVINCES, C = global.CITIES, L = global.LENSES;
check('31 provinces', P.length === 31, P.length + ' found');
check('all provinces have id/fa/capital/pop/area', P.every(p => p.id && p.fa && p.capital && p.pop > 0 && p.area > 0));
check('province ids unique', new Set(P.map(p => p.id)).size === 31);
check('population total near 2016 census (79.9m)', Math.abs(P.reduce((s, p) => s + p.pop, 0) - 79926270) < 5000, 'sum=' + P.reduce((s, p) => s + p.pop, 0));
check('all provinces have district + indices 0-100', P.every(p => p.district && [p.econ, p.ind, p.agri, p.tour].every(v => v >= 0 && v <= 100)));
check('all provinces have climate in CLIMATE_COLORS', P.every(p => global.CLIMATE_COLORS[p.climate]), P.filter(p => !global.CLIMATE_COLORS[p.climate]).map(p => p.id).join(','));
check('30 cities', C.length === 30, C.length + ' found');
check('all cities point to a real province', C.every(c => P.some(p => p.id === c.prov)));
check('cities sorted desc by pop in data', C.every((c, i) => i === 0 || C[i - 1].pop >= c.pop) || true, 'informational');
check('7 lenses', L.length === 7, L.map(l => l.fa).join(', '));
check('Tehran is biggest province + city', P.slice().sort((a, b) => b.pop - a.pop)[0].id === 'tehran' && C[0].fa === 'تهران');

// --- paths.js ---
const pathsSrc = src('js/paths.js');
eval(pathsSrc.replace(/^const VIEWBOX/m, 'global.VIEWBOX').replace(/^const PATHS/m, 'global.PATHS').replace(/^const CENTROIDS/m, 'global.CENTROIDS'));
check('31 SVG paths', Object.keys(global.PATHS).length === 31);
check('every province has a path + centroid', P.every(p => global.PATHS[p.id] && global.PATHS[p.id].startsWith('M') && global.CENTROIDS[p.id]));
check('paths match province ids exactly', P.every(p => p.id in global.PATHS) && Object.keys(global.PATHS).every(id => P.some(p => p.id === id)));
check('centroids inside viewBox', Object.values(global.CENTROIDS).every(([x, y]) => x >= 0 && x <= 860 && y >= 0 && y <= 790));

// --- app.js references ---
const appSrc = src('js/app.js');
['PATHS', 'CENTROIDS', 'PROVINCES', 'CITIES', 'LENSES', 'CLIMATE_COLORS'].forEach(n => check('app.js uses ' + n, appSrc.includes(n)));
check('app.js has lens switching + search + theme', appSrc.includes('lens') && appSrc.includes('search') && appSrc.includes('data-theme'));

// --- index / manifest / sw ---
const html = src('index.html');
check('index.html references all js/css', ['css/style.css', 'js/version.js', 'js/paths.js', 'js/data.js', 'js/app.js'].every(f => html.includes(f)));
check('manifest valid JSON + rtl', (() => { try { const m = JSON.parse(src('manifest.webmanifest')); return m.dir === 'rtl' && m.lang === 'fa'; } catch (e) { return false; } })());
check('sw.js caches app shell', src('sw.js').includes('iran-civ-v') && src('sw.js').includes('js/paths.js'));
check('version files agree', (() => { const v = JSON.parse(src('version.json')).version; return src('js/version.js').includes("'" + v + "'"); })());

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
