/* ── Data Controller ────────────────────────────────────────────────────── */

function calcularEdadDesdeFecha(value) {
    if (!value) return '';
    const parts = String(value).split('T')[0].split('-');
    if (parts.length < 3) return '';
    const birth = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? String(age) : '';
}

async function rellenarFormulario(a) {
    try {
        if (!a) return;

        if (!window.selectsLoaded) {
            window._pendingAspirante = a;
            document.addEventListener('selects-cargados', async () => {
                try { await rellenarFormulario(window._pendingAspirante); }
                catch { /* ignore */ }
                finally { window._pendingAspirante = null; }
            }, { once: true });
            return;
        }

        const aspirante = a.aspirante || a;
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value != null ? value : ''; };

        if (aspirante) {
            set('primer_nombre', sanitizarString(aspirante.primer_nombre || ''));
            set('segundo_nombre', sanitizarString(aspirante.segundo_nombre || ''));
            set('primer_apellido', sanitizarString(aspirante.primer_apellido || ''));
            set('segundo_apellido', sanitizarString(aspirante.segundo_apellido || ''));
            set('correo_electronico', sanitizarString(aspirante.correo_electronico || ''));
            set('telefono', sanitizarNumero(aspirante.telefono || ''));
            set('direccion_barrio', sanitizarString(aspirante.direccion_barrio || ''));
            set('estado_civil', aspirante.estado_civil || '');
            set('eps', aspirante.eps || '');
            set('afp', aspirante.afp || '');
            set('rh', aspirante.rh || '');
            set('talla_pantalon', aspirante.talla_pantalon || '');
            set('camisa_talla', aspirante.camisa_talla || '');
            set('zapatos_talla', aspirante.zapatos_talla || '');
            set('fecha_nacimiento', aspirante.fecha_nacimiento ? aspirante.fecha_nacimiento.split('T')[0] : '');
            const edadInput = document.getElementById('edad');
            if (edadInput) edadInput.value = calcularEdadDesdeFecha(aspirante.fecha_nacimiento);
            set('fecha_expedicion', aspirante.fecha_expedicion ? aspirante.fecha_expedicion.split('T')[0] : '');
            rellenarFotoDesdeAspirante(aspirante);
        }

        if (aspirante?.departamento_expedicion) {
            set('departamento_expedicion', aspirante.departamento_expedicion);
            if (typeof cargarCiudades === 'function') {
                await cargarCiudades('departamento_expedicion', 'ciudad_expedicion');
                set('ciudad_expedicion', aspirante.ciudad_expedicion || '');
            }
        }

        const depResid = aspirante?.departamento || aspirante?.departamento_residencia || '';
        if (depResid) {
            set('departamento_residencia', depResid);
            if (typeof cargarCiudades === 'function') {
                await cargarCiudades('departamento_residencia', 'ciudad_residencia');
                set('ciudad_residencia', aspirante.ciudad || aspirante.ciudad_residencia || '');
            }
        }

        const identEl = document.getElementById('identificacion');
        if (identEl && !identEl.value && aspirante?.identificacion) identEl.value = sanitizarNumero(aspirante.identificacion);
        const tipoEl = document.getElementById('tipo_documento');
        if (tipoEl && !tipoEl.value && aspirante?.tipo_documento) tipoEl.value = aspirante.tipo_documento;

        // Medio de reclutamiento — lives in step 0, fill directly from DB data
        // so it's available before prellenarDatosPersonales() runs on step 1
        if (aspirante?.medio_reclutamiento) {
            const medioEl = document.getElementById('medio_reclutamiento');
            if (medioEl) {
                medioEl.value = aspirante.medio_reclutamiento;
                // If value didn't match any option, add it dynamically
                if (!medioEl.value) {
                    const opt = document.createElement('option');
                    opt.value = aspirante.medio_reclutamiento;
                    opt.textContent = aspirante.medio_reclutamiento;
                    medioEl.appendChild(opt);
                    medioEl.value = aspirante.medio_reclutamiento;
                }
                medioEl.dispatchEvent(new Event('change'));
            }
            // Also fill recomendador if present
            if (aspirante.recomendador_aspirante) {
                const recomEl = document.getElementById('recomendador_aspirante');
                if (recomEl) recomEl.value = sanitizarString(aspirante.recomendador_aspirante);
            }
        }

        // Educación
        const educ = Array.isArray(a.educacion) ? a.educacion : [];
        if (educ.length > 0) {
            educacionData = educ.map(e => ({
                institucion: sanitizarString(e.institucion || ''),
                programa: sanitizarString(e.programa || ''),
                nivel_escolaridad: e.nivel_escolaridad || '',
                modalidad: e.modalidad || '',
                ano: e.ano || '',
                finalizado: e.finalizado != null ? String(e.finalizado) : '1'
            }));
        } else if (educacionData.length === 0) {
            educacionData = [{ institucion: '', programa: '', nivel_escolaridad: '', modalidad: '', ano: '', finalizado: '1' }];
        }
        renderEducacion();

        // Experiencia
        const exp = Array.isArray(a.experiencia_laboral) ? a.experiencia_laboral : [];
        if (exp.length > 0) {
            expData = exp.map(x => ({
                empresa: sanitizarString(x.empresa || ''),
                cargo: sanitizarString(x.cargo || ''),
                ano_experiencia: x.ano_experiencia || '',
                tiempo_laborado: sanitizarString(x.tiempo_laborado || ''),
                salario: sanitizarString(x.salario || ''),
                motivo_retiro: sanitizarString(x.motivo_retiro || ''),
                funciones: sanitizarString(x.funciones || '')
            }));
        } else if (expData.length === 0) {
            expData = [{ empresa: '', cargo: '', ano_experiencia: '', tiempo_laborado: '', salario: '', motivo_retiro: '', funciones: '' }];
        }
        renderExp();

        // Hijos (opcional — se restablece a vacío si no hay datos)
        const hijos = Array.isArray(a.hijos) ? a.hijos : [];
        hijosData = hijos.map(h => ({
            nombre_completo: sanitizarString(h.nombre_completo || ''),
            edad: h.edad != null ? String(h.edad) : '',
            conviven_juntos: h.conviven_juntos != null ? String(h.conviven_juntos) : '1'
        }));
        renderHijos();

        // Familiares
        const fam = Array.isArray(a.familiares) ? a.familiares : [];
        if (fam.length > 0) {
            familiaresData = fam.map(f => ({
                nombre_completo: sanitizarString(f.nombre_completo || ''),
                parentesco: sanitizarString(f.parentesco || ''),
                edad: f.edad || '',
                ocupacion: sanitizarString(f.ocupacion || ''),
                conviven_juntos: f.conviven_juntos != null ? String(f.conviven_juntos) : '1'
            }));
        } else if (familiaresData.length === 0) {
            familiaresData = [{ nombre_completo: '', parentesco: '', edad: '', ocupacion: '', conviven_juntos: '1' }];
        }
        renderFamiliares();

        // Referencias
        const refs = Array.isArray(a.referencias) ? a.referencias : [];
        refs.forEach(r => {
            const tipo = (r.tipo_referencia || '').toLowerCase();
            if (tipo === 'laboral') {
                set('ref_lab_empresa', sanitizarString(r.empresa || ''));
                set('ref_lab_jefe', sanitizarString(r.jefe_inmediato || ''));
                set('ref_lab_cargo', sanitizarString(r.cargo_jefe || ''));
                set('ref_lab_tel', sanitizarNumero(r.telefono || ''));
            } else if (tipo === 'familiar') {
                set('ref_fam_nombre', sanitizarString(r.nombre_completo || ''));
                set('ref_fam_parentesco', sanitizarString(r.parentesco || r.relacion || ''));
                set('ref_fam_tel', sanitizarNumero(r.telefono || ''));
                set('ref_fam_ocupacion', sanitizarString(r.ocupacion || ''));
            } else if (tipo === 'personal') {
                set('ref_per_nombre', sanitizarString(r.nombre_completo || ''));
                set('ref_per_relacion', sanitizarString(r.relacion || ''));
                set('ref_per_tel', sanitizarNumero(r.telefono || ''));
                set('ref_per_ocupacion', sanitizarString(r.ocupacion || ''));
            }
        });

        // Emergencia
        if (a.contacto_emergencia) {
            set('emer_nombre', sanitizarString(a.contacto_emergencia.nombre_completo || ''));
            set('emer_parentesco', sanitizarString(a.contacto_emergencia.parentesco || ''));
            set('emer_telefono', sanitizarNumero(a.contacto_emergencia.telefono || ''));
            set('emer_correo', sanitizarString(a.contacto_emergencia.correo_electronico || ''));
            set('emer_direccion', sanitizarString(a.contacto_emergencia.direccion || ''));
        }

        // Metas
        if (a.metas_personales) {
            set('meta_corto', sanitizarString(a.metas_personales.meta_corto_plazo || ''));
            set('meta_mediano', sanitizarString(a.metas_personales.meta_mediano_plazo || ''));
            set('meta_largo', sanitizarString(a.metas_personales.meta_largo_plazo || ''));
        }

        // Seguridad
        if (a.seguridad) {
            const s = a.seguridad;
            const setToggle = (fieldId, wrapperId, val) => {
                const el = document.getElementById(fieldId);
                if (el) el.value = String(val || 0);
                if (val == 1) document.getElementById(wrapperId)?.classList.remove('hidden');
            };
            setToggle('seg_llamados', 'detalle_llamados_wrap', s.llamados_atencion);
            set('seg_detalle_llamados', sanitizarString(s.detalle_llamados || ''));
            setToggle('seg_accidente', 'detalle_accidente_wrap', s.accidente_laboral);
            set('seg_detalle_accidente', sanitizarString(s.detalle_accidente || ''));
            setToggle('seg_enfermedad', 'detalle_enfermedad_wrap', s.enfermedad_importante);
            set('seg_detalle_enfermedad', sanitizarString(s.detalle_enfermedad || ''));
            setToggle('seg_alcohol', 'detalle_alcohol_wrap', s.consume_alcohol);
            set('seg_frecuencia', sanitizarString(s.frecuencia_alcohol || ''));
            setToggle('seg_familiar', 'detalle_familiar_wrap', s.familiar_en_empresa);
            set('seg_familiar_nombre', sanitizarString(s.detalle_familiar_empresa || ''));
            set('seg_observaciones', sanitizarString(s.observaciones || ''));
            set('seg_califica', sanitizarString(s.califica_para_cargo || ''));
            set('seg_fortal', sanitizarString(s.fortalezas || ''));
            set('seg_mejorar', sanitizarString(s.aspectos_mejorar || ''));
            set('seg_resolucion', sanitizarString(s.resolucion_problemas || ''));
            if (s.info_falsa != null) document.getElementById('seg_falsa').value = String(s.info_falsa || 0);
            if (s.acepta_poligrafo != null) document.getElementById('seg_poligrafo').value = String(s.acepta_poligrafo || 0);
        }
    } catch (err) {
        console.error('Error en rellenarFormulario:', err);
    }
}

function prellenarDatosPersonales() {
    const tipo = getSessionTipo();
    const id = getSessionId();
    const aspiranteFull = getSessionAspirante();
    const formHv = document.getElementById('hv-form');
    if (!formHv) return;

    const ensureHidden = (name, idEl, value) => {
        let hid = document.getElementById(idEl);
        if (!hid) {
            hid = document.createElement('input');
            hid.type = 'hidden'; hid.id = idEl; hid.name = name;
            formHv.appendChild(hid);
        }
        hid.value = value || '';
    };

    ensureHidden('tipo_documento_ingreso_hidden', 'tipo_doc_hid', tipo);
    ensureHidden('identificacion_ingreso_hidden', 'id_hid', id);

    // Pre-fill fecha_expedicion from ingreso step (for new users)
    const fechaExpIngreso = sessionStorage.getItem('fecha_expedicion_ingreso') || '';
    if (fechaExpIngreso) {
        const fechaExpEl = document.getElementById('fecha_expedicion');
        if (fechaExpEl && !fechaExpEl.value) fechaExpEl.value = fechaExpIngreso;
    }

    // Sync hidden identification fields (tipo_documento is now a hidden select,
    // identificacion is a hidden input — both exist for form submission)
    if (tipo) {
        const hidTipo = document.getElementById('tipo_documento');
        if (hidTipo) hidTipo.value = tipo;
    }

    if (id) {
        const hidIdent = document.getElementById('identificacion');
        if (hidIdent) hidIdent.value = sanitizarNumero(id);
    }

    // Update the read-only display card
    const displayTipo = document.getElementById('ident-display-tipo');
    const displayNum = document.getElementById('ident-display-num');
    if (displayTipo) displayTipo.textContent = tipo || '—';
    if (displayNum) displayNum.textContent = id || '—';

    if (aspiranteFull && Object.keys(aspiranteFull).length > 0) {
        const sel = document.getElementById('medio_reclutamiento');
        if (sel && aspiranteFull.medio_reclutamiento) {
            sel.value = aspiranteFull.medio_reclutamiento;
            if (sel.value === '') {
                const match = Array.from(sel.options).find(o => o.textContent.trim().toLowerCase() === aspiranteFull.medio_reclutamiento.trim().toLowerCase());
                if (match) { sel.value = match.value; }
                else {
                    const opt = document.createElement('option');
                    opt.value = aspiranteFull.medio_reclutamiento;
                    opt.textContent = aspiranteFull.medio_reclutamiento;
                    sel.appendChild(opt); sel.value = aspiranteFull.medio_reclutamiento;
                }
            }
            sel.dispatchEvent(new Event('change'));
        }

        const recom = document.getElementById('recomendador_aspirante');
        if (recom && aspiranteFull.recomendador_aspirante) recom.value = aspiranteFull.recomendador_aspirante;

        const campos = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'correo_electronico', 'telefono', 'direccion_barrio'];
        campos.forEach(key => {
            const inp = document.getElementById(key);
            if (inp && aspiranteFull[key]) inp.value = aspiranteFull[key];
        });
    }
}

function updateIngresoLabel() {
    try {
        const tipo = getSessionTipo();
        const id = getSessionId();
        if (!tipo && !id) return;

        // Sync hidden identification fields used for form submission
        const hidTipo = document.getElementById('tipo_documento');
        const hidIdent = document.getElementById('identificacion');
        if (hidTipo) hidTipo.value = tipo;
        if (hidIdent) hidIdent.value = id;

        // Update the read-only display card in step 1
        const displayTipo = document.getElementById('ident-display-tipo');
        const displayNum = document.getElementById('ident-display-num');
        if (displayTipo) displayTipo.textContent = tipo || '—';
        if (displayNum) displayNum.textContent = id || '—';
    } catch (err) {
        console.error('updateIngresoLabel error:', err);
    }
}

function rellenarFotoDesdeAspirante(aspirante) {
    if (!aspirante) return;
    const url = aspirante.foto_public_url || aspirante.foto_url || null;
    const gcsPath = aspirante.foto_gcs_path || null;
    if (url) {
        setPhotoPreview(url, gcsPath || '');
        const s = document.getElementById('photo-status');
        if (s) s.textContent = 'Foto cargada previamente.';
    } else {
        clearPhotoLocal();
    }
}

function resetFormToInitialState() {
    try {
        sessionStorage.removeItem('tipo_ingreso');
        sessionStorage.removeItem('id_ingreso');
        sessionStorage.removeItem('firma_temp');
        sessionStorage.removeItem('aspirante_data');
        sessionStorage.removeItem('fecha_expedicion_ingreso');

        ['hidden_tipo_documento', 'hidden_identificacion', 'tipo_doc_hid', 'id_hid'].forEach(id => {
            document.getElementById(id)?.remove();
        });

        const tipoMain = document.getElementById('tipo_documento');
        const identMain = document.getElementById('identificacion');
        if (tipoMain) { tipoMain.removeAttribute('disabled'); tipoMain.value = ''; }
        if (identMain) { identMain.removeAttribute('readonly'); identMain.value = ''; }

        const tipoIngreso = document.getElementById('tipo_documento_ingreso');
        const identIngreso = document.getElementById('identificacion_ingreso');
        if (tipoIngreso) tipoIngreso.value = '';
        if (identIngreso) { identIngreso.value = ''; identIngreso.focus(); }

        document.getElementById('hv-form')?.reset();

        ['ciudad_expedicion', 'ciudad_residencia'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">Selecciona...</option>';
        });

        educacionData = [{ institucion: '', programa: '', nivel_escolaridad: '', modalidad: '', ano: '', finalizado: '1' }];
        expData = [{ empresa: '', cargo: '', ano_experiencia: '', tiempo_laborado: '', salario: '', motivo_retiro: '', funciones: '' }];
        familiaresData = [{ nombre_completo: '', parentesco: '', edad: '', ocupacion: '', conviven_juntos: '1' }];

        hijosData = [];
        renderHijos();
        renderEducacion();
        renderExp();
        renderFamiliares();

        const ingresoMsg = document.getElementById('ingreso-msg');
        if (ingresoMsg) { ingresoMsg.textContent = ''; ingresoMsg.style.display = 'none'; }

        const preview = document.getElementById('preview-container');
        if (preview) preview.innerHTML = '';

        clearPhotoLocal();
        document.getElementById('hidden_foto_gcs_path')?.remove();
        document.getElementById('hidden_foto_public_url')?.remove();

        limpiarErroresCampo();
        showStep(0);
    } catch (err) {
        console.error('Error al resetear formulario:', err);
    }
}
