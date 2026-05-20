/* ── App Controller — main coordinator ──────────────────────────────────── */

/* DOM references (populated on DOMContentLoaded) */
let _form, _steps, _currentStep;

function showStep(index) {
    _steps = Array.from(document.querySelectorAll('.form-step'));
    _steps.forEach((step, i) => step.classList.toggle('active', i === index));
    actualizarStepper(index);
    actualizarBotones(index, _steps.length);
    _currentStep = index;

    if (index === 0) {
        // For returning users: show read-only display, hide the editable select
        setTimeout(() => {
            const isReturn = sessionStorage.getItem('is_returning_user') === '1';
            const medioEl = document.getElementById('medio_reclutamiento');
            const selectWrap = document.getElementById('medio-select-wrap');
            const roDisplay = document.getElementById('medio-readonly-display');
            const roVal = document.getElementById('medio-display-val');
            const roRecomRow = document.getElementById('medio-recomendador-row');
            const roRecomVal = document.getElementById('medio-recomendador-val');

            if (isReturn) {
                // Get the label text of the selected option (not raw value)
                let label = '—';
                if (medioEl && medioEl.value) {
                    const opt = medioEl.querySelector(`option[value="${medioEl.value}"]`);
                    label = opt ? opt.textContent : medioEl.value;
                } else {
                    // Fallback: read from aspirante_data in sessionStorage
                    const asp = (() => { try { return JSON.parse(sessionStorage.getItem('aspirante_data') || '{}'); } catch { return {}; } })();
                    label = asp.medio_reclutamiento || '—';
                    // Try to fill the select value as well
                    if (medioEl && asp.medio_reclutamiento) {
                        medioEl.value = asp.medio_reclutamiento;
                        if (!medioEl.value) {
                            const opt = document.createElement('option');
                            opt.value = asp.medio_reclutamiento;
                            opt.textContent = asp.medio_reclutamiento;
                            medioEl.appendChild(opt);
                            medioEl.value = asp.medio_reclutamiento;
                        }
                        const opt = medioEl.querySelector(`option[value="${medioEl.value}"]`);
                        if (opt) label = opt.textContent;
                    }
                }

                if (roVal) roVal.textContent = label;
                if (roDisplay) roDisplay.style.display = 'flex';
                if (selectWrap) selectWrap.style.display = 'none';

                // Show recomendador if present
                const asp2 = (() => { try { return JSON.parse(sessionStorage.getItem('aspirante_data') || '{}'); } catch { return {}; } })();
                const recom = document.getElementById('recomendador_aspirante');
                const recomVal = (recom?.value || asp2.recomendador_aspirante || '').trim();
                if (roRecomRow && roRecomVal && recomVal) {
                    roRecomVal.textContent = recomVal;
                    roRecomRow.style.display = 'flex';
                } else if (roRecomRow) {
                    roRecomRow.style.display = 'none';
                }

                // Ensure the hidden select keeps its value for form submission
                if (medioEl) medioEl.disabled = false; // disabled fields don't submit
            } else {
                // New user: show editable select
                if (roDisplay) roDisplay.style.display = 'none';
                if (selectWrap) selectWrap.style.display = '';
                if (medioEl) medioEl.disabled = false;
            }
        }, 150);
    }

    if (index === 1) {
        setTimeout(() => {
            updateIngresoLabel();
            prellenarDatosPersonales();
        }, 100);
        setTimeout(setupSignature, 200);
    }

    if (index === _steps.length - 1) {
        buildPreview();
    }

    // Scroll form area to top on step change
    document.getElementById('form-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Gate: transition from verification to form ─────────────────────────── */
function afterGateSuccess() {
    const tipo = sessionStorage.getItem('tipo_ingreso') || '';
    const id = sessionStorage.getItem('id_ingreso') || '';

    // Step 0: confirmed identity bar
    const desc = document.getElementById('gate-confirmed-desc');
    if (desc) desc.textContent = `${tipo} — ${id}`;

    // Step 1: populate the read-only identification display
    const displayTipo = document.getElementById('ident-display-tipo');
    const displayNum = document.getElementById('ident-display-num');
    if (displayTipo) displayTipo.textContent = tipo || '—';
    if (displayNum) displayNum.textContent = id || '—';

    // Sync hidden fields used for form submission
    const hidTipo = document.getElementById('tipo_documento');
    const hidIdent = document.getElementById('identificacion');
    if (hidTipo) hidTipo.value = tipo;
    if (hidIdent) hidIdent.value = id;

    // Clear firma from any previous session — must sign fresh every time
    sessionStorage.removeItem('firma_temp');

    // Transition: hide gate, reveal app-header + form
    document.getElementById('verif-gate').style.display = 'none';
    document.getElementById('app-header').style.display = '';
    document.getElementById('form-area').style.display = 'block';

    showStep(0);
}

/* ── Reset to gate (user entered wrong ID) ──────────────────────────────── */
function reiniciarVerificacion() {
    // Clear all session state
    ['tipo_ingreso', 'id_ingreso', 'firma_temp', 'aspirante_data',
        'fecha_expedicion_ingreso', 'is_returning_user']
        .forEach(k => sessionStorage.removeItem(k));

    // Reset hidden identification fields
    const hidTipo = document.getElementById('tipo_documento');
    const hidIdent = document.getElementById('identificacion');
    if (hidTipo) hidTipo.value = '';
    if (hidIdent) hidIdent.value = '';

    // Reset display spans
    const displayTipo = document.getElementById('ident-display-tipo');
    const displayNum = document.getElementById('ident-display-num');
    if (displayTipo) displayTipo.textContent = '—';
    if (displayNum) displayNum.textContent = '—';

    // Restore medio select (hide readonly display, show editable select)
    const medioRO = document.getElementById('medio-readonly-display');
    const medioWrap = document.getElementById('medio-select-wrap');
    const medioEl = document.getElementById('medio_reclutamiento');
    if (medioRO) medioRO.style.display = 'none';
    if (medioWrap) medioWrap.style.display = '';
    if (medioEl) { medioEl.disabled = false; medioEl.value = ''; }

    // Clear any field errors
    limpiarErroresCampo();

    // Clear dynamic lists back to initial state
    educacionData = [{ institucion: '', programa: '', nivel_escolaridad: '', modalidad: '', ano: '', finalizado: '1' }];
    expData = [{ empresa: '', cargo: '', ano_experiencia: '', tiempo_laborado: '', salario: '', motivo_retiro: '', funciones: '' }];
    familiaresData = [{ nombre_completo: '', parentesco: '', edad: '', ocupacion: '', conviven_juntos: '1' }];
    renderEducacion();
    renderExp();
    renderFamiliares();

    // Clear photo
    clearPhotoLocal();

    // Clear signature session
    sessionStorage.removeItem('firma_temp');

    // Restore gate view
    document.getElementById('form-area').style.display = 'none';
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('verif-gate').style.display = '';

    // Clear gate inputs so user re-enters fresh
    ['tipo_documento_ingreso', 'identificacion_ingreso', 'fecha_expedicion_ingreso'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.classList.remove('error'); }
    });
    const chk = document.getElementById('acepta_privacidad');
    if (chk) chk.checked = false;
    const gateMsg = document.getElementById('gate-msg');
    if (gateMsg) { gateMsg.style.display = 'none'; gateMsg.textContent = ''; }

    // Focus first gate field
    setTimeout(() => document.getElementById('tipo_documento_ingreso')?.focus(), 100);
}

/* ── Privacy policy modal ────────────────────────────────────────────────── */
function initPrivacyModal() {
    const backdrop = document.getElementById('politicaPrivacidadModal');
    const btnOpen = document.getElementById('btn-ver-politica');
    const btnClose1 = document.getElementById('btn-cerrar-politica');
    const btnClose2 = document.getElementById('btn-cerrar-politica-2');
    const btnAccept = document.getElementById('btn-aceptar-politica');
    const checkbox = document.getElementById('acepta_privacidad');

    const open = () => { backdrop.classList.add('visible'); backdrop.setAttribute('aria-hidden', 'false'); };
    const close = () => { backdrop.classList.remove('visible'); backdrop.setAttribute('aria-hidden', 'true'); };

    btnOpen?.addEventListener('click', open);
    btnClose1?.addEventListener('click', close);
    btnClose2?.addEventListener('click', close);

    // "Entendido, acepto" → marks checkbox + closes modal
    btnAccept?.addEventListener('click', () => {
        if (checkbox) { checkbox.checked = true; const err = document.getElementById('error-acepta_privacidad'); if (err) err.textContent = ''; }
        close();
    });

    // Close on backdrop click
    backdrop?.addEventListener('click', e => { if (e.target === backdrop) close(); });

    // Close on Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && backdrop?.classList.contains('visible')) close();
    });
}

/* ── Seguridad toggles ──────────────────────────────────────────────────── */
function handleToggle(selectId, wrapperId) {
    const select = document.getElementById(selectId);
    const wrapper = document.getElementById(wrapperId);
    if (!select || !wrapper) return;
    select.addEventListener('change', () => {
        if (select.value === '1') {
            wrapper.classList.remove('hidden');
        } else {
            wrapper.classList.add('hidden');
            wrapper.querySelectorAll('input, textarea').forEach(i => { i.value = ''; });
        }
    });
}

/* ── Form submission ────────────────────────────────────────────────────── */
function initFormSubmit(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const resumenError = document.getElementById('resumen-errores');
        if (resumenError) { resumenError.textContent = ''; resumenError.style.display = 'none'; }

        if (form.dataset.submitting === '1') {
            if (resumenError) { resumenError.innerHTML = 'Tu hoja de vida ya se está enviando. Por favor espera unos segundos.'; resumenError.style.display = 'block'; resumenError.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            return;
        }

        const btnSubmit = document.getElementById('btn-submit');
        const btnNext = document.getElementById('btn-next');
        const btnPrev = document.getElementById('btn-prev');
        const originalHtml = btnSubmit ? btnSubmit.innerHTML : 'Enviar';

        try {
            form.dataset.submitting = '1';
            if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerHTML = `<span class="spinner"></span> Enviando...`; }
            if (btnNext) btnNext.disabled = true;
            if (btnPrev) btnPrev.disabled = true;

            _steps = Array.from(document.querySelectorAll('.form-step'));
            if (_currentStep !== _steps.length - 1) { form.dataset.submitting = '0'; showStep(_steps.length - 1); return; }

            if (!validarFotoSiAplica()) throw new Error('Seleccionaste una foto, pero aún se está subiendo. Espera o elimina la foto para continuar.');

            const firmaGuardada = sessionStorage.getItem('firma_temp');
            if (!firmaGuardada || firmaGuardada.length <= 200) {
                const errorFirma = document.getElementById('error-firma');
                if (errorFirma) errorFirma.textContent = 'Debes dibujar tu firma antes de enviar.';
                throw new Error('La firma no está registrada. Vuelve al paso 2 y dibuja tu firma.');
            }

            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => { data[key] = sanitizarString(value); });

            data.identificacion = sanitizarNumero(data.identificacion || sessionStorage.getItem('id_ingreso') || '');
            data.telefono = sanitizarNumero(data.telefono || '');
            data.fecha_nacimiento = formatearFechaParaServidor(data.fecha_nacimiento);
            data.fecha_expedicion = formatearFechaParaServidor(data.fecha_expedicion);
            data.educacion = recopilarEducacion();
            data.experiencia_laboral = recopilarExp();
            data.familiares = recopilarFamiliares();
            data.hijos = recopilarHijos();

            const get = id => (document.getElementById(id)?.value || '').trim();
            data.referencias = [
                { tipo_referencia: 'laboral', empresa: sanitizarString(get('ref_lab_empresa')), jefe_inmediato: sanitizarString(get('ref_lab_jefe')), cargo_jefe: sanitizarString(get('ref_lab_cargo')), telefono: sanitizarNumero(get('ref_lab_tel')) },
                { tipo_referencia: 'familiar', nombre_completo: sanitizarString(get('ref_fam_nombre')), parentesco: sanitizarString(get('ref_fam_parentesco')), telefono: sanitizarNumero(get('ref_fam_tel')), ocupacion: sanitizarString(get('ref_fam_ocupacion')) },
                { tipo_referencia: 'personal', nombre_completo: sanitizarString(get('ref_per_nombre')), relacion: sanitizarString(get('ref_per_relacion')), telefono: sanitizarNumero(get('ref_per_tel')), ocupacion: sanitizarString(get('ref_per_ocupacion')) }
            ].filter(r => Object.values(r).some(v => v));

            data.contacto_emergencia = { nombre_completo: sanitizarString(get('emer_nombre')), parentesco: sanitizarString(get('emer_parentesco')), telefono: sanitizarNumero(get('emer_telefono')), correo_electronico: sanitizarString(get('emer_correo')), direccion: sanitizarString(get('emer_direccion')) };
            data.metas_personales = { meta_corto_plazo: sanitizarString(get('meta_corto')), meta_mediano_plazo: sanitizarString(get('meta_mediano')), meta_largo_plazo: sanitizarString(get('meta_largo')) };
            data.seguridad = {
                llamados_atencion: parseInt(get('seg_llamados')) || 0,
                detalle_llamados: sanitizarString(get('seg_detalle_llamados')),
                accidente_laboral: parseInt(get('seg_accidente')) || 0,
                detalle_accidente: sanitizarString(get('seg_detalle_accidente')),
                enfermedad_importante: parseInt(get('seg_enfermedad')) || 0,
                detalle_enfermedad: sanitizarString(get('seg_detalle_enfermedad')),
                consume_alcohol: parseInt(get('seg_alcohol')) || 0,
                frecuencia_alcohol: sanitizarString(get('seg_frecuencia')),
                familiar_en_empresa: parseInt(get('seg_familiar')) || 0,
                detalle_familiar_empresa: sanitizarString(get('seg_familiar_nombre')),
                info_falsa: parseInt(get('seg_falsa')) || 0,
                acepta_poligrafo: parseInt(get('seg_poligrafo')) || 0,
                observaciones: sanitizarString(get('seg_observaciones')),
                califica_para_cargo: sanitizarString(get('seg_califica')),
                fortalezas: sanitizarString(get('seg_fortal')),
                aspectos_mejorar: sanitizarString(get('seg_mejorar')),
                resolucion_problemas: sanitizarString(get('seg_resolucion'))
            };
            data.firma_base64 = firmaGuardada;
            data.acepta_privacidad = 1; // acceptance confirmed at gate

            if (data.foto_public_url?.startsWith('data:image/')) delete data.foto_public_url;
            if (data.foto_gcs_path?.startsWith('data:')) delete data.foto_gcs_path;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 45000);
            const resp = await fetch(`${API_URL_BASE}/hv/registrar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: controller.signal });
            clearTimeout(timeout);

            const ct = resp.headers.get('content-type') || '';
            const result = ct.includes('application/json') ? await resp.json() : (() => { throw new Error(`Respuesta no-JSON (HTTP ${resp.status})`); })();

            if (resp.ok && (result.ok || result.success)) {
                sessionStorage.removeItem('firma_temp');
                alert('Hoja de vida registrada correctamente.');
                resetFormToInitialState();
            } else {
                throw new Error('No pudimos registrar tu hoja de vida. Por favor intenta de nuevo.');
            }
        } catch (err) {
            console.error('Error en submit HV:', err);
            if (resumenError) {
                resumenError.innerHTML = err.name === 'AbortError'
                    ? 'Tiempo agotado. Tu conexión es lenta. Intenta de nuevo sin cerrar la página.'
                    : err.message?.includes('Failed to fetch')
                        ? 'Sin conexión a internet. Revisa tu señal e intenta de nuevo.'
                        : err.message || 'Error desconocido al enviar.';
                resumenError.style.display = 'block';
                resumenError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } finally {
            form.dataset.submitting = '0';
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = originalHtml; }
            if (btnNext) btnNext.disabled = false;
            if (btnPrev) btnPrev.disabled = (_currentStep === 0);
        }
    });

    // Prevent accidental Enter-submit on non-final steps
    form.addEventListener('keydown', (e) => {
        _steps = Array.from(document.querySelectorAll('.form-step'));
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && _currentStep !== _steps.length - 1) {
            e.preventDefault();
        }
    });

    // Reset submitting flag on back-forward navigation
    window.addEventListener('pageshow', () => { if (form) form.dataset.submitting = '0'; });
}

/* ── DOMContentLoaded init ──────────────────────────────────────────────── */
/* ── Global numeric-only input handler ──────────────────────────────────── */
document.addEventListener('input', (e) => {
    if (e.target.dataset.num === 'true') {
        const cleaned = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value !== cleaned) e.target.value = cleaned;
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // ── API data loading: first — independent of form DOM state ──────────
    // Runs immediately so dropdowns are ready before the user interacts.
    inicializarSelects();   // fills tipo_documento, tipo_documento_ingreso,
    //       departamentos, EPS, pensión, estado civil

    // ── Form setup ────────────────────────────────────────────────────────
    _form = document.getElementById('hv-form');
    _steps = Array.from(document.querySelectorAll('.form-step'));
    _currentStep = 0;

    if (!_form) { console.error('AppController: #hv-form not found'); return; }

    // Init dynamic list cards (educ / exp / fam)
    try { initDynamicLists(); } catch (e) { console.error('initDynamicLists:', e); }

    // Init photo controller
    try { initPhotoController(); } catch (e) { console.error('initPhotoController:', e); }

    // Dept → city listeners
    document.getElementById('departamento_expedicion')?.addEventListener('change', () => cargarCiudades('departamento_expedicion', 'ciudad_expedicion'));
    document.getElementById('departamento_residencia')?.addEventListener('change', () => cargarCiudades('departamento_residencia', 'ciudad_residencia'));

    // Medio de reclutamiento → show/hide recomendador
    const medioSelect = document.getElementById('medio_reclutamiento');
    if (medioSelect) {
        medioSelect.addEventListener('change', () => {
            const val = medioSelect.value;
            const show = val === 'recomendado' || val === 'empleado_interno';
            document.getElementById('campo-recomendador')?.classList.toggle('hidden', !show);
            document.getElementById('error-medio_reclutamiento').textContent = '';
            medioSelect.classList.remove('error');
        });
    }

    // Gate field cleanup on change
    document.getElementById('tipo_documento_ingreso')?.addEventListener('change', () => {
        document.getElementById('tipo_documento_ingreso').classList.remove('error');
        const err = document.getElementById('error-tipo_documento_ingreso');
        if (err) err.textContent = '';
    });
    document.getElementById('identificacion_ingreso')?.addEventListener('input', () => {
        document.getElementById('identificacion_ingreso').classList.remove('error');
        const err = document.getElementById('error-identificacion_ingreso');
        if (err) err.textContent = '';
    });
    document.getElementById('fecha_expedicion_ingreso')?.addEventListener('change', () => {
        document.getElementById('fecha_expedicion_ingreso').classList.remove('error');
        const err = document.getElementById('error-fecha_expedicion_ingreso');
        if (err) err.textContent = '';
    });

    // Gate: "Verificar y continuar" button
    document.getElementById('btn-gate-continue')?.addEventListener('click', async () => {
        // Validate gate fields
        const gateFieldIds = ['tipo_documento_ingreso', 'identificacion_ingreso', 'fecha_expedicion_ingreso'];
        let hasError = false;
        gateFieldIds.forEach(fid => {
            const el = document.getElementById(fid);
            const err = document.getElementById('error-' + fid);
            if (!el) return;
            el.classList.remove('error');
            if (err) err.textContent = '';
            if (!el.value || !el.value.trim()) {
                el.classList.add('error');
                if (err) err.textContent = 'Este campo es obligatorio';
                hasError = true;
            }
        });

        // Validate privacy checkbox
        const chk = document.getElementById('acepta_privacidad');
        const chkErr = document.getElementById('error-acepta_privacidad');
        if (chk && !chk.checked) {
            if (chkErr) chkErr.textContent = 'Debes aceptar la política de tratamiento de datos para continuar.';
            hasError = true;
        } else if (chkErr) {
            chkErr.textContent = '';
        }

        if (hasError) return;

        const btn = document.getElementById('btn-gate-continue');
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Verificando...';

        try {
            const ok = await validarIngreso();
            if (ok) afterGateSuccess();
        } catch (err) {
            console.error('Error en gate:', err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    });

    // Age calculation
    document.getElementById('fecha_nacimiento')?.addEventListener('change', function () {
        const edadInput = document.getElementById('edad');
        if (edadInput) edadInput.value = calcularEdadDesdeFecha(this.value);
        document.getElementById('error-fecha_nacimiento').textContent = '';
        this.classList.remove('error');
    });

    // Seguridad toggles
    handleToggle('seg_llamados', 'detalle_llamados_wrap');
    handleToggle('seg_accidente', 'detalle_accidente_wrap');
    handleToggle('seg_enfermedad', 'detalle_enfermedad_wrap');
    handleToggle('seg_alcohol', 'detalle_alcohol_wrap');
    handleToggle('seg_familiar', 'detalle_familiar_wrap');

    // Add buttons for dynamic lists
    document.getElementById('btn-add-educacion')?.addEventListener('click', () => {
        recopilarEducacion();
        educacionData.push({ institucion: '', programa: '', nivel_escolaridad: '', modalidad: '', ano: '', finalizado: '1' });
        renderEducacion();
    });
    document.getElementById('btn-add-exp')?.addEventListener('click', () => {
        recopilarExp();
        expData.push({ empresa: '', cargo: '', ano_experiencia: '', tiempo_laborado: '', salario: '', motivo_retiro: '', funciones: '' });
        renderExp();
    });
    document.getElementById('btn-add-hijo')?.addEventListener('click', () => {
        recopilarHijos();
        hijosData.push({ nombre_completo: '', edad: '', conviven_juntos: '1' });
        renderHijos();
    });

    document.getElementById('btn-add-fam')?.addEventListener('click', () => {
        recopilarFamiliares();
        familiaresData.push({ nombre_completo: '', parentesco: '', edad: '', ocupacion: '', conviven_juntos: '1' });
        renderFamiliares();
    });

    // Navigation buttons
    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (_currentStep > 0) showStep(_currentStep - 1);
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
        _steps = Array.from(document.querySelectorAll('.form-step'));
        if (!validateStep(_currentStep)) return;
        if (_currentStep < _steps.length - 1) { _currentStep++; showStep(_currentStep); }
    });

    // "¿Número incorrecto? Volver a verificar" — full gate reset
    document.getElementById('btn-reiniciar-verificacion')?.addEventListener('click', reiniciarVerificacion);

    // Hook into types-cargados for prellenar
    document.addEventListener('tipos-cargados', prellenarDatosPersonales);

    // Setup form submit
    initFormSubmit(_form);

    // Setup privacy policy modal
    initPrivacyModal();

    // Gate is shown by default (form-area + app-header start hidden)
    // afterGateSuccess() reveals the form when verification passes
});
