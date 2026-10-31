import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  ArrowLeft,
  Music,
  ListMusic,
  Search,
  PanelRightClose,
  Loader2,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { playClickSound } from '../services/sound';
import {
  fetchUserPlaylists,
  fetchPlaylistTracks,
  startPlayback,
  getStoredAuth,
} from '../services/spotifyWeb';

export default function PlaylistsSidebar({ onClose, onTrackPlayed }) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const auth = getStoredAuth();
    setUserProfile(auth.userProfile);
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const list = await fetchUserPlaylists();
      setPlaylists(list);
    } catch (err) {
      console.error('Erro ao carregar playlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlaylist = async (pl) => {
    playClickSound();
    setSelectedPlaylist(pl);
    setLoadingTracks(true);
    try {
      const trackList = await fetchPlaylistTracks(pl.id);
      setTracks(trackList);
    } catch (err) {
      console.error('Erro ao buscar faixas:', err);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handlePlayEntirePlaylist = async (pl, e) => {
    if (e) e.stopPropagation();
    playClickSound();
    try {
      await startPlayback({ contextUri: pl.uri });
      showFeedback(`Tocando: ${pl.name}`);
      if (onTrackPlayed) onTrackPlayed();
    } catch (err) {
      showFeedback(err.message || 'Falha ao tocar playlist');
    }
  };

  const handlePlaySingleTrack = async (track, index) => {
    playClickSound();
    try {
      await startPlayback({
        contextUri: selectedPlaylist ? selectedPlaylist.uri : undefined,
        trackUri: track.uri,
        offsetIndex: index,
      });
      showFeedback(`Tocando: ${track.name}`);
      if (onTrackPlayed) onTrackPlayed();
    } catch (err) {
      showFeedback(err.message || 'Falha ao tocar faixa');
    }
  };

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg('');
    }, 3000);
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const filteredPlaylists = playlists.filter((pl) =>
    pl.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col p-3.5 select-none text-white overflow-hidden">
      {/* Header da Aba Lateral */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border/60 shrink-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          {selectedPlaylist ? (
            <button
              onClick={() => {
                playClickSound();
                setSelectedPlaylist(null);
                setTracks([]);
              }}
              className="flex items-center space-x-1 p-1 pr-2 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface border border-transparent hover:border-dark-border transition-colors cursor-pointer shrink-0"
              title="Voltar para todas as playlists"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Voltar</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono truncate">
                  Playlists Spotify
                </h2>
                {userProfile && (
                  <p className="text-[10px] text-text-secondary truncate leading-tight">
                    <span className="text-emerald-400 font-medium">{userProfile.displayName}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botão de Ocultar Aba Lateral (Mantém a Home) */}
        <div className="flex items-center space-x-1 shrink-0">
          {!selectedPlaylist && (
            <button
              onClick={() => {
                playClickSound();
                loadPlaylists();
              }}
              title="Atualizar lista de playlists"
              disabled={loading}
              className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          )}

          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface/90 border border-dark-border/60 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm"
            title="Ocultar aba lateral e manter apenas a home"
          >
            <span className="text-[11px] font-medium text-text-secondary group-hover:text-emerald-300">
              Ocultar
            </span>
            <PanelRightClose className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
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
        {/* VIEW 1: Faixas da Playlist Selecionada */}
        {selectedPlaylist ? (
          <div className="space-y-3">
            {/* Banner da Playlist */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-card/75 border border-dark-border/70 shadow-sm">
              <div className="flex items-center space-x-2.5 min-w-0 mr-2 flex-1">
                {selectedPlaylist.image ? (
                  <img
                    src={selectedPlaylist.image}
                    alt={selectedPlaylist.name}
                    className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-neon-violet/20 border border-neon-purple/40 flex items-center justify-center shrink-0">
                    <Music className="w-6 h-6 text-neon-light" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white text-xs truncate leading-snug">
                    {selectedPlaylist.name}
                  </h3>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">
                    {selectedPlaylist.totalTracks} faixas • {selectedPlaylist.owner}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => handlePlayEntirePlaylist(selectedPlaylist, e)}
                title="Tocar playlist completa"
                className="py-1.5 px-3 rounded-xl glow-btn text-white text-[11px] font-semibold flex items-center space-x-1 shadow-neon-sm shrink-0 hover:scale-105 transition-transform cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Tocar Tudo</span>
              </button>
            </div>

            {/* Lista de Faixas */}
            {loadingTracks ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-text-secondary">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-[11px]">Carregando faixas da playlist...</span>
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-[11px]">
                Nenhuma faixa encontrada nesta playlist.
              </div>
            ) : (
              <div className="space-y-1">
                {tracks.map((t, idx) => (
                  <div
                    key={t.id + '-' + idx}
                    onClick={() => handlePlaySingleTrack(t, idx)}
                    className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      <span className="text-[10px] text-text-secondary font-mono w-4 text-center group-hover:hidden shrink-0">
                        {idx + 1}
                      </span>
                      <Play className="w-3 h-3 text-emerald-400 fill-emerald-400 hidden group-hover:block shrink-0" />

                      {t.image && (
                        <img
                          src={t.image}
                          alt={t.name}
                          className="w-7 h-7 rounded object-cover shrink-0 border border-dark-border/40"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-white truncate group-hover:text-emerald-300">
                          {t.name}
                        </p>
                        <p className="text-[9px] text-text-secondary truncate">
                          {t.artist}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-text-secondary shrink-0">
                      {formatDuration(t.durationMs)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: Lista de Playlists */
          <div className="space-y-2.5">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar suas playlists..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-dark-card/80 border border-dark-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-secondary/60 focus:outline-none focus:border-emerald-500/60 transition-all"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-text-secondary">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-xs">Carregando suas playlists...</span>
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-xs">
                {searchFilter ? 'Nenhuma playlist encontrada.' : 'Nenhuma playlist disponível no seu Spotify.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {filteredPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl)}
                    className="group flex items-center justify-between p-2 rounded-xl bg-dark-card/60 hover:bg-emerald-500/10 border border-dark-border/60 hover:border-emerald-500/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                      {pl.image ? (
                        <img
                          src={pl.image}
                          alt={pl.name}
                          className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center shrink-0">
                          <Music className="w-4 h-4 text-text-secondary" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-emerald-300">
                          {pl.name}
                        </h4>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">
                          {pl.totalTracks} músicas • {pl.owner}
                        </p>
                      </div>
                    </div>

                    {/* Botão de Tocar Direto */}
                    <button
                      onClick={(e) => handlePlayEntirePlaylist(pl, e)}
                      title={`Tocar ${pl.name}`}
                      className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-transparent transition-all shrink-0 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rodapé da Aba Lateral */}
      <div className="pt-2 border-t border-dark-border/50 flex items-center justify-between text-[10px] text-text-secondary shrink-0">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Spotify Connect Ativo</span>
        </span>
        <span>{playlists.length} playlists</span>
      </div>
    </div>
  );
}
