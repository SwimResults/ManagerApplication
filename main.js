const {app, BrowserWindow, ipcMain, dialog} = require('electron/main')
const path = require('node:path')
const dgram = require('node:dgram')
const express = require('express')

const HTTP_PORT = 3000

function startHttpServer() {
    const httpApp = express()
    const distPath = path.join(__dirname, 'dist/swim-results-manager/browser')

    // Serve static files from the dist folder
    httpApp.use(express.static(distPath))

    // Handle all routes by serving index.html (for Angular routing)
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
        console.log('Loading URL: http://127.0.0.1:' + HTTP_PORT + '/#/display');

        // Load the display route
        displayWindow.loadURL(`http://127.0.0.1:${HTTP_PORT}/#/display`);

        // Open dev tools for debugging
        displayWindow.webContents.openDevTools();

        console.log('Window loaded successfully');
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
