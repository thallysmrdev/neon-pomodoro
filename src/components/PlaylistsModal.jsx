import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  ArrowLeft,
  Music,
  ListMusic,
  Search,
  ExternalLink,
  Loader2,
  Check,
  Sparkles,
} from 'lucide-react';
import { playClickSound } from '../services/sound';
import {
  fetchUserPlaylists,
  fetchPlaylistTracks,
  startPlayback,
  getStoredAuth,
} from '../services/spotifyWeb';

export default function PlaylistsModal({ isOpen, onClose, onTrackPlayed }) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const auth = getStoredAuth();
      setUserProfile(auth.userProfile);
      loadPlaylists();
    } else {
      setSelectedPlaylist(null);
      setTracks([]);
      setSearchFilter('');
    }
  }, [isOpen]);

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
      showFeedback(`Tocando playlist: ${pl.name}`);
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

  if (!isOpen) return null;

  const filteredPlaylists = playlists.filter((pl) =>
    pl.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-50 bg-dark-bg/95 backdrop-blur-2xl flex flex-col p-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border/50">
        <div className="flex items-center space-x-2">
          {selectedPlaylist ? (
            <button
              onClick={() => {
                playClickSound();
                setSelectedPlaylist(null);
                setTracks([]);
              }}
              className="p-1 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface transition-colors cursor-pointer"
              title="Voltar às playlists"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <ListMusic className="w-4 h-4 text-emerald-400" />
          )}

          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono truncate">
              {selectedPlaylist ? selectedPlaylist.name : 'Suas Playlists do Spotify'}
            </h2>
            {userProfile && !selectedPlaylist && (
              <p className="text-[10px] text-text-secondary truncate">
                Conectado como <span className="text-emerald-400 font-medium">{userProfile.displayName}</span>
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="p-1.5 rounded-md text-text-secondary hover:text-white hover:bg-dark-surface border border-transparent hover:border-dark-border transition-all cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="mt-2 py-1 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center space-x-1.5 shadow-neon-sm animate-in fade-in slide-in-from-top-1">
          <Check className="w-3 h-3 shrink-0" />
          <span className="truncate">{feedbackMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2 text-xs">
        {/* VIEW 1: Playlist Tracklist */}
        {selectedPlaylist ? (
          <div className="space-y-3">
            {/* Playlist banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-card/60 border border-dark-border/60">
              <div className="flex items-center space-x-2.5 min-w-0">
                {selectedPlaylist.image ? (
                  <img
                    src={selectedPlaylist.image}
                    alt={selectedPlaylist.name}
                    className="w-12 h-12 rounded-lg object-cover border border-dark-border shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-neon-violet/20 border border-neon-purple/40 flex items-center justify-center">
                    <Music className="w-6 h-6 text-neon-light" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-xs truncate">
                    {selectedPlaylist.name}
                  </h3>
                  <p className="text-[10px] text-text-secondary">
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

            {/* Tracklist Items */}
            {loadingTracks ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 text-text-secondary">
                <Loader2 className="w-5 h-5 text-neon-glow animate-spin" />
                <span className="text-[11px]">Carregando faixas...</span>
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-[11px]">
                Nenhuma faixa encontrada nesta playlist.
              </div>
            ) : (
              <div className="space-y-1">
                {tracks.map((t, idx) => (
                  <div
                    key={t.id + '-' + idx}
                    onClick={() => handlePlaySingleTrack(t, idx)}
                    className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-neon-violet/15 border border-transparent hover:border-neon-purple/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      <span className="text-[10px] text-text-secondary font-mono w-4 text-center group-hover:hidden">
                        {idx + 1}
                      </span>
                      <Play className="w-3 h-3 text-emerald-400 fill-emerald-400 hidden group-hover:block shrink-0" />

                      {t.image && (
                        <img
                          src={t.image}
                          alt={t.name}
                          className="w-7 h-7 rounded object-cover shrink-0"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-white truncate group-hover:text-neon-glow">
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
          /* VIEW 2: Playlists Grid / List */
          <div className="space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar suas playlists..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-dark-card/70 border border-dark-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-secondary/60 focus:outline-none focus:border-neon-purple transition-all"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-text-secondary">
                <Loader2 className="w-6 h-6 text-neon-glow animate-spin" />
                <span className="text-xs">Carregando suas playlists...</span>
              </div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-xs">
                {searchFilter ? 'Nenhuma playlist encontrada para a busca.' : 'Nenhuma playlist encontrada na sua conta.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {filteredPlaylists.map((pl) => (
                  <div
                    key={pl.id}
                    onClick={() => handleSelectPlaylist(pl)}
                    className="group flex items-center justify-between p-2 rounded-xl bg-dark-card/50 hover:bg-neon-violet/15 border border-dark-border hover:border-neon-purple/40 cursor-pointer transition-all"
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
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-neon-glow">
                          {pl.name}
                        </h4>
                        <p className="text-[10px] text-text-secondary truncate mt-0.5">
                          {pl.totalTracks} músicas • {pl.owner}
                        </p>
                      </div>
                    </div>

                    {/* Quick Play Button */}
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

      {/* Footer Info */}
      <div className="pt-2 border-t border-dark-border/40 flex items-center justify-between text-[10px] text-text-secondary">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-neon-glow" />
          <span>Spotify Connect Ativo</span>
        </span>
        <span>{playlists.length} playlists carregadas</span>
      </div>
    </div>
  );
}
