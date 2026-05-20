/* ── Photo Controller ───────────────────────────────────────────────────── */

let photoUploading = false;

function ensureFotoHiddenInputs() {
    const formEl = document.getElementById('hv-form');
    if (!formEl) return {};
    let hidPath = document.getElementById('hidden_foto_gcs_path');
    if (!hidPath) {
        hidPath = document.createElement('input');
        hidPath.type = 'hidden'; hidPath.id = 'hidden_foto_gcs_path'; hidPath.name = 'foto_gcs_path';
        formEl.appendChild(hidPath);
    }
    let hidUrl = document.getElementById('hidden_foto_public_url');
    if (!hidUrl) {
        hidUrl = document.createElement('input');
        hidUrl.type = 'hidden'; hidUrl.id = 'hidden_foto_public_url'; hidUrl.name = 'foto_public_url';
        formEl.appendChild(hidUrl);
    }
    return { hidPath, hidUrl };
}

function getFotoHidden() {
    return {
        gcsPath: (document.getElementById('hidden_foto_gcs_path')?.value || '').trim(),
        publicUrl: (document.getElementById('hidden_foto_public_url')?.value || '').trim()
    };
}

function isFotoSeleccionadaLocal() {
    const inp = document.getElementById('photo_input');
    return Boolean(inp && inp.files && inp.files.length > 0);
}

function setPhotoPreview(url, gcsPath = '') {
    const { hidPath, hidUrl } = ensureFotoHiddenInputs();
    const img = document.getElementById('photo-img');
    const placeholder = document.getElementById('photo-placeholder');
    const btnRemove = document.getElementById('btn-remove-photo');

    if (url) {
        if (img) { img.src = url; img.style.display = 'block'; }
        if (placeholder) placeholder.style.display = 'none';
        if (btnRemove) btnRemove.classList.remove('hidden');
        if (hidPath) hidPath.value = gcsPath || '';
        if (hidUrl) hidUrl.value = url || '';
    } else {
        if (img) { img.src = ''; img.style.display = 'none'; }
        if (placeholder) placeholder.style.display = 'flex';
        if (btnRemove) btnRemove.classList.add('hidden');
        if (hidPath) hidPath.value = '';
        if (hidUrl) hidUrl.value = '';
    }
}

function clearPhotoLocal() {
    setPhotoPreview('', '');
    const status = document.getElementById('photo-status');
    const input = document.getElementById('photo_input');
    const err = document.getElementById('error-photo');
    const selectLabel = document.getElementById('photo-select-label');
    if (status) status.textContent = '';
    if (input) input.value = '';
    if (err) err.textContent = '';
    if (selectLabel) selectLabel.style.display = '';  // restore select zone
}

function setUploadingState(isUploading, msg = '') {
    photoUploading = isUploading;
    const status = document.getElementById('photo-status');
    const btnUp = document.getElementById('btn-upload-photo');
    if (status) status.textContent = msg || (isUploading ? 'Subiendo foto...' : '');
    if (btnUp) btnUp.disabled = isUploading;
}

function validarFotoSiAplica() {
    const err = document.getElementById('error-photo');
    const { gcsPath } = getFotoHidden();
    if (!isFotoSeleccionadaLocal()) { if (err) err.textContent = ''; return true; }
    if (!gcsPath) {
        if (err) err.textContent = 'La foto está seleccionada pero aún no se ha subido. Espera un momento.';
        return false;
    }
    if (err) err.textContent = '';
    return true;
}

async function uploadPhoto() {
    const photoInput = document.getElementById('photo_input');
    const file = photoInput?.files?.[0];

    let identVal = (document.getElementById('identificacion')?.value || '').trim();
    if (!identVal) identVal = sessionStorage.getItem('id_ingreso') || '';
    if (!identVal) throw new Error('Primero ingresa tu número de identificación.');
    if (!file) throw new Error('Selecciona un archivo antes de subir.');
    if (!file.type.startsWith('image/')) throw new Error('Solo se aceptan imágenes (JPG/PNG).');
    if (file.size > 5 * 1024 * 1024) throw new Error('La imagen excede el límite de 5 MB.');

    setUploadingState(true, 'Subiendo foto...');
    try {
        const fd = new FormData();
        fd.append('identificacion', identVal);
        fd.append('photo', file);
        const resp = await fetch(`${API_URL_BASE}/hv/upload-photo`, { method: 'POST', body: fd });
        const ct = resp.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
            const text = await resp.text();
            throw new Error(`Respuesta no-JSON (HTTP ${resp.status}): ${text.slice(0, 120)}`);
        }
        const result = await resp.json();
        if (!resp.ok) throw new Error(result?.error || 'Error subiendo la foto');
        setPhotoPreview(result.foto_public_url || '', result.foto_gcs_path || '');
        setUploadingState(false, 'Foto subida correctamente.');
        const err = document.getElementById('error-photo');
        if (err) err.textContent = '';
        return result;
    } catch (e) {
        setUploadingState(false, 'Error al subir la foto.');
        throw e;
    }
}

function initPhotoController() {
    const photoInput = document.getElementById('photo_input');
    const btnUpload = document.getElementById('btn-upload-photo');
    const btnRemove = document.getElementById('btn-remove-photo');
    const modalBack = document.getElementById('deletePhotoModalBackdrop');
    const modalCancel = document.getElementById('deleteModalCancel');
    const modalConfirm = document.getElementById('deleteModalConfirm');

    // Auto-upload on file select — the only upload trigger
    if (photoInput) {
        photoInput.addEventListener('change', async () => {
            const f = photoInput.files?.[0];
            if (!f) return;

            // Show local preview immediately
            const localUrl = URL.createObjectURL(f);
            const img = document.getElementById('photo-img');
            const ph = document.getElementById('photo-placeholder');
            const br = document.getElementById('btn-remove-photo');
            const selectLabel = document.getElementById('photo-select-label');

            if (img) { img.src = localUrl; img.style.display = 'block'; }
            if (ph) ph.style.display = 'none';
            if (br) br.classList.remove('hidden');
            // Hide select zone once a file is chosen
            if (selectLabel) selectLabel.style.display = 'none';

            // Clear previous hidden values
            const { hidPath, hidUrl } = ensureFotoHiddenInputs();
            if (hidPath) hidPath.value = '';
            if (hidUrl) hidUrl.value = '';

            // Auto-upload
            try {
                await uploadPhoto();
            } catch (err) {
                console.error('Error subiendo foto:', err);
                const status = document.getElementById('photo-status');
                if (status) status.textContent = 'Error al subir la foto. Intenta de nuevo.';
            }
        });
    }

    // btn-upload-photo is hidden in HTML — kept only for internal retry calls
    if (btnUpload) {
        btnUpload.addEventListener('click', async () => {
            try { await uploadPhoto(); }
            catch (err) { console.error('Retry upload error:', err); }
        });
    }

    // Remove photo: open modal
    if (btnRemove) {
        btnRemove.addEventListener('click', () => {
            if (!modalBack) { clearPhotoLocal(); return; } // fallback: just clear without confirm
            modalBack.classList.add('visible');
            modalBack.setAttribute('aria-hidden', 'false');
            modalConfirm?.focus();
        });
    }

    if (modalCancel) {
        modalCancel.addEventListener('click', () => {
            modalBack.classList.remove('visible');
            modalBack.setAttribute('aria-hidden', 'true');
            btnRemove?.focus();
        });
    }

    if (modalConfirm) {
        modalConfirm.addEventListener('click', async () => {
            try {
                modalBack?.classList.remove('visible');
                modalBack?.setAttribute('aria-hidden', 'true');

                let identVal = (document.getElementById('identificacion')?.value || '').trim();
                if (!identVal) identVal = sessionStorage.getItem('id_ingreso') || '';
                if (!identVal) { clearPhotoLocal(); showAppToast('Foto eliminada de la vista. No se encontró identificación para borrar en el servidor.', 'info'); return; }

                const { gcsPath } = getFotoHidden();
                if (gcsPath) {
                    const status = document.getElementById('photo-status');
                    if (status) status.textContent = 'Eliminando foto...';
                    const resp = await fetch(`${API_URL_BASE}/hv/foto/${encodeURIComponent(identVal)}`, { method: 'DELETE' });
                    const ct = resp.headers.get('content-type') || '';
                    const result = ct.includes('application/json') ? await resp.json() : { ok: false };
                    if (!resp.ok || !result.ok) throw new Error(result?.error || `Error HTTP ${resp.status}`);
                }

                clearPhotoLocal();
                const status = document.getElementById('photo-status');
                if (status) status.textContent = 'Foto eliminada.';
            } catch (err) {
                console.error('Error eliminando foto:', err);
                showAppToast('No se pudo eliminar la foto del servidor: ' + (err?.message || err), 'error');
                const status = document.getElementById('photo-status');
                if (status) status.textContent = 'Error al eliminar.';
            } finally {
                btnRemove?.focus();
            }
        });
    }

    // Close modal on backdrop click or Escape
    if (modalBack) {
        modalBack.addEventListener('click', e => {
            if (e.target === modalBack) { modalBack.classList.remove('visible'); modalBack.setAttribute('aria-hidden', 'true'); btnRemove?.focus(); }
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modalBack?.classList.contains('visible')) {
            modalBack.classList.remove('visible'); modalBack.setAttribute('aria-hidden', 'true'); btnRemove?.focus();
        }
    });
}
