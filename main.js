const {app, BrowserWindow, ipcMain, dialog, Menu} = require('electron/main')
const path = require('node:path')
const dgram = require('node:dgram')
const express = require('express')

const HTTP_PORT = 3000

// === SHARED STATE STORE IN MAIN PROCESS ===
// This is the single source of truth for all renderer processes
const sharedState = {
  currentHeat: {
    event: 0,
    heat: 0,
    distance: 0,
    laps: 0,
    style: '',
    runningTime: -1,
    competitors: []
  },
  state: 'NOT_RUNNING', // RUNNING, READY, NOT_RUNNING
  algeState: 'DISCONNECTED', // CONNECTED, DISCONNECTED
    udpActive: false,
    viewMode: 'simple' // simple, advanced, expert
};

function setViewMode(mode) {
    const allowedModes = ['simple', 'advanced', 'expert'];
    if (!allowedModes.includes(mode)) {
        return false;
    }

    if (sharedState.viewMode !== mode) {
        console.log('[MainProcess] Updating view mode:', mode);
        sharedState.viewMode = mode;
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('view-mode:changed', mode);
        });
    }

    return true;
}

function createApplicationMenu() {
    const viewModeMenuItems = [
        {
            label: 'Simple',
            type: 'radio',
            checked: sharedState.viewMode === 'simple',
            click: () => setViewMode('simple')
        },
        {
            label: 'Advanced',
            type: 'radio',
            checked: sharedState.viewMode === 'advanced',
            click: () => setViewMode('advanced')
        },
        {
            label: 'Expert',
            type: 'radio',
            checked: sharedState.viewMode === 'expert',
            click: () => setViewMode('expert')
        }
    ];

    const template = [
        ...(process.platform === 'darwin' ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'File',
            submenu: [
                process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(process.platform === 'darwin' ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'View Mode',
                    submenu: viewModeMenuItems
                },
                { type: 'separator' },
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(process.platform === 'darwin' ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Notify all windows that state changed
function broadcastStateChange(changeType, data) {
  console.log(`[MainProcess] State changed: ${changeType}`, data);
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send(`alge:state-changed:${changeType}`, data);
  });
}

function startHttpServer() {
    const httpApp = express()
    const distPath = path.join(__dirname, 'dist/swim-results-manager/browser')

    // Serve static files from the dist folder
    httpApp.use(express.static(distPath))

    // Special handling for OAuth callback - redirect to hash-based route
    httpApp.get('/auth', (req, res) => {
        console.log('[HTTP Server] OAuth callback received:', req.url);
        // Preserve query parameters (code, state, etc.)
        const queryString = req.url.split('?')[1] || '';
        const redirectUrl = `/#/auth${queryString ? '?' + queryString : ''}`;
        console.log('[HTTP Server] Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
    });

    httpApp.get('/auth/logout', (req, res) => {
        console.log('[HTTP Server] Logout callback received');
        res.redirect('/#/auth/logout');
    });

    // Handle all other routes by serving index.html (for Angular routing)
    httpApp.get(/.*/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'))
    })

    return new Promise((resolve) => {
        httpApp.listen(HTTP_PORT, '127.0.0.1', () => {
            console.log(`HTTP server listening on http://127.0.0.1:${HTTP_PORT}`)
            resolve()
        })
    })
}

function createWindow() {
    console.log('createWindow');

    const win = new BrowserWindow({
        width: 900,
        height: 650,
        icon: `file://${__dirname}/dist/assets/logo.png`,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // TODO: implement cors properly
        },
        title: "SwimResults Manager"
    })

    win.loadURL(`http://127.0.0.1:${HTTP_PORT}`)

    // Open dev tools for debugging
    // win.webContents.openDevTools()

    //let socket = dgram.createSocket({ type: 'udp4', reuseAddr: true, reusePort: true });
    //socket.bind(26);
}

// IPC handlers
ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    return result;
});

// === NEW REQUEST-RESPONSE PATTERN FOR STATE ===
// Renderers query the state instead of constantly receiving broadcasts

ipcMain.handle('alge:get-current-heat', async () => {
    console.log('[MainProcess] Returning current heat');
    return sharedState.currentHeat;
});

ipcMain.handle('alge:get-state', async () => {
    return sharedState.state;
});

ipcMain.handle('alge:get-alge-state', async () => {
    return sharedState.algeState;
});

ipcMain.handle('alge:get-udp-active', async () => {
    return sharedState.udpActive;
});

ipcMain.handle('view-mode:get', async () => {
    return sharedState.viewMode;
});

ipcMain.handle('view-mode:set', async (event, mode) => {
    const updated = setViewMode(mode);
    return {
      success: updated,
      viewMode: sharedState.viewMode
    };
});

// === MAIN PROCESS UPDATES STATE ===
// These are called by the main window when UDP data arrives
// Only broadcast if the value actually changed

ipcMain.on('alge:update-current-heat', (event, heat) => {
    // For objects, compare key values to detect actual changes
    const heatChanged =
        JSON.stringify(sharedState.currentHeat) !== JSON.stringify(heat);

    if (heatChanged) {
        console.log('[MainProcess] Updating current heat:', heat.heat, heat.event);
        sharedState.currentHeat = heat;
        broadcastStateChange('heat', heat);
    }
});

ipcMain.on('alge:update-state', (event, state) => {
    if (sharedState.state !== state) {
        console.log('[MainProcess] Updating state:', state);
        sharedState.state = state;
        broadcastStateChange('state', state);
    }
});

ipcMain.on('alge:update-alge-state', (event, algeState) => {
    if (sharedState.algeState !== algeState) {
        console.log('[MainProcess] Updating alge state:', algeState);
        sharedState.algeState = algeState;
        broadcastStateChange('alge-state', algeState);
    }
});

ipcMain.on('alge:update-udp-active', (event, active) => {
    if (sharedState.udpActive !== active) {
        console.log('[MainProcess] Updating UDP active:', active);
        sharedState.udpActive = active;
        broadcastStateChange('udp-active', active);
    }
});

// Handler for creating a new display window
ipcMain.handle('window:create-display', async () => {
    console.log('=== IPC Handler: window:create-display called ===');
    try {
        console.log('Creating new BrowserWindow for display...');
        const displayWindow = new BrowserWindow({
            width: 1400,
            height: 800,
            icon: `file://${__dirname}/dist/assets/logo.png`,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                webSecurity: false
            },
            title: "Live Timing Display"
        });

        console.log('Window created, window ID:', displayWindow.id);

        // First load the root URL
        const displayUrl = `http://127.0.0.1:${HTTP_PORT}`;
        console.log('Loading base URL: ' + displayUrl);
        displayWindow.loadURL(displayUrl);

        // Wait for the page to be ready, then navigate to display route
        displayWindow.webContents.on('did-finish-load', () => {
            console.log('Page loaded, navigating to /display route');
            displayWindow.webContents.executeJavaScript(`
                window.location.hash = '#/display';
                console.log('Navigation to #/display executed');
            `).catch(err => {
                console.error('Error navigating:', err);
            });
        });

        // Open dev tools for debugging
        //displayWindow.webContents.openDevTools();

        console.log('Window setup complete');
        return {
            success: true,
            windowId: displayWindow.id
        };
    } catch (error) {
        console.error('Error creating display window:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

app.whenReady().then(() => {
    createApplicationMenu();

    startHttpServer().then(() => {
        createWindow()
    })

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            startHttpServer().then(() => {
                createWindow()
            })
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
