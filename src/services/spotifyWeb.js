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

  if (!auth.accessToken && !auth.refreshToken && window.electronAPI?.getStoredAuth) {
    auth = await initSpotifyAuth();
  }

  const now = Date.now();
  const elapsedSec = (now - (auth.tokenTimestamp || 0)) / 1000;
  const isExpiredOrNear = !auth.accessToken || elapsedSec > (auth.expiresIn || 3600) - 120;

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
    product: user.product,
    avatar: user.images?.[0]?.url || null,
  };
  saveAuth(auth);
  return auth.userProfile;
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

// Busca a lista de músicas da playlist/álbum atual e fila de reprodução
export const fetchCurrentQueue = async () => {
  try {
    const [playerData, queueData] = await Promise.all([
      spotifyFetch('/me/player').catch(() => null),
      spotifyFetch('/me/player/queue').catch(() => null),
    ]);

    const current = queueData?.currently_playing || playerData?.item || null;
    const rawQueue = queueData?.queue || [];

    const normalizeTrack = (t, isCurrent = false) => {
      if (!t) return null;
      return {
        id: t.id || t.uri,
        name: t.name || 'Música sem título',
        artist: t.artists?.map((a) => a.name).join(', ') || 'Artista Desconhecido',
        album: t.album?.name || '',
        image: t.album?.images?.[0]?.url || null,
        durationMs: t.duration_ms || 0,
        uri: t.uri,
        isCurrent,
      };
    };

    const currentTrack = normalizeTrack(current, true);
    const upcomingTracks = rawQueue
      .filter((t) => t && (t.id || t.uri))
      .map((t) => normalizeTrack(t, false));

    const tracks = currentTrack ? [currentTrack, ...upcomingTracks] : upcomingTracks;

    return {
      isPlaying: Boolean(playerData?.is_playing),
      context: playerData?.context || null,
      currentTrack,
      tracks,
    };
  } catch (err) {
    console.error('Erro ao buscar lista de músicas do Spotify:', err);
    return {
      isPlaying: false,
      context: null,
      currentTrack: null,
      tracks: [],
    };
  }
};

// Inicia reprodução inteligente direcionada ao PC
export const startPlayback = async ({ trackUri, contextUri, offsetIndex = 0 }) => {
  const devices = await getAvailableDevices();

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

  if (!targetDevice.is_active) {
    try {
      await transferPlaybackToDevice(targetDevice.id, false);
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {}
  }

  const body = {};
  if (trackUri) {
    body.uris = [trackUri];
  } else if (contextUri) {
    body.context_uri = contextUri;
    if (typeof offsetIndex === 'number' && offsetIndex > 0) {
      body.offset = { position: offsetIndex };
    }
  }

  try {
    return await spotifyFetch(`/me/player/play?device_id=${targetDevice.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err.status === 404 || err.message?.includes('No active device')) {
      await transferPlaybackToDevice(targetDevice.id, true);
      return await spotifyFetch(`/me/player/play?device_id=${targetDevice.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    }
    throw err;
  }
};

export const pausePlaybackWeb = async () => {
  return await spotifyFetch('/me/player/pause', { method: 'PUT' });
};

export const resumePlaybackWeb = async () => {
  const devices = await getAvailableDevices();
  let targetDevice = devices.find((d) => d.is_active) || devices.find((d) => d.type === 'Computer') || devices[0];
  const deviceQuery = targetDevice ? `?device_id=${targetDevice.id}` : '';
  return await spotifyFetch(`/me/player/play${deviceQuery}`, { method: 'PUT' });
};

export const nextTrackWeb = async () => {
  return await spotifyFetch('/me/player/next', { method: 'POST' });
};

export const previousTrackWeb = async () => {
  return await spotifyFetch('/me/player/previous', { method: 'POST' });
};

// Controla reprodução diretamente via Spotify Web API (exclusivo para o Spotify, nunca afeta YouTube ou outros apps)
export const controlSpotifyWeb = async (action) => {
  if (action === 'play-pause' || action === 'toggle') {
    const current = await fetchCurrentPlayback();
    if (current && current.isPlaying) {
      await pausePlaybackWeb();
      return { isPlaying: false };
    } else {
      try {
        await resumePlaybackWeb();
      } catch (err) {
        await startPlayback({});
      }
      return { isPlaying: true };
    }
  } else if (action === 'play') {
    await resumePlaybackWeb();
    return { isPlaying: true };
  } else if (action === 'pause') {
    await pausePlaybackWeb();
    return { isPlaying: false };
  } else if (action === 'next') {
    await nextTrackWeb();
    return { action: 'next' };
  } else if (action === 'prev') {
    await previousTrackWeb();
    return { action: 'prev' };
  }
};

