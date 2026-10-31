const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configura isolamento de dados e cache próprio para evitar bloqueio com Electron genérico
app.name = 'NeonPomodoro';
app.setAppUserModelId('NeonPomodoro.App');
app.setPath('userData', path.join(app.getPath('appData'), 'NeonPomodoroApp'));

// Otimizações de inicialização rápida do Chromium
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

const logFile = path.join(__dirname, '..', 'debug.log');
function log(msg) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {}
}

log('Application starting...');

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.stack || err}`);
});

let mainWindow = null;
let tray = null;
let savedNormalBounds = { width: 380, height: 620 };
let isMiniMode = false;
let isAlwaysOnTop = true;
let isQuitting = false;
let lastTimerState = { isRunning: false };

function updateTrayMenu(isRunning) {
  if (!tray || tray.isDestroyed()) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Neon Pomodoro',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: isRunning ? 'Pausar' : 'Iniciar',
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray:action', 'toggle-play');
      },
    },
    {
      label: 'Pular Ciclo',
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray:action', 'skip');
      },
    },
    {
      label: 'Resetar Tempo',
      click: () => {
        if (mainWindow) mainWindow.webContents.send('tray:action', 'reset');
      },
    },
    { type: 'separator' },
    {
      label: 'Sair do Pomodoro',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'tray-icon.png');
  try {
    tray = new Tray(trayIconPath);
    tray.setToolTip('Neon Pomodoro (Inativo)');
    updateTrayMenu(false);

    // Clique com o botão esquerdo restaura/traz para frente a janela
    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    });

    tray.on('double-click', () => {
      if (!mainWindow) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (err) {
    log(`Erro ao criar Tray: ${err}`);
  }
}

function createWindow() {
  log('createWindow called');

  const iconPath = path.join(__dirname, 'icon.ico');
  const windowIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    title: 'Neon Pomodoro',
    width: 380,
    height: 620,
    minWidth: 320,
    minHeight: 500,
    center: true,
    frame: false,
    transparent: false,
    backgroundColor: '#080511',
    show: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: true,
    skipTaskbar: false, // Fica visível na barra de tarefas
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setIcon(windowIcon);

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    log(`mainWindow.loadFile failed: ${err}`);
  });

  mainWindow.on('closed', () => {
    log('mainWindow closed');
    mainWindow = null;
  });

  mainWindow.show();
  mainWindow.focus();
}

// IPC Handlers de Janela
ipcMain.on('window:minimize', (event, options = {}) => {
  if (!mainWindow) return;

  const { forceTraditional = false } = options || {};

  // Se já está em mini-mode ou foi forçada a minimização tradicional, minimiza na barra do Windows
  if (forceTraditional || isMiniMode) {
    mainWindow.minimize();
    return;
  }

  // Ao minimizar no modo normal: encolhe para o mini widget flutuante no canto inferior direito
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

  const miniWidth = 280;
  const miniHeight = 88;
  const x = screenWidth - miniWidth - 24;
  const y = screenHeight - miniHeight - 16;

  const currentBounds = mainWindow.getBounds();
  savedNormalBounds = { width: currentBounds.width, height: currentBounds.height, x: currentBounds.x, y: currentBounds.y };

  isMiniMode = true;
  mainWindow.setMinimumSize(240, 80);
  mainWindow.setBounds({ x, y, width: miniWidth, height: miniHeight });
  mainWindow.setResizable(false);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.webContents.send('window:mini-mode-changed', true);
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:set-always-on-top', (event, flag) => {
  if (!mainWindow) return false;
  isAlwaysOnTop = Boolean(flag);
  mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'screen-saver');
  return isAlwaysOnTop;
});

ipcMain.handle('window:get-always-on-top', () => {
  return isAlwaysOnTop;
});

ipcMain.handle('window:set-mini-mode', (event, mini) => {
  if (!mainWindow) return false;
  isMiniMode = Boolean(mini);

  if (isMiniMode) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

    const miniWidth = 280;
    const miniHeight = 88;
    const x = screenWidth - miniWidth - 24;
    const y = screenHeight - miniHeight - 16;

    const bounds = mainWindow.getBounds();
    savedNormalBounds = { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };

    mainWindow.setMinimumSize(240, 80);
    mainWindow.setBounds({ x, y, width: miniWidth, height: miniHeight });
    mainWindow.setResizable(false);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
  } else {
    mainWindow.setMinimumSize(320, 500);
    mainWindow.setSize(
      savedNormalBounds.width || 380,
      savedNormalBounds.height || 620
    );
    if (savedNormalBounds.x !== undefined && savedNormalBounds.y !== undefined) {
      mainWindow.setPosition(savedNormalBounds.x, savedNormalBounds.y);
    } else {
      mainWindow.center();
    }
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'screen-saver');
  }

  return isMiniMode;
});

// IPC Handler: Atualização do Timer na Barra de Tarefas e Tray
ipcMain.on('timer:update', (event, data) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const { timeLeft, totalDuration, mode, currentCycle, cyclesTarget, isRunning, overlayDataUrl } = data;
  lastTimerState = data;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  let modeLabel = 'Foco';
  if (mode === 'shortBreak') modeLabel = 'Pausa Curta';
  if (mode === 'longBreak') modeLabel = 'Pausa Longa';

  // 1. Título dinâmico visível na barra de tarefas do Windows e no Alt+Tab
  const titleString = `${isRunning ? '⏳' : '⏸️'} ${timeStr} - ${modeLabel} | Neon Pomodoro`;
  mainWindow.setTitle(titleString);

  // 2. Barra de progresso nativa no ícone da barra de tarefas do Windows
  if (totalDuration > 0 && isRunning) {
    const progress = Math.min(1, Math.max(0, (totalDuration - timeLeft) / totalDuration));
    mainWindow.setProgressBar(progress);
  } else {
    mainWindow.setProgressBar(-1); // Limpa barra quando pausado ou parado
  }

  // 3. Distintivo numérico (Overlay Icon com os minutos) no ícone da barra de tarefas
  if (overlayDataUrl) {
    try {
      const badgeImg = nativeImage.createFromDataURL(overlayDataUrl);
      mainWindow.setOverlayIcon(badgeImg, `${mins} min restantes`);
    } catch (err) {
      log(`setOverlayIcon error: ${err}`);
    }
  } else {
    mainWindow.setOverlayIcon(null, '');
  }

  // 4. Tooltip e menu da Bandeja do Sistema (Tray perto do relógio)
  if (tray && !tray.isDestroyed()) {
    tray.setToolTip(`Neon Pomodoro: ${timeStr} [${modeLabel}]\nCiclo: ${currentCycle}/${cyclesTarget}\nStatus: ${isRunning ? 'Em execução' : 'Pausado'}`);
    updateTrayMenu(isRunning);
  }
});

// ==========================================
// Spotify / Windows Media Native Bridge
// ==========================================
let mediaBridgeProcess = null;
let currentMediaState = {
  running: false,
  status: 'not_running',
  title: '',
  artist: '',
  album: '',
  source: 'Spotify',
};

function startMediaBridge() {
  const bridgeExe = path.join(__dirname, 'bin', 'native-bridge.exe');
  if (!fs.existsSync(bridgeExe)) {
    log(`native-bridge.exe não encontrado em ${bridgeExe}`);
    return;
  }

  try {
    mediaBridgeProcess = spawn(bridgeExe, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    log(`Media bridge iniciado (PID: ${mediaBridgeProcess.pid})`);

    let buffer = '';
    mediaBridgeProcess.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // guarda pedaço incompleto se houver

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith('MEDIA_UPDATE:')) {
          try {
            const jsonStr = line.substring('MEDIA_UPDATE:'.length);
            const data = JSON.parse(jsonStr);
            currentMediaState = data;
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('media:update', data);
            }
          } catch (err) {
            log(`Erro ao fazer parse de MEDIA_UPDATE: ${err}`);
          }
        }
      }
    });

    mediaBridgeProcess.stderr.on('data', (data) => {
      log(`Media bridge stderr: ${data.toString()}`);
    });

    mediaBridgeProcess.on('exit', (code) => {
      log(`Media bridge finalizado com código ${code}`);
      mediaBridgeProcess = null;
      if (!isQuitting) {
        setTimeout(startMediaBridge, 3000);
      }
    });
  } catch (err) {
    log(`Falha ao iniciar media bridge: ${err}`);
  }
}

function stopMediaBridge() {
  if (mediaBridgeProcess) {
    try {
      if (mediaBridgeProcess.stdin.writable) {
        mediaBridgeProcess.stdin.write('exit\n');
      }
      setTimeout(() => {
        if (mediaBridgeProcess) {
          try { mediaBridgeProcess.kill(); } catch (e) {}
        }
      }, 400);
    } catch (e) {}
  }
}

ipcMain.handle('media:get-state', () => currentMediaState);

ipcMain.on('media:control', (event, action) => {
  if (mediaBridgeProcess && mediaBridgeProcess.stdin.writable) {
    mediaBridgeProcess.stdin.write(`${action}\n`);
  }
});

app.whenReady().then(() => {
  log('app.whenReady resolved');
  createWindow();
  createTray();
  startMediaBridge();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  stopMediaBridge();
});

app.on('window-all-closed', () => {
  log('app window-all-closed event fired');
  stopMediaBridge();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
