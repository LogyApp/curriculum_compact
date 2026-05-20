/* ── Signature View ─────────────────────────────────────────────────────── */

let signatureCanvas, signatureCtx;
let drawingSignature = false;
let _firmaReadOnly   = false;

/* ── Clear & unlock for redrawing ────────────────────────────────────────── */
window.clearSignature = function () {
    signatureCanvas = document.getElementById('signatureCanvas');
    signatureCtx    = signatureCanvas ? signatureCanvas.getContext('2d') : null;
    if (!signatureCanvas || !signatureCtx) return;

    // Re-create context to clear any taint from cross-origin image
    signatureCanvas.width = signatureCanvas.width; // resets canvas
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.lineWidth   = 2;
    signatureCtx.lineCap     = 'round';
    signatureCtx.lineJoin    = 'round';
    signatureCtx.strokeStyle = '#0F1C3F';
    signatureCtx.fillStyle   = '#ffffff';
    signatureCtx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);

    sessionStorage.removeItem('firma_temp');
    sessionStorage.removeItem('firma_url_db');

    _firmaReadOnly = false;
    _applyCanvasState(true);

    const errorFirma = document.getElementById('error-firma');
    if (errorFirma) errorFirma.textContent = '';
};

/* ── Visual state ────────────────────────────────────────────────────────── */
function _applyCanvasState(editable) {
    if (!signatureCanvas) return;
    signatureCanvas.style.cursor  = editable ? 'crosshair' : 'default';
    signatureCanvas.style.opacity = editable ? '1' : '0.92';

    const wrapper = signatureCanvas.closest('.signature-wrapper');
    if (wrapper) {
        wrapper.style.borderStyle = editable ? 'dashed' : 'solid';
        wrapper.style.borderColor = editable ? ''         : 'var(--green)';
    }

    // Hide "Limpiar firma" button when an existing firma is shown (read-only)
    const actions = signatureCanvas.closest('.form-section-body')
                  ?.querySelector('.signature-actions');
    if (actions) actions.style.display = editable ? '' : 'none';
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
    ['mousedown','mousemove','mouseup','mouseleave','touchstart','touchmove','touchend','touchcancel']
        .forEach(ev => {
            signatureCanvas.removeEventListener(ev, _startDrawing);
            signatureCanvas.removeEventListener(ev, _draw);
            signatureCanvas.removeEventListener(ev, _stopDrawing);
        });
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
        // Restore freshly drawn firma from this session
        const img = new Image();
        img.onload = () => signatureCtx.drawImage(img, 0, 0);
        img.src = firmaGuardada;
        _firmaReadOnly = false;
        _applyCanvasState(true);

    } else if (firmaUrlDB) {
        // Load existing firma from public GCS URL and display read-only
        _loadFirmaDirectly(firmaUrlDB);

    } else {
        _firmaReadOnly = false;
        _applyCanvasState(true);
    }
}

/* ── Load firma from public URL directly (bucket must be public) ─────────── */
function _loadFirmaDirectly(url) {
    const img = new Image();

    img.onload = () => {
        try {
            signatureCtx.drawImage(img, 0, 0, signatureCanvas.width, signatureCanvas.height);
        } catch (e) {
            // Canvas may become tainted — just visual, validation uses firma_url_db
            console.warn('[SignatureView] Canvas draw error (tainted canvas):', e.message);
        }
        _firmaReadOnly = true;
        _applyCanvasState(false);
    };

    img.onerror = () => {
        console.warn('[SignatureView] Could not load firma image from URL — allowing redraw');
        // firma_url_db still valid for submit; canvas stays unlocked
        _firmaReadOnly = false;
        _applyCanvasState(true);
    };

    // Append timestamp to bust browser cache — GCS ignores unknown query params for public objects
    img.src = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
}

/* ── Drawing ─────────────────────────────────────────────────────────────── */
function _startDrawing(e) {
    e.preventDefault();
    if (_firmaReadOnly) return;
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
        console.error('[SignatureView] Error saving firma:', err);
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
