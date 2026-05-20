/* ── Signature View ─────────────────────────────────────────────────────── */

let signatureCanvas, signatureCtx;
let drawingSignature = false;
let _firmaReadOnly   = false; // true when showing an existing firma from DB

/* ── Clear & allow redraw ────────────────────────────────────────────────── */
window.clearSignature = function () {
    signatureCanvas = document.getElementById('signatureCanvas');
    signatureCtx    = signatureCanvas ? signatureCanvas.getContext('2d') : null;
    if (!signatureCanvas || !signatureCtx) return;

    signatureCtx.fillStyle = '#ffffff';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);

    sessionStorage.removeItem('firma_temp');
    sessionStorage.removeItem('firma_url_db');

    // Unlock canvas for new drawing
    _firmaReadOnly = false;
    _setCanvasInteractive(true);

    const errorFirma = document.getElementById('error-firma');
    if (errorFirma) errorFirma.textContent = '';
};

/* ── Lock / unlock helper ────────────────────────────────────────────────── */
function _setCanvasInteractive(interactive) {
    if (!signatureCanvas) return;
    signatureCanvas.style.cursor  = interactive ? 'crosshair' : 'default';
    signatureCanvas.style.opacity = interactive ? '1' : '0.9';
    // Visual overlay on the wrapper to signal read-only
    const wrapper = signatureCanvas.closest('.signature-wrapper');
    if (wrapper) {
        wrapper.style.borderStyle = interactive ? 'dashed' : 'solid';
        wrapper.style.borderColor = interactive ? '' : 'var(--green)';
    }
}

/* ── Setup ───────────────────────────────────────────────────────────────── */
function setupSignature() {
    signatureCanvas = document.getElementById('signatureCanvas');
    if (!signatureCanvas) return;

    signatureCanvas.width  = 400;
    signatureCanvas.height = 160;
    signatureCanvas.style.width       = '100%';
    signatureCanvas.style.height      = '130px';
    signatureCanvas.style.touchAction = 'none';

    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.lineWidth   = 2;
    signatureCtx.lineCap     = 'round';
    signatureCtx.lineJoin    = 'round';
    signatureCtx.strokeStyle = '#0F1C3F';
    signatureCtx.fillStyle   = '#ffffff';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);

    // Remove previous listeners
    signatureCanvas.removeEventListener('mousedown',  _startDrawing);
    signatureCanvas.removeEventListener('mousemove',  _draw);
    signatureCanvas.removeEventListener('mouseup',    _stopDrawing);
    signatureCanvas.removeEventListener('mouseleave', _stopDrawing);
    signatureCanvas.removeEventListener('touchstart', _startDrawing);
    signatureCanvas.removeEventListener('touchmove',  _draw);
    signatureCanvas.removeEventListener('touchend',   _stopDrawing);
    signatureCanvas.removeEventListener('touchcancel',_stopDrawing);

    signatureCanvas.addEventListener('mousedown',  _startDrawing);
    signatureCanvas.addEventListener('mousemove',  _draw);
    signatureCanvas.addEventListener('mouseup',    _stopDrawing);
    signatureCanvas.addEventListener('mouseleave', _stopDrawing);
    signatureCanvas.addEventListener('touchstart', _startDrawing, { passive: false });
    signatureCanvas.addEventListener('touchmove',  _draw,         { passive: false });
    signatureCanvas.addEventListener('touchend',   _stopDrawing);
    signatureCanvas.addEventListener('touchcancel',_stopDrawing);

    const firmaGuardada = sessionStorage.getItem('firma_temp');
    const firmaUrlDB    = sessionStorage.getItem('firma_url_db');

    if (firmaGuardada && firmaGuardada.length > 1000) {
        // Restore in-session firma (user already drew this session)
        const img  = new Image();
        img.onload = () => signatureCtx.drawImage(img, 0, 0);
        img.src    = firmaGuardada;
        _firmaReadOnly = false;
        _setCanvasInteractive(true);

    } else if (firmaUrlDB) {
        // Load existing firma from DB via server proxy (avoids CORS)
        _loadFirmaFromDB(firmaUrlDB);

    } else {
        // Brand new — allow drawing
        _firmaReadOnly = false;
        _setCanvasInteractive(true);
    }
}

/* ── Load firma from server proxy ────────────────────────────────────────── */
function _loadFirmaFromDB(firmaUrlDB) {
    const id = sessionStorage.getItem('id_ingreso') || '';
    if (!id) return;

    fetch(`${API_URL_BASE}/hv/firma/${encodeURIComponent(id)}`)
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(data => {
            if (!data.base64) return;
            const img  = new Image();
            img.onload = () => {
                signatureCtx.drawImage(img, 0, 0, signatureCanvas.width, signatureCanvas.height);
                // Save to firma_temp so validation passes
                try {
                    const b64 = signatureCanvas.toDataURL('image/png');
                    if (b64 && b64.length > 1000) sessionStorage.setItem('firma_temp', b64);
                } catch { /* security error on cross-origin canvas — ignore */ }
                // Lock canvas
                _firmaReadOnly = true;
                _setCanvasInteractive(false);
            };
            img.src = data.base64;
        })
        .catch(err => {
            console.warn('[SignatureView] Could not load firma from server:', err.message);
            // Firma URL exists but image unavailable — keep unlocked so user can re-sign
            _firmaReadOnly = false;
            _setCanvasInteractive(true);
        });
}

/* ── Drawing handlers ────────────────────────────────────────────────────── */
function _startDrawing(e) {
    e.preventDefault();
    if (_firmaReadOnly) return; // locked — existing firma shown
    drawingSignature = true;
    const pos = _getCoords(e);
    signatureCtx.beginPath();
    signatureCtx.moveTo(pos.x, pos.y);
    const errorFirma = document.getElementById('error-firma');
    if (errorFirma) errorFirma.textContent = '';
}

function _draw(e) {
    e.preventDefault();
    if (!drawingSignature || _firmaReadOnly) return;
    const pos = _getCoords(e);
    signatureCtx.lineTo(pos.x, pos.y);
    signatureCtx.stroke();
    signatureCtx.beginPath();
    signatureCtx.moveTo(pos.x, pos.y);
}

function _stopDrawing(e) {
    e.preventDefault();
    if (!drawingSignature) return;
    drawingSignature = false;
    signatureCtx.beginPath();
    _saveSignature();
}

function _saveSignature() {
    if (!signatureCanvas || _firmaReadOnly) return;
    try {
        const b64 = signatureCanvas.toDataURL('image/png');
        if (b64 && b64.length > 1000) sessionStorage.setItem('firma_temp', b64);
    } catch (err) {
        console.error('Error guardando firma:', err);
    }
}

function _getCoords(e) {
    const rect   = signatureCanvas.getBoundingClientRect();
    const scaleX = signatureCanvas.width  / rect.width;
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
        x: Math.max(0, Math.min(signatureCanvas.width,  (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(signatureCanvas.height, (clientY - rect.top)  * scaleY))
    };
}
