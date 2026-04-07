document.addEventListener("DOMContentLoaded", () => {
    const videoUpload = document.getElementById('videoUpload');
    const videoPreview = document.getElementById('videoPreview');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const trimControls = document.getElementById('trimControls');
    
    const trimStart = document.getElementById('trimStart');
    const trimEnd = document.getElementById('trimEnd');
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const endTimeDisplay = document.getElementById('endTimeDisplay');
    const sliderTrack = document.getElementById('sliderTrack');
    const btnGenerate = document.getElementById('btnGenerate');

    const inputDiameter = document.getElementById('diameter');
    const inputSlices = document.getElementById('slices');
    const inputScale = document.getElementById('imageScale');
    const inputDistance = document.getElementById('edgeDistance');
    
    // Canvas 1: Cakera
    const canvas = document.getElementById('layoutPreview');
    const ctx = canvas.getContext('2d');

    // Canvas 2: Animasi Bersih
    const animCanvas = document.getElementById('animationPreview');
    const animCtx = animCanvas.getContext('2d');

    const btnPlayPreview = document.getElementById('btnPlayPreview');
    const loadingOverlay = document.getElementById('loadingOverlay');

    let extractedFrames = []; 
    let isPlaying = false;
    let currentRotationAngle = 0;
    let currentFrameIndex = 0; // Jejaki frame untuk animasi bersih
    let animationTimer = null;
    let videoDuration = 0;

    async function extractFrames() {
        if (!videoPreview.src || videoDuration === 0) return;
        
        loadingOverlay.style.display = "flex";
        btnPlayPreview.disabled = true;
        btnGenerate.disabled = true; // Kunci butang generate semasa mengekstrak
        
        const slices = parseInt(inputSlices.value) || 8;
        const start = parseFloat(trimStart.value);
        const end = parseFloat(trimEnd.value);
        const step = (end - start) / slices;

        extractedFrames = [];
        const tempCanvas = document.createElement('canvas');
        const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        const wasPlaying = !videoPreview.paused;
        videoPreview.pause();

        for(let i = 0; i < slices; i++) {
            let targetTime = start + (i * step);
            if(targetTime >= videoDuration) targetTime = videoDuration - 0.1;

            videoPreview.currentTime = targetTime;
            
            await new Promise(resolve => {
                videoPreview.addEventListener('seeked', resolve, {once: true});
            });

            tempCanvas.width = videoPreview.videoWidth;
            tempCanvas.height = videoPreview.videoHeight;
            tCtx.drawImage(videoPreview, 0, 0, tempCanvas.width, tempCanvas.height);

            const img = new Image();
            // Kualiti 0.7 untuk keseimbangan kelajuan & kejelasan di PDF
            img.src = tempCanvas.toDataURL('image/jpeg', 0.7); 
            await new Promise(r => img.onload = r);
            extractedFrames.push(img);
        }

        loadingOverlay.style.display = "none";
        btnPlayPreview.style.display = "inline-block";
        btnPlayPreview.disabled = false;
        btnGenerate.disabled = false;
        
        drawPreview(0); 
        drawAnimationPreview(0);
    }

    // Fungsi melukis Cakera
    function drawPreview(baseRotation = 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const pixelsPerCm = (canvas.width * 0.9) / 21; 
        
        const diameterCm = parseFloat(inputDiameter.value) || 20;
        const slices = parseInt(inputSlices.value) || 8;
        const scale = parseFloat(inputScale.value) || 1.0;
        const edgeDistCm = parseFloat(inputDistance.value) || 1.0;

        const radiusPx = (diameterCm * pixelsPerCm) / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(baseRotation);
        ctx.translate(-centerX, -centerY);

        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusPx, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3; 
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();

        const baseImageHeight = radiusPx * 0.35;
        const frameH = baseImageHeight * scale;
        const frameW = frameH * (9 / 16);
        const edgeDistPx = edgeDistCm * pixelsPerCm;
        const distFromCenter = radiusPx - edgeDistPx - (frameH / 2);

        const angleStep = (2 * Math.PI) / slices;
        
        for (let i = 0; i < slices; i++) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(i * angleStep);
            
            const boxY = -distFromCenter - (frameH / 2);
            const boxX = -(frameW / 2);

            if (extractedFrames[i]) {
                ctx.save();
                ctx.translate(boxX + frameW/2, boxY + frameH/2);
                ctx.rotate(Math.PI); 
                ctx.drawImage(extractedFrames[i], -frameW/2, -frameH/2, frameW, frameH);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.rect(boxX, boxY, frameW, frameH);
                ctx.strokeStyle = '#4A90E2';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore(); 
    }

    // Fungsi Melukis Animasi Bersih
    function drawAnimationPreview(frameIndex) {
        animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
        
        if (extractedFrames.length > 0 && extractedFrames[frameIndex]) {
            const img = extractedFrames[frameIndex];
            
            const padding = 20;
            const maxH = animCanvas.height - padding * 2;
            const maxW = animCanvas.width - padding * 2;
            
            let drawH = maxH;
            let drawW = drawH * (9/16);
            
            if (drawW > maxW) {
                drawW = maxW;
                drawH = drawW * (16/9);
            }
            
            const x = (animCanvas.width - drawW) / 2;
            const y = (animCanvas.height - drawH) / 2;
            
            animCtx.fillStyle = '#f1f5f9';
            animCtx.fillRect(0, 0, animCanvas.width, animCanvas.height);
            animCtx.drawImage(img, x, y, drawW, drawH);
            
            animCtx.strokeStyle = '#cbd5e1';
            animCtx.lineWidth = 2;
            animCtx.strokeRect(x, y, drawW, drawH);

        } else {
            animCtx.fillStyle = '#f1f5f9';
            animCtx.fillRect(0, 0, animCanvas.width, animCanvas.height);
            animCtx.fillStyle = '#888';
            animCtx.font = "bold 20px Arial";
            animCtx.textAlign = "center";
            animCtx.fillText("Tiada Frame", animCanvas.width/2, animCanvas.height/2);
        }
    }

    // Logik Animasi
    function toggleAnimation() {
        const slices = parseInt(inputSlices.value) || 8;
        const angleStep = (2 * Math.PI) / slices;

        if (isPlaying) {
            isPlaying = false;
            clearInterval(animationTimer);
            btnPlayPreview.textContent = "▶ Mainkan Simulasi";
            btnPlayPreview.style.backgroundColor = "#2ecc71";
            currentRotationAngle = 0;
            currentFrameIndex = 0; 
            drawPreview(currentRotationAngle); 
            drawAnimationPreview(currentFrameIndex);
        } else {
            isPlaying = true;
            btnPlayPreview.textContent = "⏸ Hentikan Simulasi";
            btnPlayPreview.style.backgroundColor = "#e74c3c";

            animationTimer = setInterval(() => {
                currentRotationAngle -= angleStep; 
                drawPreview(currentRotationAngle);
                
                currentFrameIndex = (currentFrameIndex + 1) % slices;
                drawAnimationPreview(currentFrameIndex);
            }, 1000 / 12); 
        }
    }

    btnPlayPreview.addEventListener('click', toggleAnimation);

    [inputDiameter, inputSlices, inputScale, inputDistance].forEach(input => {
        input.addEventListener('input', () => {
            drawPreview(currentRotationAngle);
            drawAnimationPreview(currentFrameIndex);
        });
        input.addEventListener('change', () => {
            if(!isPlaying) extractFrames(); 
        });
    });

    drawPreview(0); 
    drawAnimationPreview(0);

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    videoUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            videoPreview.src = fileURL;
            videoPreview.style.display = "block";
            uploadPrompt.style.display = "none";
            trimControls.style.display = "block";
            btnGenerate.disabled = false;
        }
    });

    videoPreview.addEventListener('loadedmetadata', function() {
        videoDuration = videoPreview.duration;
        trimStart.max = videoDuration;
        trimEnd.max = videoDuration;
        trimStart.value = 0;
        trimEnd.value = videoDuration;
        updateSliderUI();
        
        extractFrames();
    });

    trimStart.addEventListener('input', function() {
        if (parseFloat(trimStart.value) >= parseFloat(trimEnd.value)) {
            trimStart.value = parseFloat(trimEnd.value) - 0.1;
        }
        videoPreview.currentTime = trimStart.value; 
        updateSliderUI();
    });
    
    trimEnd.addEventListener('input', function() {
        if (parseFloat(trimEnd.value) <= parseFloat(trimStart.value)) {
            trimEnd.value = parseFloat(trimStart.value) + 0.1;
        }
        videoPreview.currentTime = trimEnd.value;
        updateSliderUI();
    });

    trimStart.addEventListener('change', extractFrames);
    trimEnd.addEventListener('change', extractFrames);

    function updateSliderUI() {
        const startVal = parseFloat(trimStart.value);
        const endVal = parseFloat(trimEnd.value);
        startTimeDisplay.textContent = formatTime(startVal);
        endTimeDisplay.textContent = formatTime(endVal);
        const percentStart = (startVal / videoDuration) * 100;
        const percentEnd = (endVal / videoDuration) * 100;
        sliderTrack.style.background = `linear-gradient(to right, #ddd ${percentStart}%, #4A90E2 ${percentStart}%, #4A90E2 ${percentEnd}%, #ddd ${percentEnd}%)`;
    }

    // --- LOGIK JANA PDF (PURE JS) ---
    btnGenerate.addEventListener('click', () => {
        if (extractedFrames.length === 0) {
            alert("Sila muat naik video dan tunggu extraction selesai.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const statusText = document.getElementById('statusText');
        
        btnGenerate.disabled = true;
        btnGenerate.textContent = "Menjana PDF...";
        statusText.textContent = "Sedang menjana PDF di dalam browser awak (tanpa server)...";
        statusText.style.color = "#4A90E2";

        // Cipta Dokumen A4 (Portrait, unit: mm)
        const doc = new jsPDF('p', 'mm', 'a4');
        
        const diameterCm = parseFloat(inputDiameter.value) || 20;
        const slices = parseInt(inputSlices.value) || 8;
        const scale = parseFloat(inputScale.value) || 1.0;
        const edgeDistCm = parseFloat(inputDistance.value) || 1.0;

        const centerX = 210 / 2; // Tengah kertas A4 (mm)
        const centerY = 297 / 2; // Tengah kertas A4 (mm)
        const radiusMm = (diameterCm * 10) / 2;

        // Lukis Bulatan & Titik Tengah
        doc.setLineWidth(0.5);
        doc.circle(centerX, centerY, radiusMm, 'S');
        doc.setFillColor(0, 0, 0);
        doc.circle(centerX, centerY, 1, 'F'); // Titik paksi

        // Susun Gambar dalam Bulatan
        const baseImageHeightMm = radiusMm * 0.35;
        const frameHMm = baseImageHeightMm * scale;
        const frameWMm = frameHMm * (9 / 16);
        const edgeDistMm = edgeDistCm * 10;
        const distFromCenter = radiusMm - edgeDistMm - (frameHMm / 2);

        const angleStep = 360 / slices;

        for (let i = 0; i < slices; i++) {
            const angleDeg = i * angleStep;
            const angleRad = (angleDeg * Math.PI) / 180;

            // Kira kedudukan pusat kotak gambar
            const posX = centerX + distFromCenter * Math.sin(angleRad);
            const posY = centerY - distFromCenter * Math.cos(angleRad);

            if (extractedFrames[i]) {
                const imgData = extractedFrames[i].src;

                // Masukkan gambar ke PDF dengan putaran
                doc.addImage(
                    imgData, 
                    'JPEG', 
                    posX - (frameWMm / 2), 
                    posY - (frameHMm / 2), 
                    frameWMm, 
                    frameHMm, 
                    undefined, 
                    'FAST', 
                    angleDeg + 180 // Pusing 180 + sudut kedudukan
                );
            }
        }

        // Selesai & Muat Turun
        doc.save('Template_Phenakistoscope.pdf');
        
        statusText.textContent = "✅ Berjaya! PDF dijana sepenuhnya dalam browser.";
        statusText.style.color = "#2ecc71";
        btnGenerate.disabled = false;
        btnGenerate.textContent = "Cipta Template PDF";
    });
});