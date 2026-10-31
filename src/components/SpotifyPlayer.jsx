import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Music2, ListMusic, Sparkles } from 'lucide-react';
import { playClickSound } from '../services/sound';

export default function SpotifyPlayer({
  mediaState,
  onControl,
  onOpenPlaylists,
  isConnected,
  albumArt,
}) {
  const isPlaying = mediaState?.status === 'playing';
  const hasTrack = Boolean(mediaState?.title);
  const isRunning = Boolean(mediaState?.running);

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

  const handleOpenPlaylistsClick = () => {
    playClickSound();
    if (onOpenPlaylists) onOpenPlaylists();
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
          {/* Open Playlists Drawer Button */}
          {isConnected && (
            <button
              onClick={handleOpenPlaylistsClick}
              title="Abrir Playlists do Spotify"
              className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer mr-0.5 shadow-sm"
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
        </div>
      </div>
    </div>
  );
}
