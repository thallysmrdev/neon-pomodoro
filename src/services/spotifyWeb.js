const SPOTIFY_AUTH_STORAGE_KEY = 'neon_pomodoro_spotify_auth';

let cachedAuth = null;

export const getStoredAuth = () => {
  if (cachedAuth) return cachedAuth;
  try {
    const raw = localStorage.getItem(SPOTIFY_AUTH_STORAGE_KEY);
    if (raw) {
      cachedAuth = JSON.parse(raw);
      return cachedAuth;
    }
  } catch (e) {
    console.error('Erro ao ler auth do Spotify:', e);
  }
  return {
    clientId: '',
    accessToken: null,
    refreshToken: null,
    expiresIn: 3600,
    tokenTimestamp: 0,
    userProfile: null,
  };
};

export const initSpotifyAuth = async () => {
  try {
    if (window.electronAPI?.getStoredAuth) {
      const diskAuth = await window.electronAPI.getStoredAuth();
      if (diskAuth && typeof diskAuth === 'object') {
        const local = getStoredAuth();
        cachedAuth = {
          clientId: diskAuth.clientId || local.clientId || '',
          accessToken: diskAuth.accessToken || local.accessToken || null,
          refreshToken: diskAuth.refreshToken || local.refreshToken || null,
          expiresIn: diskAuth.expiresIn || local.expiresIn || 3600,
          tokenTimestamp: diskAuth.tokenTimestamp || local.tokenTimestamp || 0,
          userProfile: diskAuth.userProfile || local.userProfile || null,
        };
        try {
          localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(cachedAuth));
        } catch (e) {}
        return cachedAuth;
      }
    }
  } catch (e) {
    console.error('Erro ao sincronizar auth do Spotify:', e);
  }
  return getStoredAuth();
};

export const saveAuth = (authData) => {
  const current = getStoredAuth();
  const merged = { ...current, ...authData };
  cachedAuth = merged;
  try {
    localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('Erro ao salvar auth no localStorage:', e);
  }
  if (window.electronAPI?.saveAuth) {
    window.electronAPI.saveAuth(merged).catch((err) => {
      console.error('Erro ao salvar auth no disco:', err);
    });
  }
};

export const clearAuth = () => {
  const current = getStoredAuth();
  const cleared = {
    clientId: current.clientId || '',
    accessToken: null,
    refreshToken: null,
    expiresIn: 3600,
    tokenTimestamp: 0,
    userProfile: null,
  };
  cachedAuth = cleared;
  try {
    localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(cleared));
  } catch (e) {}
  if (window.electronAPI?.clearAuth) {
    window.electronAPI.clearAuth().catch(() => {});
  }
};

export const getValidToken = async () => {
  let auth = getStoredAuth();

  // Se não temos nem accessToken nem refreshToken na memória, tenta carregar do disco
  if (!auth.accessToken && !auth.refreshToken && window.electronAPI?.getStoredAuth) {
    auth = await initSpotifyAuth();
  }

  const now = Date.now();
  const elapsedSec = (now - (auth.tokenTimestamp || 0)) / 1000;
  const isExpiredOrNear = !auth.accessToken || elapsedSec > (auth.expiresIn || 3600) - 120;

  // Se expirou ou não tem accessToken, mas temos refreshToken + clientId:
  if (isExpiredOrNear && auth.refreshToken && auth.clientId) {
    try {
      if (window.electronAPI?.spotifyRefreshToken) {
        const refreshed = await window.electronAPI.spotifyRefreshToken(
          auth.clientId,
          auth.refreshToken
        );
        const updated = {
          ...auth,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || auth.refreshToken,
          expiresIn: refreshed.expiresIn,
          tokenTimestamp: refreshed.tokenTimestamp,
        };
        saveAuth(updated);
        return updated.accessToken;
      }
    } catch (err) {
      console.error('Erro ao renovar token do Spotify:', err);
      // Se accessToken ainda não expirou formalmente, usa o atual
      if (auth.accessToken && elapsedSec < (auth.expiresIn || 3600)) {
        return auth.accessToken;
      }
      return null;
    }
  }

  return auth.accessToken;
};

// Requisição autenticada à API do Spotify
const spotifyFetch = async (endpoint, options = {}) => {
  let token = await getValidToken();
  if (!token) throw new Error('Não autenticado com o Spotify');

  const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com/v1${endpoint}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let res = await fetch(url, { ...options, headers });
  if (res.status === 204) return null;

  // Se receber 401 Unauthorized e temos refreshToken, tenta renovar na hora e repetir
  if (res.status === 401) {
    const auth = getStoredAuth();
    if (auth.refreshToken && auth.clientId && window.electronAPI?.spotifyRefreshToken) {
      try {
        const refreshed = await window.electronAPI.spotifyRefreshToken(
          auth.clientId,
          auth.refreshToken
        );
        const updated = {
          ...auth,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || auth.refreshToken,
          expiresIn: refreshed.expiresIn,
          tokenTimestamp: refreshed.tokenTimestamp,
        };
        saveAuth(updated);
        headers.Authorization = `Bearer ${refreshed.accessToken}`;
        res = await fetch(url, { ...options, headers });
        if (res.status === 204) return null;
      } catch (e) {}
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const errorMsg = data?.error?.message || `Erro ${res.status} na API do Spotify`;
    throw new Error(errorMsg);
  }
  return data;
};

// Obtém o perfil do usuário logado
export const fetchUserProfile = async () => {
  const user = await spotifyFetch('/me');
  const auth = getStoredAuth();
  auth.userProfile = {
    id: user.id,
    displayName: user.display_name || user.id,
    email: user.email,
    product: user.product, // 'premium' ou 'free'
    avatar: user.images?.[0]?.url || null,
  };
  saveAuth(auth);
  return auth.userProfile;
};

// Busca as playlists do usuário (até 50)
export const fetchUserPlaylists = async () => {
  const data = await spotifyFetch('/me/playlists?limit=50');
  if (!data?.items) return [];

  return data.items.map((pl) => ({
    id: pl.id,
    name: pl.name,
    description: pl.description,
    image: pl.images?.[0]?.url || null,
    totalTracks: pl.tracks?.total || 0,
    uri: pl.uri,
    owner: pl.owner?.display_name || '',
  }));
};

// Busca faixas de uma playlist
export const fetchPlaylistTracks = async (playlistId) => {
  const data = await spotifyFetch(`/playlists/${playlistId}/tracks?limit=100`);
  if (!data?.items) return [];

  return data.items
    .filter((item) => item.track && item.track.id)
    .map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists?.map((a) => a.name).join(', ') || 'Artista Desconhecido',
      album: item.track.album?.name || '',
      image: item.track.album?.images?.[0]?.url || null,
      durationMs: item.track.duration_ms,
      uri: item.track.uri,
    }));
};

// Inicia reprodução via Spotify Web API
export const startPlayback = async ({ contextUri, trackUri, offsetIndex = 0 }) => {
  const body = {};
  if (contextUri) {
    body.context_uri = contextUri;
    if (trackUri || offsetIndex > 0) {
      body.offset = trackUri ? { uri: trackUri } : { position: offsetIndex };
    }
  } else if (trackUri) {
    body.uris = [trackUri];
  }

  return await spotifyFetch('/me/player/play', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

// Busca estado atual do player no Spotify (para pegar capa em alta resolução)
export const fetchCurrentPlayback = async () => {
  try {
    const data = await spotifyFetch('/me/player/currently-playing');
    if (!data || !data.item) return null;

    return {
      title: data.item.name,
      artist: data.item.artists?.map((a) => a.name).join(', ') || '',
      album: data.item.album?.name || '',
      albumArt: data.item.album?.images?.[0]?.url || null,
      isPlaying: data.is_playing,
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
    };
  } catch (err) {
    return null;
  }
};
