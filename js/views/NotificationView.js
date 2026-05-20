/* ── Notification View ─────────────────────────────────────────────────────
   Replaces all browser alert() / confirm() with branded UI components.

   Exports (global functions):
     showSuccessModal({ isNew, identificacion })  — fullscreen success overlay
     showAppToast(message, type)                  — top-center toast ('error'|'warning'|'info')
     hideAppToast()
     showAppDialog({ title, body, onConfirm, confirmLabel, cancelLabel }) — confirm dialog
   ─────────────────────────────────────────────────────────────────────────── */

const _TOAST_ICONS = {
    error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
               <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
             </svg>`,
    info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="10"/>
             <line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
           </svg>`,
};

let _toastTimer = null;

/* ── Success overlay ────────────────────────────────────────────────────── */
function showSuccessModal({ isNew = true, identificacion = '' } = {}) {
    const overlay = document.getElementById('success-overlay');
    const title = document.getElementById('success-title');
    const sub = document.getElementById('success-sub');
    const meta = document.getElementById('success-meta');
    const idEl = document.getElementById('success-id');

    if (title) title.textContent = isNew ? '¡Registro exitoso!' : '¡Actualización exitosa!';

    if (sub) sub.textContent = isNew
        ? 'Tu hoja de vida ha sido registrada correctamente en el sistema de selección de personal de Logyser S.A.S.'
        : 'Tu hoja de vida ha sido actualizada exitosamente. Los cambios ya están disponibles en el sistema de Logyser S.A.S.';

    if (idEl && identificacion) {
        idEl.textContent = identificacion;
        if (meta) meta.style.display = 'flex';
    } else if (meta) {
        meta.style.display = 'none';
    }

    if (overlay) {
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
        // Focus the action button for accessibility
        setTimeout(() => document.getElementById('btn-success-volver')?.focus(), 100);
    }
}

/* ── App toast (top-center, replaces alert) ─────────────────────────────── */
function showAppToast(message, type = 'error') {
    const toast = document.getElementById('app-toast');
    const msgEl = document.getElementById('app-toast-msg');
    const iconEl = document.getElementById('app-toast-icon');
    if (!toast || !msgEl) { console.warn('[NotificationView] #app-toast not found'); return; }

    if (iconEl) iconEl.innerHTML = _TOAST_ICONS[type] || _TOAST_ICONS.error;
    msgEl.textContent = message;
    toast.className = `app-toast app-toast-${type}`;
    toast.style.display = 'flex';
    toast.removeAttribute('aria-hidden');

    // Clear previous auto-dismiss
    if (_toastTimer) clearTimeout(_toastTimer);

    // Auto-dismiss non-errors after 6 s
    if (type !== 'error') {
        _toastTimer = setTimeout(hideAppToast, 6000);
    }
}

function hideAppToast() {
    const toast = document.getElementById('app-toast');
    if (toast) { toast.style.display = 'none'; toast.setAttribute('aria-hidden', 'true'); }
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
}

/* ── App dialog (replaces confirm) ─────────────────────────────────────── */
function showAppDialog({ title = '¿Confirmar acción?', body = '', onConfirm, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', isDanger = false } = {}) {
    const dialog = document.getElementById('app-dialog');
    const titleEl = document.getElementById('app-dialog-title');
    const bodyEl = document.getElementById('app-dialog-body');
    const btnOk = document.getElementById('btn-app-dialog-confirm');
    const btnCancel = document.getElementById('btn-app-dialog-cancel');
    if (!dialog) { if (onConfirm && confirm(body || title)) onConfirm(); return; }

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = body;
    if (btnOk) btnOk.textContent = confirmLabel;
    if (btnCancel) btnCancel.textContent = cancelLabel;
    if (btnOk) btnOk.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

    dialog.style.display = 'flex';
    dialog.removeAttribute('aria-hidden');

    const close = () => {
        dialog.style.display = 'none';
        dialog.setAttribute('aria-hidden', 'true');
    };

    // Rebind buttons (clone to remove old handlers)
    const newOk = btnOk?.cloneNode(true);
    const newCancel = btnCancel?.cloneNode(true);
    btnOk?.parentNode?.replaceChild(newOk, btnOk);
    btnCancel?.parentNode?.replaceChild(newCancel, btnCancel);

    newOk?.addEventListener('click', () => { close(); if (onConfirm) onConfirm(); });
    newCancel?.addEventListener('click', close);

    // Close on backdrop click
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }, { once: true });
}

/* ── Initialize notification event handlers ─────────────────────────────── */
function initNotifications() {
    // Toast close button
    document.getElementById('btn-app-toast-close')?.addEventListener('click', hideAppToast);

    // Success overlay — "Volver al inicio"
    document.getElementById('btn-success-volver')?.addEventListener('click', () => {
        const overlay = document.getElementById('success-overlay');
        if (overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); }

        // Full reset and return to gate
        if (typeof resetFormToInitialState === 'function') resetFormToInitialState();

        document.getElementById('form-area').style.display = 'none';
        document.getElementById('app-header').style.display = 'none';
        document.getElementById('verif-gate').style.display = '';

        // Clear gate fields
        ['tipo_documento_ingreso', 'identificacion_ingreso', 'fecha_expedicion_ingreso']
            .forEach(fid => {
                const el = document.getElementById(fid);
                if (el) { el.value = ''; el.classList.remove('error'); }
            });
        const chk = document.getElementById('acepta_privacidad');
        if (chk) chk.checked = false;
        const gMsg = document.getElementById('gate-msg');
        if (gMsg) { gMsg.style.display = 'none'; gMsg.textContent = ''; }

        // Focus first gate field
        setTimeout(() => document.getElementById('tipo_documento_ingreso')?.focus(), 100);
    });

    // Close dialog on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const dlg = document.getElementById('app-dialog');
            if (dlg?.style.display === 'flex') {
                dlg.style.display = 'none';
                dlg.setAttribute('aria-hidden', 'true');
            }
            hideAppToast();
        }
    });
}
