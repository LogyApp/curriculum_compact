/* ── Signature View ─────────────────────────────────────────────────────── */

let signatureCanvas, signatureCtx;
let drawingSignature = false;

window.clearSignature = function () {
    signatureCanvas = document.getElementById('signatureCanvas');
    signatureCtx = signatureCanvas ? signatureCanvas.getContext('2d') : null;
    if (!signatureCanvas || !signatureCtx) return;
    signatureCtx.fillStyle = '#ffffff';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    sessionStorage.removeItem('firma_temp');
    sessionStorage.removeItem('firma_url_db');
    const badge = document.getElementById('firma-existente-badge');
    if (badge) badge.style.display = 'none';
    const errorFirma = document.getElementById('error-firma');
    if (errorFirma) errorFirma.textContent = '';
};

function setupSignature() {
    signatureCanvas = document.getElementById('signatureCanvas');
    if (!signatureCanvas) return;

    signatureCanvas.width = 400;
    signatureCanvas.height = 160;
    signatureCanvas.style.width = '100%';
    signatureCanvas.style.height = '130px';
    signatureCanvas.style.cursor = 'crosshair';
    signatureCanvas.style.touchAction = 'none';

    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';
    signatureCtx.strokeStyle = '#0F1C3F';
    signatureCtx.fillStyle = '#ffffff';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);

    const firmaGuardada = sessionStorage.getItem('firma_temp');
    if (firmaGuardada && firmaGuardada.length > 1000) {
        const img = new Image();
        img.onload = () => signatureCtx.drawImage(img, 0, 0);
        img.src = firmaGuardada;
    }

    // Show badge if aspirant has a signature from previous registration
    const firmaUrlDB = sessionStorage.getItem('firma_url_db');
    const badge = document.getElementById('firma-existente-badge');
    if (badge) badge.style.display = (firmaUrlDB && !firmaGuardada) ? 'flex' : 'none';

    // Remove previous listeners to avoid duplicates
    signatureCanvas.removeEventListener('mousedown', _startDrawing);
    signatureCanvas.removeEventListener('mousemove', _draw);
    signatureCanvas.removeEventListener('mouseup', _stopDrawing);
    signatureCanvas.removeEventListener('mouseleave', _stopDrawing);
    signatureCanvas.removeEventListener('touchstart', _startDrawing);
    signatureCanvas.removeEventListener('touchmove', _draw);
    signatureCanvas.removeEventListener('touchend', _stopDrawing);
    signatureCanvas.removeEventListener('touchcancel', _stopDrawing);

    signatureCanvas.addEventListener('mousedown', _startDrawing);
    signatureCanvas.addEventListener('mousemove', _draw);
    signatureCanvas.addEventListener('mouseup', _stopDrawing);
    signatureCanvas.addEventListener('mouseleave', _stopDrawing);
    signatureCanvas.addEventListener('touchstart', _startDrawing, { passive: false });
    signatureCanvas.addEventListener('touchmove', _draw, { passive: false });
    signatureCanvas.addEventListener('touchend', _stopDrawing);
    signatureCanvas.addEventListener('touchcancel', _stopDrawing);
}

function _startDrawing(e) {
    e.preventDefault();
    drawingSignature = true;
    const pos = _getCoords(e);
    signatureCtx.beginPath();
    signatureCtx.moveTo(pos.x, pos.y);
    const errorFirma = document.getElementById('error-firma');
    if (errorFirma) errorFirma.textContent = '';
}

function _draw(e) {
    e.preventDefault();
    if (!drawingSignature) return;
    const pos = _getCoords(e);
    signatureCtx.lineTo(pos.x, pos.y);
    signatureCtx.stroke();
    signatureCtx.beginPath();
    signatureCtx.moveTo(pos.x, pos.y);
}

function _stopDrawing(e) {
    e.preventDefault();
    drawingSignature = false;
    signatureCtx.beginPath();
    _saveSignature();
}

function _saveSignature() {
    if (!signatureCanvas) return;
    try {
        const b64 = signatureCanvas.toDataURL('image/png');
        if (b64 && b64.length > 1000) sessionStorage.setItem('firma_temp', b64);
    } catch (err) {
        console.error('Error guardando firma:', err);
    }
}

function _getCoords(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    const scaleX = signatureCanvas.width / rect.width;
    const scaleY = signatureCanvas.height / rect.height;
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
        x: Math.max(0, Math.min(signatureCanvas.width, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(signatureCanvas.height, (clientY - rect.top) * scaleY))
    };
}
