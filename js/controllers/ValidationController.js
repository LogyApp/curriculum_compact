/* ── Validation Controller ──────────────────────────────────────────────── */

function validateStep(stepIndex) {
    limpiarErroresCampo();

    const steps = Array.from(document.querySelectorAll('.form-step'));
    const stepElement = steps[stepIndex];
    if (!stepElement) return false;

    let valid = true;
    let firstInvalid = null;

    // Check selects that might still be loading
    const selects = stepElement.querySelectorAll('select');
    for (const sel of selects) {
        if (sel.getAttribute('data-required') === 'true' && sel.options.length <= 1 && sel.innerText.includes('Cargando')) {
            showAppToast('Algunos datos no cargaron por falla de conexión. Por favor recarga la página.', 'warning');
            return false;
        }
    }

    // Validate required fields
    const requiredFields = stepElement.querySelectorAll("[data-required='true']");
    requiredFields.forEach(field => {
        const value = (field.value || '').trim();
        if (value === '' || value === null) {
            field.classList.add('error');
            const errorDiv = document.getElementById('error-' + field.id);
            if (errorDiv) errorDiv.textContent = 'Este campo es obligatorio';
            if (!firstInvalid) firstInvalid = field;
            valid = false;
        }
    });

    // ── Step 1: format validations + firma ───────────────────────────────
    if (stepIndex === 1) {
        // Email format
        const email = document.getElementById('correo_electronico');
        if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            email.classList.add('error');
            const err = document.getElementById('error-correo_electronico');
            if (err) err.textContent = 'El correo electrónico no es válido';
            if (!firstInvalid) firstInvalid = email;
            valid = false;
        }

        // Phone: exactly 10 digits
        const tel = document.getElementById('telefono');
        if (tel && tel.value && tel.value.replace(/\D/g, '').length !== 10) {
            tel.classList.add('error');
            const err = document.getElementById('error-telefono');
            if (err) err.textContent = 'El teléfono debe tener 10 dígitos';
            if (!firstInvalid) firstInvalid = tel;
            valid = false;
        }

        // ID: 5–12 digits
        const ident = document.getElementById('identificacion');
        if (ident && ident.value) {
            const digits = ident.value.replace(/\D/g, '').length;
            if (digits < 5 || digits > 12) {
                ident.classList.add('error');
                const err = document.getElementById('error-identificacion');
                if (err) err.textContent = 'La identificación debe tener entre 5 y 12 dígitos';
                if (!firstInvalid) firstInvalid = ident;
                valid = false;
            }
        }

        // Firma — mandatory, must have real drawn content (> 5000 chars ensures
        // it's not an empty/blank canvas, whose base64 can still reach ~2-3 KB)
        const firma      = sessionStorage.getItem('firma_temp');
        const firmaUrlDB = sessionStorage.getItem('firma_url_db'); // existing from DB
        const sigSection = document.querySelector('.signature-wrapper')?.closest('.form-section') ||
            document.querySelector('.signature-wrapper');
        const errorFirma  = document.getElementById('error-firma');
        // Valid if: newly drawn (firma_temp > 5000 chars) OR previously registered (firma_url_db)
        const firmaValida = (firma && firma.length > 5000) || !!firmaUrlDB;

        if (!firmaValida) {
            valid = false;
            if (errorFirma) {
                errorFirma.textContent = 'La firma es obligatoria. Dibuja tu firma en el recuadro antes de continuar.';
            }
            sigSection?.classList.add('signature-error');
            // Always scroll to signature when it's the only missing item
            document.querySelector('.signature-wrapper')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            sigSection?.classList.remove('signature-error');
            if (errorFirma) errorFirma.textContent = '';
        }
    }

    // Error summary per step
    const errorStepDiv = document.getElementById('error-step-' + stepIndex);
    if (errorStepDiv) {
        if (!valid) {
            errorStepDiv.textContent = 'Por favor corrige los campos marcados.';
            errorStepDiv.style.display = 'block';
        } else {
            errorStepDiv.textContent = '';
            errorStepDiv.style.display = 'none';
        }
    }

    if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
}

/* ── Ingreso validation with security date check ────────────────────────── */
// NOTE: gate field validation (tipo, id, fecha, checkbox) is done by the
// gate button handler in AppController BEFORE calling this function.
// This function only handles the API call and security date check.
async function validarIngreso() {
    const tipoEl = document.getElementById('tipo_documento_ingreso');
    const identEl = document.getElementById('identificacion_ingreso');
    const fechaEl = document.getElementById('fecha_expedicion_ingreso');
    const msg = document.getElementById('ingreso-msg');

    const tipo = sanitizarString(tipoEl.value);
    const id = sanitizarNumero(identEl.value);
    const fechaIngresada = (fechaEl?.value || '').trim();

    const showMsg = (texto, esError) => {
        if (!msg) return;
        msg.className = esError ? 'error-message' : 'info-message';
        msg.textContent = texto;
        msg.style.display = 'block';
    };

    try {
        const resp = await fetch(`${API_URL_BASE}/aspirante?identificacion=${id}`);
        if (!resp.ok) throw new Error(`Error HTTP: ${resp.status}`);
        const data = await resp.json();

        if (data.existe) {
            const aspirante = data.aspirante || {};

            // ── Security 1: verify tipo de documento ──────────────────────
            const tipoEnDB = (aspirante.tipo_documento || '').trim().toLowerCase();
            if (tipoEnDB && tipo.toLowerCase() !== tipoEnDB) {
                showMsg('El tipo de documento no coincide con el registrado. Verifica tu información.', true);
                if (tipoEl) {
                    tipoEl.classList.add('error');
                    const errTipo = document.getElementById('error-tipo_documento_ingreso');
                    if (errTipo) errTipo.textContent = 'No coincide con nuestros registros.';
                }
                return false;
            }

            // ── Security 2: verify expedition date ────────────────────────
            const fechaDB = (aspirante.fecha_expedicion || '').split('T')[0];
            if (fechaIngresada && fechaDB && fechaIngresada !== fechaDB) {
                showMsg('La fecha de expedición no coincide con los datos registrados. Verifica tu información.', true);
                if (fechaEl) {
                    fechaEl.classList.add('error');
                    const errFecha = document.getElementById('error-fecha_expedicion_ingreso');
                    if (errFecha) errFecha.textContent = 'La fecha no coincide con nuestros registros.';
                }
                return false;
            }

            // Mark as returning user so step 0 locks non-editable fields
            sessionStorage.setItem('is_returning_user', '1');

            showMsg('Registro encontrado. Cargando información...', false);
            sessionStorage.setItem('tipo_ingreso', tipo);
            sessionStorage.setItem('id_ingreso', id);
            sessionStorage.setItem('fecha_expedicion_ingreso', fechaIngresada);
            sessionStorage.setItem('aspirante_data', JSON.stringify(data.aspirante));

            // Load existing data into form (runs in background before gate transitions)
            await rellenarFormulario(data);

        } else {
            sessionStorage.removeItem('is_returning_user');
            showMsg('Continuando con nuevo registro...', false);
            sessionStorage.setItem('tipo_ingreso', tipo);
            sessionStorage.setItem('id_ingreso', id);
            sessionStorage.setItem('fecha_expedicion_ingreso', fechaIngresada);
        }

        return true;
    } catch (err) {
        showMsg('Error consultando el servidor. Intenta nuevamente.', true);
        console.error('Error en validarIngreso:', err);
        return false;
    }
}
