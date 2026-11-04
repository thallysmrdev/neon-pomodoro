import React, { useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Maximize2, Minus, Flame, Coffee, Sparkles, Music2, Volume2, Volume1, VolumeX } from 'lucide-react';
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
  albumArt,
  spotifyVolume,
  onVolumeChange,
}) {
  const isPlayingMusic = mediaState?.status === 'playing';
  const hasMusicTrack = Boolean(mediaState?.title);
  const isMusicRunning = Boolean(mediaState?.running);

  const [showMiniVol, setShowMiniVol] = useState(false);
  const [isAdjustingMiniVol, setIsAdjustingMiniVol] = useState(false);
  const [lastMiniVol, setLastMiniVol] = useState(spotifyVolume || 70);

  const handleMiniToggleMute = (e) => {
    e.stopPropagation();
    playClickSound();
    if (onVolumeChange) {
      if (spotifyVolume > 0) {
        setLastMiniVol(spotifyVolume);
        onVolumeChange(0);
      } else {
        onVolumeChange(lastMiniVol || 70);
      }
    }
  };

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
      className="w-full h-full flex flex-col justify-between p-2.5 rounded-2xl bg-dark-bg/95 border border-dark-border/80 shadow-neon-lg drag-region backdrop-blur-xl select-none relative overflow-hidden transition-opacity duration-300"
    >
      {/* Background subtle neon glow */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-neon-purple/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: Status info + Window Controls */}
      <div className="flex items-center justify-between text-[11px] px-0.5">
        <div className="flex items-center space-x-1.5 font-medium">
          {modeInfo.icon}
          <span className={`${modeInfo.color} font-semibold tracking-wide`}>
            {modeInfo.label}
          </span>
          <span className="text-text-secondary text-[10px] font-mono">
            ({currentCycle}/{cyclesTarget})
          </span>
        </div>

        <div className="flex items-center space-x-1 no-drag">
          {/* Minimizar tradicional para a barra */}
          <button
            onClick={() => {
              playClickSound();
              if (window.electronAPI) {
                window.electronAPI.minimizeWindow({ forceTraditional: true });
              }
            }}
            title="Minimizar para a barra de tarefas do Windows"
            className="p-1 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors cursor-pointer"
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
            className="p-1 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Middle row: Large Timer + Pomodoro Quick Controls */}
      <div className="flex items-center justify-between px-0.5">
        {/* Digits */}
        <div className="font-mono text-xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.4)] leading-none">
          {formatTime(timeLeft)}
        </div>

        {/* Action Buttons for Pomodoro */}
        <div className="flex items-center space-x-1.5 no-drag">
          {/* Play/Pause Pomodoro */}
          <button
            onClick={() => {
              playClickSound();
              onTogglePlay();
            }}
            title={isRunning ? 'Pausar Timer' : 'Iniciar Timer'}
            className="w-7 h-7 rounded-full flex items-center justify-center glow-btn text-white shadow-neon-btn cursor-pointer"
          >
            {isRunning ? (
              <Pause className="w-3 h-3 fill-white" />
            ) : (
              <Play className="w-3 h-3 fill-white ml-0.5" />
            )}
          </button>

          {/* Skip Pomodoro */}
          <button
            onClick={() => {
              playClickSound();
              onSkip();
            }}
            title="Pular intervalo"
            className="w-6 h-6 rounded-full flex items-center justify-center text-text-secondary hover:text-white hover:bg-dark-surface border border-dark-border/50 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Dedicated Spotify Mini Player Bar */}
      <div className="w-full bg-dark-card/80 border border-neon-purple/20 hover:border-neon-purple/40 rounded-xl px-2 py-1 flex items-center justify-between no-drag transition-all shadow-inner">
        {/* Cover Art / Icon + Music Title & Artist */}
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-1.5">
          {/* Capa da Música / Mini Equalizador */}
          <div className="relative w-6 h-6 rounded-md bg-neon-violet/20 border border-neon-purple/30 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {albumArt ? (
              <img
                src={albumArt}
                alt={mediaState?.title || 'Capa'}
                className="w-full h-full object-cover"
              />
            ) : isPlayingMusic ? (
              <div className="flex items-end justify-center space-x-0.5 h-2.5">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2" />
                <span className="w-0.5 bg-neon-glow rounded-full animate-pulse h-2.5" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-1.5" />
              </div>
            ) : (
              <Music2 className="w-3 h-3 text-neon-light/60 shrink-0" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-white truncate leading-tight">
              {hasMusicTrack ? mediaState.title : isMusicRunning ? 'Spotify Conectado' : 'Spotify Inativo'}
            </p>
            {hasMusicTrack && (
              <p className="text-[9px] text-text-secondary truncate leading-tight">
                {mediaState.artist || 'Música'}
              </p>
            )}
          </div>
        </div>

        {/* Music Controls */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              onMediaControl && onMediaControl('prev');
            }}
            title="Música anterior"
            className="p-1 rounded text-text-secondary hover:text-white hover:bg-dark-surface/80 transition-colors cursor-pointer"
          >
            <SkipBack className="w-2.5 h-2.5" />
          </button>

          <button
            onClick={() => {
              playClickSound();
              onMediaControl && onMediaControl('play-pause');
            }}
            title={isPlayingMusic ? 'Pausar música' : 'Tocar música'}
            className="w-5 h-5 rounded-full flex items-center justify-center glow-btn text-white shadow-neon-sm cursor-pointer"
          >
            {isPlayingMusic ? (
              <Pause className="w-2.5 h-2.5 fill-white" />
            ) : (
              <Play className="w-2.5 h-2.5 fill-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              playClickSound();
              onMediaControl && onMediaControl('next');
            }}
            title="Próxima música"
            className="p-1 rounded text-text-secondary hover:text-white hover:bg-dark-surface/80 transition-colors cursor-pointer"
          >
            <SkipForward className="w-2.5 h-2.5" />
          </button>

          {/* Ajuste de Volume no Mini Widget */}
          {onVolumeChange && (
            <div
              className="relative flex items-center group/minivol ml-0.5"
              onMouseEnter={() => setShowMiniVol(true)}
              onMouseLeave={() => setShowMiniVol(false)}
            >
              {/* Slider de Volume Expansível */}
              <div
                className={`flex items-center overflow-hidden transition-all duration-200 ease-out ${
                  showMiniVol || isAdjustingMiniVol
                    ? 'w-18 opacity-100 pr-1 pl-0.5'
                    : 'w-0 opacity-0 pointer-events-none'
                }`}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={spotifyVolume ?? 70}
                  onChange={(e) => {
                    setIsAdjustingMiniVol(true);
                    onVolumeChange(Number(e.target.value));
                  }}
                  onMouseUp={() => setIsAdjustingMiniVol(false)}
                  onTouchEnd={() => setIsAdjustingMiniVol(false)}
                  className="w-12 h-1 bg-dark-surface rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
                  title={`Volume do Spotify (${spotifyVolume ?? 70}%)`}
                />
                <span className="text-[8px] font-mono text-emerald-400 ml-1 select-none font-semibold">
                  {spotifyVolume ?? 70}%
                </span>
              </div>

              {/* Botão de volume / mute */}
              <button
                onClick={handleMiniToggleMute}
                title={`Volume do Spotify: ${spotifyVolume ?? 70}%`}
                className="p-1 rounded text-text-secondary hover:text-white hover:bg-dark-surface/80 transition-colors cursor-pointer shrink-0"
              >
                {spotifyVolume === 0 ? (
                  <VolumeX className="w-2.5 h-2.5 text-rose-400" />
                ) : spotifyVolume < 50 ? (
                  <Volume1 className="w-2.5 h-2.5 text-emerald-400" />
                ) : (
                  <Volume2 className="w-2.5 h-2.5 text-emerald-400" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="w-full bg-dark-surface/80 rounded-full h-1 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon-violet to-neon-glow transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
