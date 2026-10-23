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
};

export const loadSettings = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Falha ao carregar configurações:', e);
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (newSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
  } catch (e) {
    console.error('Falha ao salvar configurações:', e);
  }
};
