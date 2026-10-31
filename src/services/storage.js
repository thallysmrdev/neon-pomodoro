const STORAGE_KEY = 'neon_pomodoro_settings';

export const DEFAULT_SETTINGS = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesTarget: 4,
  autoStartCycles: false, // Modo automático: inicia o próximo passo automaticamente
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  soundVolume: 80,
  soundType: 'tibetan',
  alwaysOnTop: true,
  autoMiniModeOnStart: true,
  widgetOpacity: 95,
  showMusicPlayer: true,
};

let cachedSettings = null;

export const loadSettings = () => {
  if (cachedSettings) return cachedSettings;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      return cachedSettings;
    }
  } catch (e) {
    console.error('Falha ao carregar configurações:', e);
  }
  return DEFAULT_SETTINGS;
};

export const initSettings = async () => {
  try {
    if (window.electronAPI?.getStoredSettings) {
      const diskSettings = await window.electronAPI.getStoredSettings();
      if (diskSettings && typeof diskSettings === 'object') {
        cachedSettings = { ...DEFAULT_SETTINGS, ...diskSettings };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedSettings));
        } catch (e) {}
        return cachedSettings;
      }
    }
  } catch (e) {
    console.error('Falha ao carregar configurações do disco:', e);
  }
  return loadSettings();
};

export const saveSettings = (newSettings) => {
  cachedSettings = newSettings;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  } catch (e) {
    console.error('Falha ao salvar configurações no localStorage:', e);
  }
  if (window.electronAPI?.saveSettings) {
    window.electronAPI.saveSettings(newSettings).catch((err) => {
      console.error('Falha ao salvar configurações no disco:', err);
    });
  }
};
