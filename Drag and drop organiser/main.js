const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let viewerWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

function createViewerWindow(filePath) {
    // Safely close previous window if it exists and is not destroyed
    if (viewerWindow && !viewerWindow.isDestroyed()) {
        viewerWindow.close();
        viewerWindow = null;
    }

    viewerWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    viewerWindow.loadFile('viewer.html');

    viewerWindow.webContents.on('did-finish-load', () => {
        viewerWindow.webContents.send('preview-file', filePath, path.extname(filePath));
    });

    viewerWindow.on('closed', () => {
        viewerWindow = null;
    });
}

// Helper to get files grouped by category
const getFilesByCategory = (baseDir, fileTypes) => {
    const filesByCategory = {};
    Object.keys(fileTypes).forEach(category => {
        const folderPath = path.join(baseDir, category);
        if (fs.existsSync(folderPath)) {
            const files = fs.readdirSync(folderPath)
                .filter(f => fs.statSync(path.join(folderPath, f)).isFile())
                .map(f => ({
                    name: f.replace(/^\d+_/, ''), // Remove timestamp prefix
                    to: path.join(folderPath, f)
                }));
            if (files.length) filesByCategory[category] = files;
        }
    });
    // Also add misc
    const miscPath = path.join(baseDir, 'misc');
    if (fs.existsSync(miscPath)) {
        const files = fs.readdirSync(miscPath)
            .filter(f => fs.statSync(path.join(miscPath, f)).isFile())
            .map(f => ({
                name: f.replace(/^\d+_/, ''),
                to: path.join(miscPath, f)
            }));
        if (files.length) filesByCategory['misc'] = files;
    }
    return filesByCategory;
};

app.whenReady().then(() => {
    createMainWindow();

    ipcMain.on('open-file', (_, filePath) => {
        createViewerWindow(filePath);
    });

    ipcMain.on('move-file', (event, { from, to, folder, name, newName }) => {
        try {
            if (!fs.existsSync(path.dirname(to))) {
                fs.mkdirSync(path.dirname(to), { recursive: true });
            }
            if (!fs.existsSync(from)) {
                event.sender.send('file-moved', { success: false, folder, name, error: 'Source file does not exist.' });
                return;
            }
            try {
                fs.renameSync(from, to);
            } catch (err) {
                if (err.code === 'EXDEV') {
                    fs.copyFileSync(from, to);
                    fs.unlinkSync(from);
                } else {
                    throw err;
                }
            }
            event.sender.send('file-moved', { success: true, folder, name, newName, to });
        } catch (err) {
            event.sender.send('file-moved', { success: false, folder, name, error: err.message });
        }
    });

    ipcMain.on('get-organized-files', (event, baseDir) => {
        const { fileTypes } = require('./fileTypes');
        const filesByCategory = getFilesByCategory(baseDir, fileTypes);
        event.sender.send('organized-files', filesByCategory);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
