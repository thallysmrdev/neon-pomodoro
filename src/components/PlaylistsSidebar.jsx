import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Music,
  ListMusic,
  Search,
  PanelRightClose,
  Loader2,
  Check,
  RefreshCw,
  Monitor,
  Disc3,
  Volume2,
  Volume1,
  VolumeX,
} from 'lucide-react';
import { playClickSound } from '../services/sound';
import {
  fetchCurrentQueue,
  startPlayback,
  getStoredAuth,
  initSpotifyAuth,
  getAvailableDevices,
} from '../services/spotifyWeb';

export default function PlaylistsSidebar({ onClose, onTrackPlayed, currentMediaTitle, spotifyVolume, onVolumeChange }) {
  const [queueData, setQueueData] = useState({
    isPlaying: false,
    currentTrack: null,
    tracks: [],
  });
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [activeDeviceName, setActiveDeviceName] = useState('');

  useEffect(() => {
    initSpotifyAuth().then((auth) => {
      if (auth?.userProfile) {
        setUserProfile(auth.userProfile);
      }
      loadQueue();
    });
  }, []);

  // Recarrega a fila automaticamente quando a música atual mudar na home
  useEffect(() => {
    if (currentMediaTitle) {
      loadQueue(false);
    }
  }, [currentMediaTitle]);

  const loadQueue = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const data = await fetchCurrentQueue();
      setQueueData(data);

      const devices = await getAvailableDevices();
      const comp = devices.find((d) => d.is_active) || devices.find((d) => d.type === 'Computer') || devices[0];
      if (comp) {
        setActiveDeviceName(comp.name);
      }
    } catch (err) {
      console.error('Erro ao carregar fila:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handlePlayTrack = async (track, e) => {
    if (e) e.stopPropagation();
    playClickSound();
    try {
      await startPlayback({ trackUri: track.uri });
      showFeedback(`Tocando: ${track.name}`);
      if (onTrackPlayed) onTrackPlayed();
      // Atualiza a fila após breve intervalo para refletir a nova ordem
      setTimeout(() => loadQueue(false), 800);
    } catch (err) {
      showFeedback(err.message || 'Falha ao tocar música');
    }
  };

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg('');
    }, 3500);
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const filteredTracks = queueData.tracks.filter((t) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return t.name.toLowerCase().includes(query) || t.artist.toLowerCase().includes(query);
  });

  return (
    <div className="w-full h-full flex flex-col p-3.5 select-none text-white overflow-hidden">
      {/* Header da Aba Lateral */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border/60 shrink-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          {/* Botão de Ocultar Aba Lateral na Esquerda (Sem texto, mantendo a home) */}
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            title="Ocultar lista de músicas"
            className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/50 transition-all cursor-pointer group shadow-sm shrink-0"
          >
            <PanelRightClose className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <ListMusic className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono truncate">
              Músicas da Playlist
            </h2>
            <p className="text-[10px] text-text-secondary truncate leading-tight">
              {queueData.tracks.length > 0
                ? `${queueData.tracks.length} músicas na fila`
                : 'Fila de reprodução'}
            </p>
          </div>
        </div>

        {/* Botão de Atualizar na Direita */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => {
              playClickSound();
              loadQueue(true);
            }}
            title="Atualizar lista de músicas"
            disabled={loading}
            className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface border border-dark-border/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="mt-2 py-1.5 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center space-x-1.5 shadow-neon-sm animate-in fade-in slide-in-from-top-1 shrink-0">
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{feedbackMsg}</span>
        </div>
      )}

      {/* Conteúdo Principal com Rolagem Suave */}
      <div className="flex-1 overflow-y-auto py-2.5 pr-1 space-y-2.5 text-xs min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2 text-text-secondary">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="text-xs">Carregando músicas da playlist...</span>
          </div>
        ) : queueData.tracks.length === 0 ? (
          /* Estado Vazio: Nenhuma música tocando */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-neon-sm">
              <Disc3 className="w-6 h-6 text-emerald-400 animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-semibold text-xs">Nenhuma música ativa no Spotify</h3>
              <p className="text-[11px] text-text-secondary max-w-xs leading-relaxed">
                Abra o Spotify no seu PC e inicie qualquer música ou playlist para que a lista completa de faixas apareça aqui!
              </p>
            </div>
            <button
              onClick={() => {
                playClickSound();
                loadQueue(true);
              }}
              className="py-1.5 px-3.5 rounded-xl glow-btn text-white text-xs font-semibold flex items-center space-x-1.5 shadow-neon-sm hover:scale-105 transition-transform cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Verificar Agora</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Campo de Busca Rápida na Playlist Atual */}
            {queueData.tracks.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar faixas da playlist..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-dark-card/80 border border-dark-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-secondary/60 focus:outline-none focus:border-emerald-500/60 transition-all"
                />
              </div>
            )}

            {/* Lista de Músicas */}
            <div className="space-y-1">
              {filteredTracks.map((t, idx) => {
                const isCurrent = Boolean(t.isCurrent);
                return (
                  <div
                    key={t.id + '-' + idx}
                    onClick={() => handlePlayTrack(t)}
                    className={`group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500/15 border border-emerald-500/40 shadow-neon-sm'
                        : 'bg-dark-card/50 hover:bg-emerald-500/10 border border-dark-border/50 hover:border-emerald-500/30'
                    }`}
                  >
                    {/* Lado Esquerdo: Capa + Título + Artista */}
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                      {/* Posição / Equalizador / Botão Play */}
                      <div className="w-5 flex items-center justify-center shrink-0">
                        {isCurrent ? (
                          <div className="flex items-end justify-center space-x-0.5 h-3.5">
                            <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.8s_ease-in-out_infinite] h-2.5" />
                            <span className="w-0.5 bg-emerald-300 rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.15s] h-3.5" />
                            <span className="w-0.5 bg-emerald-400 rounded-full animate-[bounce_0.9s_ease-in-out_infinite_0.3s] h-2" />
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] text-text-secondary font-mono group-hover:hidden">
                              {idx + 1}
                            </span>
                            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 hidden group-hover:block" />
                          </>
                        )}
                      </div>

                      {/* Capa do Álbum */}
                      {t.image ? (
                        <img
                          src={t.image}
                          alt={t.name}
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-dark-border/60 shadow-sm"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4 text-text-secondary" />
                        </div>
                      )}

                      {/* Informações da Música */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isCurrent ? 'text-emerald-300' : 'text-white group-hover:text-emerald-300'
                            }`}
                          >
                            {t.name}
                          </p>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded text-[7px] font-bold uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                              Atual
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">
                          {t.artist}
                        </p>
                      </div>
                    </div>

                    {/* Duração */}
                    <span
                      className={`text-[10px] font-mono shrink-0 ${
                        isCurrent ? 'text-emerald-400 font-semibold' : 'text-text-secondary'
                      }`}
                    >
                      {formatDuration(t.durationMs)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé com Dispositivo Conectado & Volume do Spotify */}
      <div className="pt-2 border-t border-dark-border/50 flex items-center justify-between text-[10px] text-text-secondary shrink-0">
        <span
          className="flex items-center space-x-1.5 truncate max-w-[130px]"
          title={activeDeviceName ? `Dispositivo ativo: ${activeDeviceName}` : 'Spotify Connect'}
        >
          <Monitor className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{activeDeviceName || 'Spotify Connect'}</span>
        </span>

        {/* Volume do Spotify no rodapé */}
        {onVolumeChange && typeof spotifyVolume === 'number' && (
          <div className="flex items-center space-x-1.5 bg-dark-card/75 border border-dark-border/60 px-2 py-0.5 rounded-lg">
            <button
              onClick={() => onVolumeChange(spotifyVolume === 0 ? 70 : 0)}
              title={spotifyVolume === 0 ? 'Desmutar Spotify' : 'Mutar Spotify'}
              className="text-text-secondary hover:text-white cursor-pointer"
            >
              {spotifyVolume === 0 ? (
                <VolumeX className="w-3 h-3 text-rose-400" />
              ) : spotifyVolume < 50 ? (
                <Volume1 className="w-3 h-3 text-emerald-400" />
              ) : (
                <Volume2 className="w-3 h-3 text-emerald-400" />
              )}
            </button>
            {/* Marcador Mínimo */}
            <span className="text-[8px] font-mono text-text-secondary/70 select-none font-semibold">0</span>

            {/* Trilho Interativo com Barra Acompanhando a Movimentação */}
            <div className="relative w-16 flex items-center h-3.5 cursor-pointer group/bar">
              {/* Trilho Fundo */}
              <div className="absolute left-0 right-0 h-1 bg-dark-surface border border-dark-border/80 rounded-full overflow-hidden shadow-inner">
                {/* Barra Preenchida Dinâmica que acompanha o volume */}
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)] rounded-full transition-all duration-75"
                  style={{ width: `${spotifyVolume}%` }}
                />
              </div>

              {/* Marcador Físico de Mínimo */}
              <div
                className="absolute left-0 w-0.5 h-2 bg-text-secondary/60 rounded-full pointer-events-none"
                title="Mínimo (0%)"
              />

              {/* Marcador Físico de Máximo */}
              <div
                className="absolute right-0 w-0.5 h-2 bg-text-secondary/60 rounded-full pointer-events-none"
                title="Máximo (100%)"
              />

              {/* Thumb / Indicador que acompanha a barra */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white border border-emerald-400 shadow-[0_0_6px_#34d399] pointer-events-none transition-all duration-75 group-hover/bar:scale-125"
                style={{ left: `${spotifyVolume}%` }}
              />

              {/* Input Nativo Invisível */}
              <input
                type="range"
                min="0"
                max="100"
                value={spotifyVolume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title={`Ajustar volume do Spotify: ${spotifyVolume}% (Mínimo: 0% | Máximo: 100%)`}
              />
            </div>

            {/* Marcador Máximo */}
            <span className="text-[8px] font-mono text-text-secondary/70 select-none font-semibold">100</span>
            <span className="font-mono text-emerald-400 text-[10px] w-6 text-right font-medium">
              {spotifyVolume}%
            </span>
          </div>
        )}

        <span>
          {queueData.tracks.length > 0 ? `${queueData.tracks.length} faixas` : 'Fila vazia'}
        </span>
      </div>
    </div>
  );
}
