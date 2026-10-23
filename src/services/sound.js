// Sistema de Áudio e Notificações Sonoras para o Neon Pomodoro

export const BELL_SOUNDS = [
  { id: 'tibetan', name: 'Sino Tibetano Zen (528Hz)', file: 'sounds/bell-tibetan.wav' },
  { id: 'crystal', name: 'Sino de Cristal Shimmer', file: 'sounds/bell-crystal.wav' },
  { id: 'classic', name: 'Sino Clássico Ding', file: 'sounds/bell-classic.wav' },
];

let audioCtx = null;

function getAudioContext() {
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

// Fallback sintetizado puro caso o arquivo não seja carregado
function playSynthesizedBell(volume = 0.8) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const frequencies = [528, 1056, 1584, 2112];
    const gains = [0.5, 0.25, 0.12, 0.05];
    const decays = [3.5, 2.5, 1.8, 1.0];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gains[idx] * volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decays[idx]);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decays[idx] + 0.1);
    });
  } catch (err) {
    console.warn('Erro na síntese WebAudio:', err);
  }
}

export const playBellSound = (volume = 0.8, soundType = 'tibetan') => {
  try {
    const selected = BELL_SOUNDS.find((s) => s.id === soundType) || BELL_SOUNDS[0];
    const audio = new Audio(selected.file);
    audio.volume = Math.max(0, Math.min(1, volume));
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Fallback para síntese Web Audio:', err);
        playSynthesizedBell(volume);
      });
    }
  } catch (err) {
    playSynthesizedBell(volume);
  }
};

export const playClickSound = (volume = 0.3) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.035);

    gain.gain.setValueAtTime(0.06 * volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (err) {
    // Silencia erros em cliques
  }
};
