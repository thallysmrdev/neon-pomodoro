import React from 'react';
import { Play, Pause, SkipForward, Maximize2, Minus, Flame, Coffee, Sparkles, Music2 } from 'lucide-react';
import { playClickSound } from '../services/sound';

export default function MiniWidget({
  timeLeft,
  isRunning,
  mode,
  currentCycle,
  cyclesTarget,
  progress,
  onTogglePlay,
  onSkip,
  onExpand,
  opacity = 95,
  mediaState,
  onMediaControl,
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getModeInfo = () => {
    switch (mode) {
      case 'focus':
        return {
          label: 'Foco',
          icon: <Flame className="w-3.5 h-3.5 text-neon-purple animate-pulse" />,
          color: 'text-neon-glow',
        };
      case 'shortBreak':
        return {
          label: 'Pausa Curta',
          icon: <Coffee className="w-3.5 h-3.5 text-emerald-400" />,
          color: 'text-emerald-400',
        };
      case 'longBreak':
        return {
          label: 'Pausa Longa',
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
          color: 'text-amber-400',
        };
      default:
        return { label: 'Foco', icon: null, color: 'text-neon-glow' };
    }
  };

  const modeInfo = getModeInfo();

  return (
    <div
      style={{ opacity: opacity / 100 }}
      className="w-full h-full flex flex-col justify-between p-2 rounded-2xl bg-dark-bg/95 border border-dark-border/80 shadow-neon-lg drag-region backdrop-blur-xl select-none relative overflow-hidden transition-opacity duration-300"
    >
      {/* Background subtle neon glow */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-neon-purple/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: Status info + Window Controls */}
      <div className="flex items-center justify-between text-[11px] px-1">
        <div className="flex items-center space-x-1.5 font-medium min-w-0 max-w-[200px]">
          {modeInfo.icon}
          <span className={`${modeInfo.color} font-semibold tracking-wide shrink-0`}>
            {modeInfo.label}
          </span>
          {mediaState?.status === 'playing' && mediaState.title ? (
            <div
              onClick={() => onMediaControl && onMediaControl('play-pause')}
              title={`Spotify: ${mediaState.title} - ${mediaState.artist} (Clique para pausar/tocar)`}
              className="flex items-center space-x-1 text-[10px] text-emerald-400 font-medium truncate no-drag cursor-pointer hover:underline"
            >
              <span>•</span>
              <Music2 className="w-2.5 h-2.5 shrink-0 inline animate-pulse" />
              <span className="truncate">{mediaState.title}</span>
            </div>
          ) : (
            <span className="text-text-secondary text-[10px] font-mono shrink-0">
              ({currentCycle}/{cyclesTarget})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-0.5 no-drag">
          {/* Minimizar tradicional para a barra */}
          <button
            onClick={() => {
              playClickSound();
              if (window.electronAPI) {
                window.electronAPI.minimizeWindow({ forceTraditional: true });
              }
            }}
            title="Minimizar para a barra de tarefas do Windows"
            className="p-1 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>

          {/* Expandir para janela cheia */}
          <button
            onClick={() => {
              playClickSound();
              onExpand();
            }}
            title="Expandir para tela completa"
            className="p-1 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Middle row: Large Timer + Quick Controls */}
      <div className="flex items-center justify-between px-1">
        {/* Digits */}
        <div className="font-mono text-2xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]">
          {formatTime(timeLeft)}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1.5 no-drag">
          {/* Play/Pause */}
          <button
            onClick={() => {
              playClickSound();
              onTogglePlay();
            }}
            title={isRunning ? 'Pausar' : 'Iniciar'}
            className="w-8 h-8 rounded-full flex items-center justify-center glow-btn text-white shadow-neon-btn"
          >
            {isRunning ? (
              <Pause className="w-3.5 h-3.5 fill-white" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
            )}
          </button>

          {/* Skip */}
          <button
            onClick={() => {
              playClickSound();
              onSkip();
            }}
            title="Pular intervalo"
            className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-white hover:bg-dark-surface border border-dark-border/50 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="w-full bg-dark-surface/80 rounded-full h-1 overflow-hidden mt-0.5">
        <div
          className="h-full bg-gradient-to-r from-neon-violet to-neon-glow transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
