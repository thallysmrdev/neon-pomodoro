import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  ArrowLeft,
  Music,
  ListMusic,
  Disc3,
  Search,
  PanelRightClose,
  Loader2,
  Check,
  Sparkles,
  RefreshCw,
  Monitor,
} from 'lucide-react';
import { playClickSound } from '../services/sound';
import {
  fetchUserLibrary,
  fetchItemTracks,
  startPlayback,
  getStoredAuth,
  initSpotifyAuth,
  getAvailableDevices,
} from '../services/spotifyWeb';

export default function PlaylistsSidebar({ onClose, onTrackPlayed }) {
  const [libraryItems, setLibraryItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [isDirectPlayOnly, setIsDirectPlayOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'playlist' | 'album'
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [activeDeviceName, setActiveDeviceName] = useState('');

  useEffect(() => {
    initSpotifyAuth().then((auth) => {
      if (auth?.userProfile) {
        setUserProfile(auth.userProfile);
      }
      loadLibrary();
    });
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const items = await fetchUserLibrary();
      setLibraryItems(items);

      // Detecta dispositivo ativo ou PC
      const devices = await getAvailableDevices();
      const comp = devices.find((d) => d.is_active) || devices.find((d) => d.type === 'Computer') || devices[0];
      if (comp) {
        setActiveDeviceName(comp.name);
      }
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = async (item) => {
    playClickSound();
    setSelectedItem(item);
    setLoadingTracks(true);
    try {
      const res = await fetchItemTracks(item);
      setTracks(res.tracks || []);
      setIsDirectPlayOnly(Boolean(res.isDirectPlayOnly));
    } catch (err) {
      console.error('Erro ao carregar faixas:', err);
      setTracks([]);
      setIsDirectPlayOnly(true);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handlePlayEntireItem = async (item, e) => {
    if (e) e.stopPropagation();
    playClickSound();
    try {
      await startPlayback({ contextUri: item.uri });
      showFeedback(`Tocando: ${item.name}`);
      if (onTrackPlayed) onTrackPlayed();
    } catch (err) {
      showFeedback(err.message || 'Falha ao iniciar reprodução');
    }
  };

  const handlePlaySingleTrack = async (track, index) => {
    playClickSound();
    try {
      await startPlayback({
        contextUri: selectedItem ? selectedItem.uri : undefined,
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
    }, 3500);
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Filtragem por busca e por tipo
  const filteredItems = libraryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const playlistCount = libraryItems.filter((i) => i.type === 'playlist').length;
  const albumCount = libraryItems.filter((i) => i.type === 'album').length;

  return (
    <div className="w-full h-full flex flex-col p-3.5 select-none text-white overflow-hidden">
      {/* Header da Aba Lateral */}
      <div className="flex items-center justify-between pb-3 border-b border-dark-border/60 shrink-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
          {selectedItem ? (
            <button
              onClick={() => {
                playClickSound();
                setSelectedItem(null);
                setTracks([]);
                setIsDirectPlayOnly(false);
              }}
              className="flex items-center space-x-1.5 py-1 px-2.5 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface border border-transparent hover:border-dark-border transition-colors cursor-pointer shrink-0"
              title="Voltar para sua biblioteca"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">Biblioteca</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold uppercase tracking-wider text-white font-mono truncate">
                  Sua Biblioteca
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
        <div className="flex items-center space-x-1.5 shrink-0">
          {!selectedItem && (
            <button
              onClick={() => {
                playClickSound();
                loadLibrary();
              }}
              title="Atualizar biblioteca"
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
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-text-secondary hover:text-white hover:bg-dark-surface/90 border border-dark-border/60 hover:border-emerald-500/40 transition-all cursor-pointer group shadow-sm"
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
        {/* VIEW 1: Faixas do Item Selecionado (Álbum ou Playlist) */}
        {selectedItem ? (
          <div className="space-y-3">
            {/* Banner do Item */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-dark-card/75 border border-dark-border/70 shadow-sm">
              <div className="flex items-center space-x-2.5 min-w-0 mr-2 flex-1">
                {selectedItem.image ? (
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-12 h-12 rounded-lg object-cover border border-dark-border shrink-0 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-neon-violet/20 border border-neon-purple/40 flex items-center justify-center shrink-0">
                    <Music className="w-6 h-6 text-neon-light" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {selectedItem.type === 'album' ? 'Álbum' : 'Playlist'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white text-xs truncate leading-snug mt-0.5">
                    {selectedItem.name}
                  </h3>
                  <p className="text-[10px] text-text-secondary truncate">
                    {selectedItem.owner}
                    {selectedItem.totalTracks ? ` • ${selectedItem.totalTracks} faixas` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => handlePlayEntireItem(selectedItem, e)}
                title="Tocar tudo agora"
                className="py-1.5 px-3 rounded-xl glow-btn text-white text-[11px] font-semibold flex items-center space-x-1 shadow-neon-sm shrink-0 hover:scale-105 transition-transform cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Tocar Tudo</span>
              </button>
            </div>

            {/* Conteúdo de Faixas ou Banner de Reprodução Direta */}
            {loadingTracks ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-text-secondary">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-[11px]">Carregando faixas...</span>
              </div>
            ) : isDirectPlayOnly || tracks.length === 0 ? (
              /* Card de Reprodução Direta (para Playlists com restrição de API pública) */
              <div className="p-4 rounded-xl bg-dark-card/50 border border-dark-border/60 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-neon-sm">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-semibold text-xs">{selectedItem.name}</h4>
                  <p className="text-[10px] text-text-secondary max-w-xs mx-auto leading-relaxed">
                    Esta playlist está pronta para reprodução contínua direta via Spotify Connect.
                  </p>
                </div>
                <button
                  onClick={(e) => handlePlayEntireItem(selectedItem, e)}
                  className="w-full py-2 px-3 rounded-xl glow-btn text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-neon-sm hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Iniciar Reprodução no PC</span>
                </button>
              </div>
            ) : (
              /* Lista de Faixas */
              <div className="space-y-1">
                {tracks.map((t, idx) => (
                  <div
                    key={t.id + '-' + idx}
                    onClick={() => handlePlaySingleTrack(t, idx)}
                    className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      <span className="text-[10px] text-text-secondary font-mono w-4 text-center group-hover:hidden shrink-0">
                        {t.trackNumber || idx + 1}
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
          /* VIEW 2: Lista Geral da Biblioteca (Playlists & Álbuns) */
          <div className="space-y-2.5">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar por nome ou artista..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-dark-card/80 border border-dark-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-secondary/60 focus:outline-none focus:border-emerald-500/60 transition-all"
              />
            </div>

            {/* Abas de Filtro: Todos | Playlists | Álbuns */}
            <div className="flex items-center space-x-1.5 pt-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-text-secondary hover:text-white bg-dark-card/50 border border-dark-border/50'
                }`}
              >
                Todos ({libraryItems.length})
              </button>
              <button
                onClick={() => setFilterType('playlist')}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                  filterType === 'playlist'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-text-secondary hover:text-white bg-dark-card/50 border border-dark-border/50'
                }`}
              >
                Playlists ({playlistCount})
              </button>
              <button
                onClick={() => setFilterType('album')}
                className={`py-1 px-2.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                  filterType === 'album'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-text-secondary hover:text-white bg-dark-card/50 border border-dark-border/50'
                }`}
              >
                Álbuns ({albumCount})
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-text-secondary">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-xs">Carregando sua biblioteca...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-xs">
                {searchFilter ? 'Nenhum item encontrado para a busca.' : 'Nenhuma música ou playlist na biblioteca.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="group flex items-center justify-between p-2 rounded-xl bg-dark-card/60 hover:bg-emerald-500/10 border border-dark-border/60 hover:border-emerald-500/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-dark-border shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-dark-surface border border-dark-border flex items-center justify-center shrink-0">
                          {item.type === 'album' ? (
                            <Disc3 className="w-4 h-4 text-text-secondary" />
                          ) : (
                            <Music className="w-4 h-4 text-text-secondary" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1 py-0.2 rounded text-[7px] font-bold uppercase tracking-wider ${
                              item.type === 'album'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {item.type === 'album' ? 'Álbum' : 'Playlist'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 mt-0.5">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-text-secondary truncate">
                          {item.owner}
                          {item.totalTracks ? ` • ${item.totalTracks} faixas` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Botão de Tocar Direto */}
                    <button
                      onClick={(e) => handlePlayEntireItem(item, e)}
                      title={`Tocar ${item.name}`}
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

      {/* Rodapé com Dispositivo Conectado */}
      <div className="pt-2 border-t border-dark-border/50 flex items-center justify-between text-[10px] text-text-secondary shrink-0">
        <span className="flex items-center space-x-1.5 truncate max-w-[200px]" title={activeDeviceName ? `Conectado ao dispositivo: ${activeDeviceName}` : 'Spotify Connect'}>
          <Monitor className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{activeDeviceName || 'Spotify Connect Ativo'}</span>
        </span>
        <span>{libraryItems.length} itens</span>
      </div>
    </div>
  );
}
