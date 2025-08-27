const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const { fileTypes } = require('./fileTypes');

const dropArea = document.getElementById('drop-area');
const status = document.getElementById('status');
const fileButtons = document.getElementById('file-buttons');

const baseDir = path.resolve('E:/Organized');

// Store all moved files by category
const movedFiles = {};

// Helper to render grouped file list
function renderFileList() {
    fileButtons.innerHTML = '';
    Object.entries(movedFiles).forEach(([category, files]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.innerHTML = `<strong>${category} -></strong><br>`;
        files.forEach((file, idx) => {
            const button = document.createElement('button');
            button.textContent = `${idx + 1}.${file.name}`;
            button.addEventListener('click', () => {
                ipcRenderer.send('open-file', file.to);
            });
            categoryDiv.appendChild(button);
        });
        fileButtons.appendChild(categoryDiv);
    });
}

// On startup, request file list from main process
ipcRenderer.send('get-organized-files', baseDir);

ipcRenderer.on('organized-files', (event, filesByCategory) => {
    Object.keys(filesByCategory).forEach(category => {
        movedFiles[category] = filesByCategory[category];
    });
    renderFileList();
});

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('hover');
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('hover');
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('hover');

    const files = Array.from(e.dataTransfer.files);

    files.forEach(file => {
        const ext = path.extname(file.name).toLowerCase();
        let movedTo = 'misc';

        for (const [folder, extensions] of Object.entries(fileTypes)) {
            if (extensions.includes(ext)) {
                movedTo = folder;
                break;
            }
        }

        const targetFolder = path.join(baseDir, movedTo);
        const newFileName = `${Date.now()}_${file.name}`;
        const targetPath = path.join(targetFolder, newFileName);

        // Send move request to main process
        ipcRenderer.send('move-file', {
            from: file.path,
            to: targetPath,
            folder: movedTo,
            name: file.name,
            newName: newFileName
        });
    });
});

ipcRenderer.on('file-moved', (event, result) => {
    if (result.success) {
        if (!movedFiles[result.folder]) {
            movedFiles[result.folder] = [];
        }
        movedFiles[result.folder].push(result);
        renderFileList();
        status.innerText = `Moved ${result.name} to ${result.folder}`;
    } else {
        status.innerText = `Failed to move ${result.name}: ${result.error}`;
    }
});
