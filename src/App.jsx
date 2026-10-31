import React, { useState, useEffect, useRef } from 'react';
import TitleBar from './components/TitleBar';
import TopographyBackground from './components/TopographyBackground';
import TimerFull from './components/TimerFull';
import MiniWidget from './components/MiniWidget';
import SettingsModal from './components/SettingsModal';
import PlaylistsSidebar from './components/PlaylistsSidebar';
import SplashScreen from './components/SplashScreen';
import { loadSettings, saveSettings, initSettings } from './services/storage';
import { playBellSound } from './services/sound';
import { getStoredAuth, fetchCurrentPlayback, initSpotifyAuth, getValidToken } from './services/spotifyWeb';

function generateMinutesBadge(mins, mode) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fundo circular com cor do modo (violeta neon para foco, esmeralda para descanso)
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fillStyle = mode === 'focus' ? '#7C3AED' : '#059669';
    ctx.fill();

    // Borda neon vibrante
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = mode === 'focus' ? '#C084FC' : '#34D399';
    ctx.stroke();

    // Minutos restantes
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.min(99, mins)), 16, 16.5);

    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [settings, setSettings] = useState(loadSettings);
  const [mode, setMode] = useState('focus'); // 'focus' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaylistsOpen, setIsPlaylistsOpen] = useState(false);
  const [webAlbumArt, setWebAlbumArt] = useState(null);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(() => Boolean(getStoredAuth().accessToken));

  // Estado da mídia / Spotify conectado
  const [mediaState, setMediaState] = useState({
    running: false,
    status: 'not_running',
    title: '',
    artist: '',
    album: '',
    source: 'Spotify',
  });

  const timerRef = useRef(null);

  // Calcula duração total do modo atual em segundos
  const getTotalDuration = () => {
    switch (mode) {
      case 'focus':
        return settings.focusDuration * 60;
      case 'shortBreak':
        return settings.shortBreakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
      default:
        return 25 * 60;
    }
  };

  // Inicializa status do Always on Top pelo Electron
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getAlwaysOnTop().then((flag) => {
        setIsAlwaysOnTop(Boolean(flag));
      });
    }
  }, []);

  // Inicialização do Spotify Auth & Configurações persistentes no disco (%APPDATA%)
  useEffect(() => {
    async function init() {
      // 1. Carrega configurações salvas no disco
      const diskSettings = await initSettings();
      if (diskSettings) {
        setSettings(diskSettings);
      }

      // 2. Carrega credenciais do Spotify salvas no disco
      const auth = await initSpotifyAuth();
      if (auth?.clientId && (auth.refreshToken || auth.accessToken)) {
        // Renova ou valida o token de forma silenciosa e automática
        const validToken = await getValidToken();
        setIsSpotifyConnected(Boolean(validToken));
      } else {
        setIsSpotifyConnected(Boolean(auth?.accessToken));
      }
    }
    init();
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, currentCycle, settings]);

  // Ao completar um ciclo
  const handleTimerComplete = () => {
    if (settings.soundEnabled) {
      playBellSound(settings.soundVolume / 100, settings.soundType || 'tibetan');
    }

    // Notificação do sistema operacional
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = mode === 'focus' ? 'Hora de descansar!' : 'Hora de focar!';
      const body =
        mode === 'focus'
          ? 'Parabéns pelo foco! Faça uma pausa revigorante.'
          : 'Pausa encerrada! Pronto para o próximo ciclo?';
      new Notification(title, { body });
    }

    const shouldAutoStart = Boolean(settings.autoStartCycles);

    if (mode === 'focus') {
      if (currentCycle >= settings.cyclesTarget) {
        // Pausa Longa
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        setCurrentCycle(1);
        setIsRunning(shouldAutoStart);
      } else {
        // Pausa Curta
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        setIsRunning(shouldAutoStart);
      }
    } else {
      // Retorna ao Foco
      if (mode === 'shortBreak') {
        setCurrentCycle((prev) => prev + 1);
      }
      setMode('focus');
      setTimeLeft(settings.focusDuration * 60);
      setIsRunning(shouldAutoStart);
    }
  };

  // Sincroniza estado com a Barra de Tarefas do Windows e Bandeja (Tray)
  useEffect(() => {
    const totalDuration = getTotalDuration();
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    let modeLabel = 'Foco';
    if (mode === 'shortBreak') modeLabel = 'Pausa';
    if (mode === 'longBreak') modeLabel = 'Pausa Longa';

    const overlayDataUrl = isRunning ? generateMinutesBadge(mins, mode) : null;

    if (window.electronAPI && window.electronAPI.updateTimerState) {
      window.electronAPI.updateTimerState({
        timeLeft,
        totalDuration,
        mode,
        currentCycle,
        cyclesTarget: settings.cyclesTarget,
        isRunning,
        overlayDataUrl,
      });
    }

    document.title = `(${timeStr}) ${modeLabel} • Neon Pomodoro`;
  }, [timeLeft, mode, isRunning, currentCycle, settings]);

  // Listener para sincronização de modo mini (ex: quando minimizado)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onMiniModeChange) {
      const cleanup = window.electronAPI.onMiniModeChange((mini) => {
        setIsMiniMode(mini);
      });
      return cleanup;
    }
  }, []);

  // Listener para ações disparadas pela bandeja (Tray context menu)
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onTrayAction) {
      const cleanup = window.electronAPI.onTrayAction((action) => {
        if (action === 'toggle-play') {
          handleTogglePlay();
        } else if (action === 'skip') {
          handleSkip();
        } else if (action === 'reset') {
          handleReset();
        }
      });
      return cleanup;
    }
  }, [isRunning, mode, currentCycle, settings]);

  // Solicitar permissão de notificação nativa
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Sincronização em tempo real com Spotify / Windows Media
  useEffect(() => {
    if (window.electronAPI) {
      if (window.electronAPI.getMediaState) {
        window.electronAPI.getMediaState().then((state) => {
          if (state) setMediaState(state);
        });
      }
      if (window.electronAPI.onMediaUpdate) {
        const cleanup = window.electronAPI.onMediaUpdate((state) => {
          if (state) setMediaState(state);
        });
        return cleanup;
      }
    }
  }, []);

  const handleMediaControl = (action) => {
    if (window.electronAPI && window.electronAPI.controlMedia) {
      window.electronAPI.controlMedia(action);
    }
  };

  // Atualiza status de conexão quando a modal de configurações fecha
  useEffect(() => {
    setIsSpotifyConnected(Boolean(getStoredAuth().accessToken));
  }, [isSettingsOpen]);

  // Se conectado ao Spotify, busca a capa oficial do álbum em alta resolução
  useEffect(() => {
    if (isSpotifyConnected && mediaState.status === 'playing') {
      fetchCurrentPlayback()
        .then((data) => {
          if (data?.albumArt) {
            setWebAlbumArt(data.albumArt);
          }
        })
        .catch(() => {});
    }
  }, [mediaState.title, mediaState.status, isSpotifyConnected]);

  // Alternar Play / Pause
  const handleTogglePlay = async () => {
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    if (nextRunning) {
      // Se configurado para modo mini ao iniciar
      if (settings.autoMiniModeOnStart && !isMiniMode) {
        await handleSetMiniMode(true);
      }

      // Se configurado para Always on Top ao iniciar
      if (settings.alwaysOnTop && !isAlwaysOnTop) {
        await handleToggleAlwaysOnTop(true);
      }
    }
  };

  // Resetar Timer
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(getTotalDuration());
  };

  // Pular Ciclo
  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      if (currentCycle >= settings.cyclesTarget) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        setCurrentCycle(1);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
      }
    } else {
      if (mode === 'shortBreak') {
        setCurrentCycle((prev) => prev + 1);
      }
      setMode('focus');
      setTimeLeft(settings.focusDuration * 60);
    }
  };

  // Mudar Modo manualmente
  const handleChangeMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    switch (newMode) {
      case 'focus':
        setTimeLeft(settings.focusDuration * 60);
        break;
      case 'shortBreak':
        setTimeLeft(settings.shortBreakDuration * 60);
        break;
      case 'longBreak':
        setTimeLeft(settings.longBreakDuration * 60);
        break;
    }
  };

  // Alternar Modo Mini Widget
  const handleSetMiniMode = async (targetMini) => {
    if (targetMini && isPlaylistsOpen) {
      setIsPlaylistsOpen(false);
      if (window.electronAPI?.setSidebarExpanded) {
        await window.electronAPI.setSidebarExpanded(false);
      }
    }
    setIsMiniMode(targetMini);
    if (window.electronAPI) {
      await window.electronAPI.setMiniMode(targetMini);
    }
  };

  // Alternar / Abrir / Ocultar Aba Lateral de Playlists do Spotify
  const handleTogglePlaylists = async (forceVal) => {
    const nextVal = typeof forceVal === 'boolean' ? forceVal : !isPlaylistsOpen;
    setIsPlaylistsOpen(nextVal);
    if (window.electronAPI?.setSidebarExpanded) {
      await window.electronAPI.setSidebarExpanded(nextVal);
    }
  };

  // Abrir tela de configurações
  const handleOpenSettings = async () => {
    if (isPlaylistsOpen) {
      await handleTogglePlaylists(false);
    }
    setIsSettingsOpen(true);
  };

  // Alternar Always on Top
  const handleToggleAlwaysOnTop = async (explicitValue) => {
    const targetState = explicitValue !== undefined ? explicitValue : !isAlwaysOnTop;
    setIsAlwaysOnTop(targetState);
    if (window.electronAPI) {
      await window.electronAPI.setAlwaysOnTop(targetState);
    }
  };

  // Salvar Configurações
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);

    // Atualiza o tempo restante se estiver parado
    if (!isRunning) {
      if (mode === 'focus') setTimeLeft(newSettings.focusDuration * 60);
      if (mode === 'shortBreak') setTimeLeft(newSettings.shortBreakDuration * 60);
      if (mode === 'longBreak') setTimeLeft(newSettings.longBreakDuration * 60);
    }
  };

  const totalDuration = getTotalDuration();
  const progress = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;

  // Se estiver em modo mini widget flutuante
  if (isMiniMode) {
    return (
      <div className="w-screen h-screen bg-transparent p-0 m-0 overflow-hidden">
        <MiniWidget
          timeLeft={timeLeft}
          isRunning={isRunning}
          mode={mode}
          currentCycle={currentCycle}
          cyclesTarget={settings.cyclesTarget}
          progress={progress}
          onTogglePlay={handleTogglePlay}
          onSkip={handleSkip}
          onExpand={() => handleSetMiniMode(false)}
          opacity={settings.widgetOpacity}
          mediaState={mediaState}
          onMediaControl={handleMediaControl}
        />
      </div>
    );
  }

  // Modo Janela Completa
  return (
    <div className="w-screen h-screen flex flex-col bg-deep-void text-white relative overflow-hidden rounded-2xl border border-dark-border/60 shadow-neon-lg">
      {/* Title Bar com arrastador e botões nativos */}
      <TitleBar
        isAlwaysOnTop={isAlwaysOnTop}
        onToggleAlwaysOnTop={() => handleToggleAlwaysOnTop()}
        onOpenSettings={handleOpenSettings}
        onCloseSettings={() => setIsSettingsOpen(false)}
        isSettingsOpen={isSettingsOpen}
        onToggleMiniMode={() => handleSetMiniMode(true)}
      />

      {/* Arte Topográfica de Fundo (Montanhas Neon Violeta da Referência) */}
      <TopographyBackground />

      {/* Corpo Horizontal: Home + Aba Lateral de Playlists */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative z-10">
        {/* Painel Principal (Home - Pomodoro Timer) */}
        <div
          className={`h-full flex flex-col justify-between overflow-hidden transition-all duration-300 ${
            isPlaylistsOpen ? 'w-[380px] shrink-0 border-r border-dark-border/60' : 'w-full'
          }`}
        >
          <TimerFull
            timeLeft={timeLeft}
            totalDuration={totalDuration}
            isRunning={isRunning}
            mode={mode}
            currentCycle={currentCycle}
            cyclesTarget={settings.cyclesTarget}
            autoStartCycles={settings.autoStartCycles}
            mediaState={mediaState}
            onMediaControl={handleMediaControl}
            showMusicPlayer={settings.showMusicPlayer ?? true}
            isPlaylistsOpen={isPlaylistsOpen}
            onTogglePlaylists={handleTogglePlaylists}
            isConnected={isSpotifyConnected}
            albumArt={webAlbumArt}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            onSkip={handleSkip}
            onToggleMiniMode={() => handleSetMiniMode(true)}
          />
        </div>

        {/* Aba Lateral de Playlists (Mantém a Home visível) */}
        {isPlaylistsOpen && (
          <aside className="flex-1 h-full min-w-[320px] bg-dark-bg/95 backdrop-blur-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-3 duration-200">
            <PlaylistsSidebar
              onClose={() => handleTogglePlaylists(false)}
              onTrackPlayed={() => {}}
            />
          </aside>
        )}
      </div>

      {/* Modal / Tela de Configurações */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Landing / Splash Screen com ícone e carregamento em volta */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}
    </div>
  );
}
