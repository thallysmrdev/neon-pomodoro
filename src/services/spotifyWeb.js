const SPOTIFY_AUTH_STORAGE_KEY = 'neon_pomodoro_spotify_auth';

export const getStoredAuth = () => {
  try {
    const raw = localStorage.getItem(SPOTIFY_AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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

export const saveAuth = (authData) => {
  try {
    localStorage.setItem(SPOTIFY_AUTH_STORAGE_KEY, JSON.stringify(authData));
  } catch (e) {
    console.error('Erro ao salvar auth do Spotify:', e);
  }
};

export const clearAuth = () => {
  try {
    const prev = getStoredAuth();
    localStorage.setItem(
      SPOTIFY_AUTH_STORAGE_KEY,
      JSON.stringify({
        clientId: prev.clientId || '',
        accessToken: null,
        refreshToken: null,
        expiresIn: 3600,
        tokenTimestamp: 0,
        userProfile: null,
      })
    );
  } catch (e) {}
};

export const getValidToken = async () => {
  const auth = getStoredAuth();
  if (!auth.accessToken) return null;

  const now = Date.now();
  const elapsedSec = (now - (auth.tokenTimestamp || 0)) / 1000;

  // Se expira em menos de 2 minutos ou já expirou, renova
  if (elapsedSec > (auth.expiresIn || 3600) - 120) {
    if (!auth.refreshToken || !auth.clientId) {
      clearAuth();
      return null;
    }

    try {
      if (window.electronAPI && window.electronAPI.spotifyRefreshToken) {
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
      return null;
    }
  }

  return auth.accessToken;
};

// Requisição autenticada à API do Spotify
const spotifyFetch = async (endpoint, options = {}) => {
  const token = await getValidToken();
  if (!token) throw new Error('Não autenticado com o Spotify');

  const url = endpoint.startsWith('http') ? endpoint : `https://api.spotify.com/v1${endpoint}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 204) return null;

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
    .map((item) => {
      const t = item.track;
      return {
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a) => a.name).join(', ') || 'Desconhecido',
        album: t.album?.name || '',
        image: t.album?.images?.[0]?.url || null,
        durationMs: t.duration_ms,
        uri: t.uri,
      };
    });
};

// Toca uma playlist inteira ou música específica
export const startPlayback = async ({ contextUri, trackUri, offsetIndex } = {}) => {
  const body = {};
  if (contextUri) {
    body.context_uri = contextUri;
    if (trackUri) {
      body.offset = { uri: trackUri };
    } else if (typeof offsetIndex === 'number') {
      body.offset = { position: offsetIndex };
    }
  } else if (trackUri) {
    body.uris = [trackUri];
  }

  return await spotifyFetch('/me/player/play', {
    method: 'PUT',
    body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  });
};

// Alterna Play / Pause via Web API
export const toggleWebPlayPause = async (currentlyPlaying) => {
  const endpoint = currentlyPlaying ? '/me/player/pause' : '/me/player/play';
  return await spotifyFetch(endpoint, { method: 'PUT' });
};

// Pular / Voltar faixa via Web API
export const skipWebNext = async () => {
  return await spotifyFetch('/me/player/next', { method: 'POST' });
};

export const skipWebPrev = async () => {
  return await spotifyFetch('/me/player/previous', { method: 'POST' });
};

// Obtém estado completo de reprodução (incluindo capa de alta resolução!)
export const fetchCurrentPlayback = async () => {
  try {
    const data = await spotifyFetch('/me/player');
    if (!data || !data.item) return null;

    return {
      isPlaying: Boolean(data.is_playing),
      progressMs: data.progress_ms,
      durationMs: data.item.duration_ms,
      trackName: data.item.name,
      artist: data.item.artists?.map((a) => a.name).join(', ') || '',
      albumName: data.item.album?.name || '',
      albumArt: data.item.album?.images?.[0]?.url || null,
      uri: data.item.uri,
      deviceName: data.device?.name || '',
    };
  } catch (err) {
    return null;
  }
};
