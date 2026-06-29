const fs = require('fs');

function cleanAppState() {
  const file = 'src/state/appState.js';
  let content = fs.readFileSync(file, 'utf8');

  // Remove appMode definition
  content = content.replace(/const initialMode = readString\(STORAGE_KEYS\.appMode, 'weather'\);\n/g, '');
  // Remove appMode from state
  content = content.replace(/  appMode: initialMode === 'tourism' \? 'tourism' : 'weather',\n/g, '');
  // Remove tourism object from state
  content = content.replace(/  tourism: \{\n    loading: false,\n    data: null,\n    error: '',\n  \},\n/g, '');
  // Remove setAppMode
  content = content.replace(/export function setAppMode\(mode\) \{\n  appState\.appMode = mode === 'tourism' \? 'tourism' : 'weather';\n\}\n\n/g, '');
  // Remove setTourism
  content = content.replace(/export function setTourism\(partial\) \{\n  appState\.tourism = \{ \.\.\.appState\.tourism, \.\.\.partial \};\n\}\n\n?/g, '');

  fs.writeFileSync(file, content, 'utf8');
}

function cleanMain() {
  const file = 'src/main.js';
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/import \{ loadTourismForCurrentLocation, renderTourismView \} from '\.\/components\/tourismView\.js';\n/g, '');
  content = content.replace(/let pendingTourismAfterLocationResolve = false;\n/g, '');
  
  // Remove the pendingTourism check in performLocationSearch
  content = content.replace(/    if \(pendingTourismAfterLocationResolve && !tourismUnavailableForCurrentLocation\(\)\) \{\n      pendingTourismAfterLocationResolve = false;\n      setAppMode\('tourism'\);\n    \}\n/g, '');
  content = content.replace(/    if \(appState\.appMode === 'tourism'\) \{\n      loadTourismForCurrentLocation\(\);\n    \}\n/g, '');
  content = content.replace(/    if \(appState\.appMode === 'tourism'\) loadTourismForCurrentLocation\(\);\n/g, '');
  
  // Remove the tourism functions
  const f1 = /function tourismUnavailableForCurrentLocation\(\) \{[\s\S]*?\}\n\n/g;
  const f2 = /function updateModeAvailability\(\) \{[\s\S]*?\}\n\n/g;
  const f3 = /function applyAppMode\(\) \{[\s\S]*?\}\n\n/g;
  const f4 = /function switchMode\(mode\) \{[\s\S]*?\}\n\n/g;

  content = content.replace(f1, '');
  content = content.replace(f2, '');
  content = content.replace(f3, '');
  content = content.replace(f4, '');

  content = content.replace(/  if \(appState\.appMode === 'tourism'\) loadTourismForCurrentLocation\(\);\n/g, '');

  // Remove the event listeners for modeWeatherBtn and modeTourismBtn
  content = content.replace(/  byId\('modeWeatherBtn'\)\?\.addEventListener\('click', \(\) => switchMode\('weather'\)\);\n/g, '');
  content = content.replace(/  byId\('modeTourismBtn'\)\?\.addEventListener\('click', \(\) => switchMode\('tourism'\)\);\n/g, '');

  fs.writeFileSync(file, content, 'utf8');
}

cleanAppState();
cleanMain();
console.log('Done cleaning tourism from state and main');
