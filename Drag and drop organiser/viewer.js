const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

ipcRenderer.on("preview-file", (event, filePath, ext) => {
    console.log("Previewing file:", filePath, ext); // Debug log
    const fileName = path.basename(filePath);
    document.getElementById("file-name").textContent = `Previewing: ${fileName}`;
    const viewer = document.getElementById("viewer");

    const type = ext.toLowerCase();
    viewer.innerHTML = ""; // Clear previous

    if ([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"].includes(type)) {
        const img = document.createElement("img");
        img.src = filePath;
        img.style.maxWidth = "100%";
        viewer.appendChild(img);
    } else if ([".mp4", ".webm", ".ogg"].includes(type)) {
        const video = document.createElement("video");
        video.src = filePath;
        video.controls = true;
        video.style.maxWidth = "100%";
        viewer.appendChild(video);
    } else if ([".mp3", ".wav", ".aac", ".flac"].includes(type)) {
        const audio = document.createElement("audio");
        audio.src = filePath;
        audio.controls = true;
        viewer.appendChild(audio);
    } else if ([".pdf"].includes(type)) {
        const iframe = document.createElement("iframe");
        iframe.src = filePath;
        iframe.width = "100%";
        iframe.height = "600";
        viewer.appendChild(iframe);
    } else if ([".doc", ".docx"].includes(type)) {
        viewer.innerHTML = `
            <p><strong>DOC/DOCX preview not natively supported.</strong><br>
            Please open the file manually using MS Word or LibreOffice.</p>
            <p><code>${filePath}</code></p>
        `;
    } else if ([".txt"].includes(type)) {
        fs.readFile(filePath, "utf8", (err, data) => {
            const pre = document.createElement("pre");
            pre.style.whiteSpace = "pre-wrap";
            pre.style.wordBreak = "break-word";
            pre.textContent = err ? "Error loading file." : data;
            viewer.appendChild(pre);
        });
    } else {
        viewer.innerHTML = `<p>Preview not supported for this file type.</p>`;
    }
});