const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { shell } = require('electron');

let currentServer = null;

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function startAuth(clientId) {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      return reject(new Error('Client ID não informado.'));
    }

    // Fecha servidor anterior se houver
    if (currentServer) {
      try {
        currentServer.close();
      } catch (e) {}
      currentServer = null;
    }

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const redirectUri = 'http://127.0.0.1:8888/callback';

    const scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-library-read',
      'user-read-private',
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(
      clientId
    )}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code_challenge_method=S256&code_challenge=${encodeURIComponent(
      challenge
    )}&scope=${encodeURIComponent(scopes)}`;

    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.pathname === '/callback') {
          const { code, error } = parsedUrl.query;

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="background:#080511; color:#f87171; font-family:sans-serif; text-align:center; padding-top:60px;">
                  <h2>Erro na Autorização</h2>
                  <p>${error}</p>
                  <p>Você pode fechar esta aba e tentar novamente no Neon Pomodoro.</p>
                </body>
              </html>
            `);
            server.close();
            currentServer = null;
            return reject(new Error(`Spotify Auth Error: ${error}`));
          }

          if (code) {
            // Troca o código pelo access_token usando PKCE
            const tokenParams = new URLSearchParams({
              client_id: clientId,
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirectUri,
              code_verifier: verifier,
            });

            const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: tokenParams.toString(),
            });

            const tokenData = await tokenResponse.json();

            if (!tokenResponse.ok) {
              res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(`
                <html>
                  <body style="background:#080511; color:#f87171; font-family:sans-serif; text-align:center; padding-top:60px;">
                    <h2>Falha ao obter token</h2>
                    <p>${tokenData.error_description || tokenData.error || 'Erro desconhecido'}</p>
                  </body>
                </html>
              `);
              server.close();
              currentServer = null;
              return reject(new Error(tokenData.error_description || 'Falha ao trocar código'));
            }

            // Sucesso! Página de retorno estilizada no tema do app
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <title>Conectado ao Neon Pomodoro</title>
                  <style>
                    body {
                      background: #080511;
                      color: #fff;
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      height: 85vh;
                      margin: 0;
                      text-align: center;
                    }
                    .card {
                      background: rgba(18, 12, 38, 0.9);
                      border: 1px solid rgba(139, 92, 246, 0.4);
                      box-shadow: 0 0 30px rgba(124, 58, 237, 0.3);
                      border-radius: 20px;
                      padding: 40px;
                      max-width: 420px;
                    }
                    .check {
                      width: 60px;
                      height: 60px;
                      border-radius: 50%;
                      background: #10b981;
                      color: white;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 32px;
                      margin: 0 auto 20px;
                      box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
                    }
                    h1 { color: #fff; margin: 0 0 10px; font-size: 22px; }
                    p { color: #94a3b8; font-size: 14px; margin: 0; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="check">&#10003;</div>
                    <h1>Spotify Conectado!</h1>
                    <p>O Neon Pomodoro agora está conectado à sua conta.</p>
                    <p style="margin-top: 15px; color: #a855f7; font-size: 12px;">Você já pode fechar esta aba e voltar para o aplicativo.</p>
                  </div>
                </body>
              </html>
            `);

            server.close();
            currentServer = null;

            resolve({
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresIn: tokenData.expires_in,
              tokenTimestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        server.close();
        currentServer = null;
        reject(err);
      }
    });

    currentServer = server;

    server.listen(8888, '127.0.0.1', () => {
      shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      currentServer = null;
      reject(err);
    });

    // Timeout de 2 minutos para autorização
    setTimeout(() => {
      if (currentServer) {
        try {
          currentServer.close();
        } catch (e) {}
        currentServer = null;
        reject(new Error('Tempo limite de autorização excedido (2 minutos).'));
      }
    }, 120000);
  });
}

async function refreshToken(clientId, storedRefreshToken) {
  if (!clientId || !storedRefreshToken) {
    throw new Error('Client ID ou Refresh Token ausente.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Falha ao renovar token');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || storedRefreshToken,
    expiresIn: data.expires_in,
    tokenTimestamp: Date.now(),
  };
}

module.exports = {
  startAuth,
  refreshToken,
};
