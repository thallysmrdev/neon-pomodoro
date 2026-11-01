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
      if (auth.accessToken && elapsedSec < (auth.expiresIn || 3600)) {
        return auth.accessToken;
      }
      return null;
    }
  }

  return auth.accessToken;
};

// Requisição autenticada à API do Spotify
export const spotifyFetch = async (endpoint, options = {}) => {
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
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

// Obtém dispositivos disponíveis na conta Spotify
export const getAvailableDevices = async () => {
  try {
    const data = await spotifyFetch('/me/player/devices');
    return data?.devices || [];
  } catch (e) {
    return [];
  }
};

// Transfere a reprodução para um dispositivo específico
export const transferPlaybackToDevice = async (deviceId, shouldPlay = false) => {
  return await spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({
      device_ids: [deviceId],
      play: shouldPlay,
    }),
  });
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

// Busca todas as Playlists e Álbuns Salvos da biblioteca do usuário
export const fetchUserLibrary = async () => {
  const [playlistsRes, albumsRes] = await Promise.allSettled([
    spotifyFetch('/me/playlists?limit=50'),
    spotifyFetch('/me/albums?limit=50'),
  ]);

  const items = [];

  // Playlists
  if (playlistsRes.status === 'fulfilled' && playlistsRes.value?.items) {
    playlistsRes.value.items.forEach((pl) => {
      items.push({
        id: pl.id,
        name: pl.name,
        type: 'playlist',
        description: pl.description || '',
        image: pl.images?.[0]?.url || null,
        totalTracks: typeof pl.tracks?.total === 'number' ? pl.tracks.total : null,
        uri: pl.uri,
        owner: pl.owner?.display_name || 'Spotify',
      });
    });
  }

  // Álbuns Salvos
  if (albumsRes.status === 'fulfilled' && albumsRes.value?.items) {
    albumsRes.value.items.forEach((item) => {
      const alb = item.album;
      if (alb) {
        items.push({
          id: alb.id,
          name: alb.name,
          type: 'album',
          description: `Álbum de ${alb.artists?.map((a) => a.name).join(', ') || ''}`,
          image: alb.images?.[0]?.url || null,
          totalTracks: alb.total_tracks || 0,
          uri: alb.uri,
          owner: alb.artists?.map((a) => a.name).join(', ') || 'Álbum Salvo',
        });
      }
    });
  }

  return items;
};

// Busca as faixas de um item (seja Álbum ou Playlist)
export const fetchItemTracks = async (item) => {
  if (!item || !item.id) return { tracks: [], isDirectPlayOnly: false };

  // Se for álbum, busca faixas pelo endpoint oficial /albums/{id}/tracks
  if (item.type === 'album') {
    try {
      const data = await spotifyFetch(`/albums/${item.id}/tracks?limit=50`);
      const tracks = (data?.items || []).map((t) => ({
        id: t.id,
        name: t.name,
        artist: t.artists?.map((a) => a.name).join(', ') || item.owner,
        album: item.name,
        image: item.image,
        durationMs: t.duration_ms,
        uri: t.uri,
        trackNumber: t.track_number,
      }));
      return { tracks, isDirectPlayOnly: false };
    } catch (e) {
      console.error('Erro ao buscar faixas do álbum:', e);
      return { tracks: [], isDirectPlayOnly: false };
    }
  }

  // Se for playlist:
  try {
    const data = await spotifyFetch(`/playlists/${item.id}/tracks?limit=100`);
    if (data?.items) {
      const tracks = data.items
        .filter((i) => i.track && i.track.id)
        .map((i) => ({
          id: i.track.id,
          name: i.track.name,
          artist: i.track.artists?.map((a) => a.name).join(', ') || 'Artista Desconhecido',
          album: i.track.album?.name || '',
          image: i.track.album?.images?.[0]?.url || item.image,
          durationMs: i.track.duration_ms,
          uri: i.track.uri,
        }));
      return { tracks, isDirectPlayOnly: false };
    }
  } catch (err) {
    // Se o Spotify retornar 403 (restrição de playlists públicas de terceiros), permite reprodução direta!
    if (err.status === 403) {
      return { tracks: [], isDirectPlayOnly: true };
    }
  }

  return { tracks: [], isDirectPlayOnly: false };
};

// Inicia reprodução inteligente conectando ao dispositivo correto (PC / Ativo)
export const startPlayback = async ({ contextUri, trackUri, offsetIndex = 0 }) => {
  // 1. Busca dispositivos disponíveis
  const devices = await getAvailableDevices();

  // 2. Seleciona o melhor dispositivo:
  // - Prioridade 1: Dispositivo atualmente ativo
  // - Prioridade 2: Computador / PC local (tipo 'Computer')
  // - Prioridade 3: Primeiro dispositivo disponível
  let targetDevice = devices.find((d) => d.is_active);
  if (!targetDevice) {
    targetDevice = devices.find((d) => d.type === 'Computer');
  }
  if (!targetDevice && devices.length > 0) {
    targetDevice = devices[0];
  }

  if (!targetDevice) {
    throw new Error('Nenhum dispositivo Spotify encontrado. Abra o app do Spotify no seu PC.');
  }

  // 3. Se o dispositivo não estiver marcado como ativo, envia transferência para acordá-lo
  if (!targetDevice.is_active) {
    try {
      await transferPlaybackToDevice(targetDevice.id, false);
      // Aguarda 250ms para o Spotify processar a ativação do dispositivo
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {}
  }

  // 4. Monta o corpo da requisição de reprodução
  const body = {};
  if (contextUri) {
    body.context_uri = contextUri;
    if (trackUri) {
      body.offset = { uri: trackUri };
    } else if (typeof offsetIndex === 'number' && offsetIndex > 0) {
      body.offset = { position: offsetIndex };
    }
  } else if (trackUri) {
    body.uris = [trackUri];
  }

  // 5. Executa a reprodução apontando diretamente para o device_id
  try {
    return await spotifyFetch(`/me/player/play?device_id=${targetDevice.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Se retornar 404 No Active Device, tenta acordar com play: true
    if (err.status === 404 || err.message?.includes('No active device')) {
      await transferPlaybackToDevice(targetDevice.id, true);
      // Tenta novamente
      return await spotifyFetch(`/me/player/play?device_id=${targetDevice.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    throw err;
  }
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
