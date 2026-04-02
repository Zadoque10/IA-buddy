const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const http = require('http');
const path = require('path');

let mainWindow;
let configWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 220,
    height: 340,
    x: width - 240,
    y: height - 360,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  // Rastreia cursor a ~40fps e envia posição + bounds da janela ao renderer
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const bounds = mainWindow.getBounds();
    mainWindow.webContents.send('cursor-pos', {
      cursorX: cursor.x,
      cursorY: cursor.y,
      winX: bounds.x,
      winY: bounds.y,
    });
  }, 25);
}

// Servidor HTTP — recebe eventos dos hooks do Claude Code
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'POST' && req.url === '/event') {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('state-change', data);
        }
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  } else if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200);
    res.end('pong');
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3131, '127.0.0.1', () => {
  console.log('Claude Buddy escutando na porta 3131');
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

ipcMain.on('close-app', () => app.quit());

ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (mainWindow) mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
});

function openConfigWindow() {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.focus();
    return;
  }
  configWindow = new BrowserWindow({
    width: 360,
    height: 500,
    title: 'Claude Buddy — Reações',
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'config-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  configWindow.setMenuBarVisibility(false);
  configWindow.loadFile('config.html');
  configWindow.on('closed', () => { configWindow = null; });
}

ipcMain.on('open-config', openConfigWindow);

// Encaminha estado de teste ao robô
ipcMain.on('test-state', (_, state) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-change', { state });
  }
});

ipcMain.on('show-context-menu', () => {
  const menu = Menu.buildFromTemplate([
    { label: 'Claude Buddy v1.0', enabled: false },
    { type: 'separator' },
    { label: '⚙  Configurações / Reações', click: openConfigWindow },
    { type: 'separator' },
    { label: 'Fechar', click: () => app.quit() },
  ]);
  menu.popup({ window: mainWindow });
});
