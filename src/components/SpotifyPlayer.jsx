import React, { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Music2, ListMusic, Volume2, Volume1, VolumeX } from 'lucide-react';
import { playClickSound } from '../services/sound';

export default function SpotifyPlayer({
  mediaState,
  onControl,
  onOpenPlaylists,
  onTogglePlaylists,
  isPlaylistsOpen = false,
  isConnected,
  albumArt,
  spotifyVolume,
  onVolumeChange,
}) {
  const isPlaying = mediaState?.status === 'playing';
  const hasTrack = Boolean(mediaState?.title);
  const isRunning = Boolean(mediaState?.running);

  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [isAdjustingVolume, setIsAdjustingVolume] = useState(false);
  const [lastNonZeroVolume, setLastNonZeroVolume] = useState(spotifyVolume || 70);

  const trackRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  const handleMouseEnterVolume = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsHoveringVolume(true);
  };

  const handleMouseLeaveVolume = () => {
    if (isAdjustingVolume) return;
    leaveTimeoutRef.current = setTimeout(() => {
      setIsHoveringVolume(false);
    }, 220);
  };

  const updateVolumeFromPointer = (e) => {
    if (!trackRef.current || !onVolumeChange) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clampedY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
    const percent = Math.round(((rect.bottom - clampedY) / rect.height) * 100);
    onVolumeChange(percent);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setIsAdjustingVolume(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateVolumeFromPointer(e);
  };

  const handlePointerMove = (e) => {
    if (isAdjustingVolume || e.buttons === 1) {
      updateVolumeFromPointer(e);
    }
  };

  const handlePointerUp = (e) => {
    setIsAdjustingVolume(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleWheelVolume = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onVolumeChange) return;
    const step = e.deltaY < 0 ? 5 : -5;
    const current = spotifyVolume ?? 70;
    onVolumeChange(Math.max(0, Math.min(100, current + step)));
  };

  const handlePrev = () => {
    playClickSound();
    onControl('prev');
  };

  const handleToggle = () => {
    playClickSound();
    onControl('play-pause');
  };

  const handleNext = () => {
    playClickSound();
    onControl('next');
  };

  const handleTogglePlaylistsClick = () => {
    playClickSound();
    if (onTogglePlaylists) {
      onTogglePlaylists();
    } else if (onOpenPlaylists) {
      onOpenPlaylists();
    }
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    playClickSound();
    if (onVolumeChange) {
      if (spotifyVolume > 0) {
        setLastNonZeroVolume(spotifyVolume);
        onVolumeChange(0);
      } else {
        onVolumeChange(lastNonZeroVolume || 70);
      }
    }
  };

  const renderVolumeIcon = () => {
    if (spotifyVolume === 0) {
      return <VolumeX className="w-3.5 h-3.5 text-rose-400" />;
    }
    if (spotifyVolume < 50) {
      return <Volume1 className="w-3.5 h-3.5 text-emerald-400" />;
    }
    return <Volume2 className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div className="w-full bg-dark-card/75 border border-neon-purple/25 hover:border-neon-purple/50 rounded-2xl p-2.5 backdrop-blur-md shadow-neon-sm transition-all duration-300">
      <div className="flex items-center justify-between space-x-2">
        {/* Left: Album Art / Animated Equalizer + Song Details */}
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          {/* Vinyl / Cover Art */}
          <div className="relative w-8 h-8 rounded-xl bg-neon-violet/15 border border-neon-purple/30 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            {albumArt ? (
              <img
                src={albumArt}
                alt={mediaState.title || 'Capa do Álbum'}
                className="w-full h-full object-cover"
              />
            ) : isPlaying ? (
              <div className="flex items-end justify-center space-x-0.5 h-3.5">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-2.5" />
                <span className="w-0.5 bg-neon-glow rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.15s] h-3.5" />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.3s] h-2" />
              </div>
            ) : (
              <Music2 className="w-4 h-4 text-neon-light/60" />
            )}
          </div>

          {/* Title & Artist */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-white truncate leading-tight">
                {hasTrack ? mediaState.title : isRunning ? 'Spotify Conectado' : 'Spotify Inativo'}
              </span>
              {isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0 animate-pulse" />
              )}
            </div>

            <p className="text-[10px] text-text-secondary truncate mt-0.5 leading-tight">
              {hasTrack
                ? mediaState.artist || 'Tocando agora'
                : isRunning
                ? 'Abra uma música para começar'
                : 'Inicie o Spotify no seu PC'}
            </p>
          </div>
        </div>

        {/* Right: Playback Controls & Playlists Button */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Toggle Playlists Lateral Drawer Button */}
          {isConnected && (
            <button
              onClick={handleTogglePlaylistsClick}
              title={isPlaylistsOpen ? 'Ocultar músicas da playlist' : 'Ver músicas da playlist atual'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer mr-0.5 shadow-sm ${
                isPlaylistsOpen
                  ? 'text-white bg-emerald-500/30 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                  : 'text-emerald-400 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Previous Track */}
          <button
            onClick={handlePrev}
            title="Música anterior"
            className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface/80 transition-colors cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Button */}
          <button
            onClick={handleToggle}
            title={isPlaying ? 'Pausar reprodução' : 'Iniciar reprodução'}
            className="w-7 h-7 rounded-full flex items-center justify-center glow-btn text-white shadow-neon-sm hover:scale-105 transition-transform cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-white" />
            ) : (
              <Play className="w-3 h-3 fill-white ml-0.5" />
            )}
          </button>

          {/* Next Track */}
          <button
            onClick={handleNext}
            title="Próxima música"
            className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface/80 transition-colors cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Ajuste de Volume Exclusivo do Spotify (Flutua para cima sobrepondo o que estiver acima) */}
          {onVolumeChange && (
            <div
              className="relative flex items-center group/vol ml-0.5"
              onMouseEnter={handleMouseEnterVolume}
              onMouseLeave={handleMouseLeaveVolume}
            >
              {/* Card Flutuante Vertical que sobe acima do player */}
              <div
                className={`absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 bg-dark-bg/95 border border-neon-purple/40 backdrop-blur-2xl shadow-[0_0_20px_rgba(0,0,0,0.85),0_0_12px_rgba(168,85,247,0.25)] rounded-2xl p-2.5 flex flex-col items-center justify-between transition-all duration-200 ease-out select-none ${
                  isHoveringVolume || isAdjustingVolume
                    ? 'opacity-100 pointer-events-auto translate-y-0 scale-100'
                    : 'opacity-0 pointer-events-none translate-y-2 scale-95'
                }`}
                style={{ width: '42px', height: '142px' }}
              >
                {/* Ponte invisível para passagem suave do cursor do mouse */}
                <div className="absolute top-full left-0 right-0 h-3 pointer-events-auto" />

                {/* Porcentagem Atual no Topo */}
                <span className="text-[10px] font-mono text-emerald-400 font-bold select-none leading-none pt-0.5">
                  {spotifyVolume ?? 70}%
                </span>

                {/* Trilho Vertical Interativo */}
                <div
                  ref={trackRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onWheel={handleWheelVolume}
                  className="relative flex-1 w-full flex items-center justify-center my-1.5 cursor-pointer touch-none"
                  title={`Volume do Spotify: ${spotifyVolume ?? 70}% (Role o scroll ou arraste)`}
                >
                  {/* Trilho Fundo */}
                  <div className="relative w-1.5 h-full bg-dark-surface border border-dark-border/80 rounded-full overflow-hidden shadow-inner">
                    {/* Barra Preenchida que sobe verticalmente */}
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] rounded-full transition-all duration-75"
                      style={{ height: `${spotifyVolume ?? 70}%` }}
                    />
                  </div>

                  {/* Thumb / Indicador que acompanha a altura da barra */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-400 shadow-[0_0_8px_#34d399] pointer-events-none transition-all duration-75"
                    style={{ bottom: `${spotifyVolume ?? 70}%` }}
                  />
                </div>

                {/* Rótulo inferior discreto */}
                <span className="text-[8px] font-mono text-text-secondary select-none font-semibold">
                  VOL
                </span>
              </div>

              {/* Botão de Volume / Mutar com feedback visual */}
              <button
                onClick={handleToggleMute}
                title={`Volume do Spotify: ${spotifyVolume ?? 70}% (${spotifyVolume === 0 ? 'Clique para desmutar' : 'Clique para mutar'})`}
                className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface/80 transition-colors cursor-pointer shrink-0"
              >
                {renderVolumeIcon()}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
