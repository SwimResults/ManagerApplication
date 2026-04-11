const {app, BrowserWindow, ipcMain, dialog, Menu} = require('electron/main')
const path = require('node:path')
const fs = require('node:fs')
const dgram = require('node:dgram')
const express = require('express')

let SerialPort = null
try {
    ({SerialPort} = require('serialport'))
} catch (error) {
    console.warn('[MainProcess] serialport dependency not found. Serial COM feature is disabled.', error)
}

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

const SETTINGS_FILE_NAME = 'settings.json';

const serialState = {
    port: null,
    status: {
        isListening: false,
        portPath: null,
        error: null
    }
};

function getSettingsPath() {
    return path.join(app.getPath('userData'), SETTINGS_FILE_NAME);
}

function loadPersistedViewMode() {
    try {
        const settingsPath = getSettingsPath();
        if (!fs.existsSync(settingsPath)) {
            return;
        }

        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const mode = parsed?.viewMode;

        if (['simple', 'advanced', 'expert'].includes(mode)) {
            sharedState.viewMode = mode;
            console.log('[MainProcess] Restored persisted view mode:', mode);
        }
    } catch (error) {
        console.warn('[MainProcess] Failed to load persisted view mode:', error);
    }
}

function persistViewMode(mode) {
    try {
        const settingsPath = getSettingsPath();
        const payload = {
            viewMode: mode
        };

        fs.writeFileSync(settingsPath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (error) {
        console.warn('[MainProcess] Failed to persist view mode:', error);
    }
}

function setViewMode(mode) {
    const allowedModes = ['simple', 'advanced', 'expert'];
    if (!allowedModes.includes(mode)) {
        return false;
    }

    if (sharedState.viewMode !== mode) {
        console.log('[MainProcess] Updating view mode:', mode);
        sharedState.viewMode = mode;
        persistViewMode(mode);
        createApplicationMenu();
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

function broadcastSerialStatus() {
    BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('serial:status', serialState.status)
    })
}

function formatHexDump(buffer, bytesPerLine = 16) {
    const lines = []

    for (let i = 0; i < buffer.length; i += bytesPerLine) {
        const chunk = buffer.subarray(i, i + bytesPerLine)
        const offset = i.toString(16).padStart(4, '0')
        const hex = Array.from(chunk)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(' ')
        lines.push(`${offset}: ${hex}`)
    }

    return lines.join('\n')
}

function broadcastSerialMessage(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data)

    const payload = {
        message: buffer.toString('utf-8'),
        hexDump: formatHexDump(buffer),
        byteLength: buffer.length,
        timestamp: new Date().toISOString()
    }

    BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('serial:message', payload)
    })
}

function broadcastSerialError(message) {
    BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('serial:error', message)
    })
}

function updateSerialStatus(partialStatus) {
    serialState.status = {
        ...serialState.status,
        ...partialStatus
    }
    broadcastSerialStatus()
}

function normalizeSerialConfig(config) {
    if (!config || typeof config !== 'object') {
        throw new Error('Invalid serial configuration payload.')
    }

    const path = typeof config.path === 'string' ? config.path.trim() : ''
    const baudRate = Number(config.baudRate)
    const dataBits = Number(config.dataBits)
    const stopBits = Number(config.stopBits)
    const parity = typeof config.parity === 'string' ? config.parity : 'none'

    const validDataBits = [5, 6, 7, 8]
    const validStopBits = [1, 2]
    const validParity = ['none', 'even', 'odd', 'mark', 'space']

    if (!path) {
        throw new Error('A serial port path must be selected.')
    }

    if (!Number.isInteger(baudRate) || baudRate <= 0) {
        throw new Error('Baud rate must be a positive integer.')
    }

    if (!validDataBits.includes(dataBits)) {
        throw new Error('Unsupported data bits value.')
    }

    if (!validStopBits.includes(stopBits)) {
        throw new Error('Unsupported stop bits value.')
    }

    if (!validParity.includes(parity)) {
        throw new Error('Unsupported parity value.')
    }

    return {
        path,
        baudRate,
        dataBits,
        stopBits,
        parity
    }
}

function closeSerialPort() {
    return new Promise(resolve => {
        if (!serialState.port) {
            updateSerialStatus({
                isListening: false,
                portPath: null,
                error: null
            })
            resolve({success: true})
            return
        }

        const currentPort = serialState.port
        serialState.port = null

        if (!currentPort.isOpen) {
            updateSerialStatus({
                isListening: false,
                portPath: null,
                error: null
            })
            resolve({success: true})
            return
        }

        currentPort.close(error => {
            if (error) {
                const message = error.message || 'Failed to close serial port.'
                updateSerialStatus({
                    isListening: false,
                    portPath: null,
                    error: message
                })
                broadcastSerialError(message)
                resolve({success: false, error: message})
                return
            }

            updateSerialStatus({
                isListening: false,
                portPath: null,
                error: null
            })
            resolve({success: true})
        })
    })
}

async function startSerialListener(config) {
    if (!SerialPort) {
        return {success: false, error: 'serialport package is not available.'}
    }

    let normalizedConfig
    try {
        normalizedConfig = normalizeSerialConfig(config)
    } catch (error) {
        const message = error.message || 'Invalid serial configuration.'
        updateSerialStatus({error: message})
        return {success: false, error: message}
    }

    if (serialState.port) {
        const stopResult = await closeSerialPort()
        if (!stopResult.success) {
            return stopResult
        }
    }

    return new Promise(resolve => {
        try {
            const port = new SerialPort({
                ...normalizedConfig,
                autoOpen: false
            })

            serialState.port = port

            port.on('data', data => {
                if (!data || data.length === 0) {
                    return
                }
                broadcastSerialMessage(data)
            })

            port.on('error', error => {
                const message = error.message || 'Serial port error.'
                updateSerialStatus({
                    isListening: false,
                    error: message
                })
                broadcastSerialError(message)
            })

            port.on('close', () => {
                serialState.port = null
                updateSerialStatus({
                    isListening: false,
                    portPath: null
                })
            })

            port.open(error => {
                if (error) {
                    const message = error.message || 'Failed to open serial port.'
                    serialState.port = null
                    updateSerialStatus({
                        isListening: false,
                        portPath: null,
                        error: message
                    })
                    broadcastSerialError(message)
                    resolve({success: false, error: message})
                    return
                }

                updateSerialStatus({
                    isListening: true,
                    portPath: normalizedConfig.path,
                    error: null
                })
                resolve({success: true})
            })
        } catch (error) {
            const message = error.message || 'Failed to start serial listener.'
            serialState.port = null
            updateSerialStatus({
                isListening: false,
                portPath: null,
                error: message
            })
            broadcastSerialError(message)
            resolve({success: false, error: message})
        }
    })
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

ipcMain.handle('serial:list-ports', async () => {
    if (!SerialPort) {
        return []
    }

    try {
        return await SerialPort.list()
    } catch (error) {
        console.error('[MainProcess] Failed to list serial ports:', error)
        return []
    }
})

ipcMain.handle('serial:get-status', async () => {
    return serialState.status
})

ipcMain.handle('serial:start-listening', async (event, config) => {
    return await startSerialListener(config)
})

ipcMain.handle('serial:stop-listening', async () => {
    return await closeSerialPort()
})

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
    loadPersistedViewMode();
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
        closeSerialPort()
        app.quit()
    }
})
