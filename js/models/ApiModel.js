/* ── Fetch helper ───────────────────────────────────────────────────────── */
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        clearTimeout(timeout);
        throw err;
    }
}

/* ── Tipo de identificación — llena el gate Y el paso 1 en una sola llamada */
async function cargarTipoIdentificacion() {
    const IDS = ['tipo_documento_ingreso', 'tipo_documento'];

    // Show loading state immediately
    IDS.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.innerHTML = '<option value="">Cargando...</option>';
    });

    try {
        const data = await fetchWithTimeout(`${API_CONFIG_URL}/tipo-identificacion`);

        if (!Array.isArray(data) || data.length === 0) {
            console.warn('[ApiModel] tipos-identificacion: respuesta vacía o no es array', data);
            IDS.forEach(id => {
                const sel = document.getElementById(id);
                if (sel) sel.innerHTML = '<option value="">Sin datos</option>';
            });
            return;
        }

        window.tiposIdentificacion = data;

        // Fill every tipo-documento select in the page
        IDS.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Selecciona...</option>';
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.descripcion;
                opt.textContent = item.descripcion;
                sel.appendChild(opt);
            });
        });

        document.dispatchEvent(new Event('tipos-cargados'));
    } catch (err) {
        console.error('[ApiModel] cargarTipoIdentificacion error:', err);
        IDS.forEach(id => {
            const sel = document.getElementById(id);
            if (sel) sel.innerHTML = '<option value="">Error al cargar</option>';
        });
    }
}

/** @deprecated — funcionalidad fusionada en cargarTipoIdentificacion() */
async function cargarTiposPaso0() {
    return cargarTipoIdentificacion();
}

/* ── Departamentos ──────────────────────────────────────────────────────── */
async function cargarDepartamentos() {
    try {
        const data = await fetchWithTimeout(`${API_CONFIG_URL}/departamentos`);
        if (!Array.isArray(data)) return;

        const depExp = document.getElementById('departamento_expedicion');
        const depRes = document.getElementById('departamento_residencia');

        const fill = (selectEl) => {
            if (!selectEl) return;
            selectEl.innerHTML = '<option value="">Selecciona...</option>';
            data.forEach(item => {
                const dep = item.departamento || item.nombre || item;
                if (!dep) return;
                const opt = document.createElement('option');
                opt.value = dep;
                opt.textContent = dep;
                selectEl.appendChild(opt);
            });
        };

        fill(depExp);
        fill(depRes);
    } catch (err) {
        console.error('Error cargando departamentos:', err);
        ['departamento_expedicion', 'departamento_residencia'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<option value="">Error al cargar</option>';
        });
    }
}

/* ── Ciudades ───────────────────────────────────────────────────────────── */
async function cargarCiudades(selectDepartamentoId, selectCiudadId) {
    const depEl = document.getElementById(selectDepartamentoId);
    const ciudadEl = document.getElementById(selectCiudadId);
    if (!depEl || !ciudadEl) return;

    const dep = depEl.value;
    ciudadEl.innerHTML = '<option value="">Cargando ciudades...</option>';
    ciudadEl.disabled = true;

    if (!dep) {
        ciudadEl.innerHTML = '<option value="">Selecciona...</option>';
        ciudadEl.disabled = false;
        return;
    }

    try {
        const data = await fetchWithTimeout(`${API_CONFIG_URL}/ciudades?departamento=${encodeURIComponent(dep)}`);
        ciudadEl.innerHTML = '<option value="">Selecciona...</option>';
        if (Array.isArray(data)) {
            data.forEach(item => {
                const ciudad = item.ciudad || item.nombre || item;
                if (!ciudad) return;
                const opt = document.createElement('option');
                opt.value = ciudad;
                opt.textContent = ciudad;
                ciudadEl.appendChild(opt);
            });
        }
        ciudadEl.disabled = false;
    } catch (err) {
        console.error(`Error cargando ciudades para ${dep}:`, err);
        ciudadEl.innerHTML = '<option value="">Error al cargar</option>';
        ciudadEl.disabled = false;
    }
}

/* ── EPS ────────────────────────────────────────────────────────────────── */
async function cargarEPS() {
    try {
        const data = await fetchWithTimeout(`${API_CONFIG_URL}/eps`);
        if (!Array.isArray(data)) return;
        const select = document.getElementById('eps');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona...</option>';
        data.forEach(item => {
            const eps = item.eps || item.nombre || item;
            if (!eps) return;
            const opt = document.createElement('option');
            opt.value = eps; opt.textContent = eps;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error cargando EPS:', err);
        const el = document.getElementById('eps');
        if (el) el.innerHTML = '<option value="">Error al cargar</option>';
    }
}

/* ── Pensión ────────────────────────────────────────────────────────────── */
async function cargarPension() {
    try {
        const data = await fetchWithTimeout(`${API_CONFIG_URL}/pension`);
        if (!Array.isArray(data)) return;
        const select = document.getElementById('afp');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona...</option>';
        data.forEach(item => {
            const pension = item.pension || item.nombre || item;
            if (!pension) return;
            const opt = document.createElement('option');
            opt.value = pension; opt.textContent = pension;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error cargando fondos de pensión:', err);
        const el = document.getElementById('afp');
        if (el) el.innerHTML = '<option value="">Error al cargar</option>';
    }
}

/* ── Estado civil ───────────────────────────────────────────────────────── */
async function cargarEstadoCivil() {
    try {
        const data = await fetchWithTimeout(`${API_CONFIG_URL}/estado-civil`);
        if (!Array.isArray(data)) return;
        const select = document.getElementById('estado_civil');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona una opción</option>';
        data.forEach(item => {
            const val = item.estado_civil || item.Condición || item.condicion || item;
            if (!val) return;
            const opt = document.createElement('option');
            opt.value = val; opt.textContent = val;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error cargando estado civil:', err);
        const el = document.getElementById('estado_civil');
        if (el) el.innerHTML = '<option value="">Error al cargar</option>';
    }
}

/* ── Initialize all selects ─────────────────────────────────────────────── */
async function inicializarSelects() {
    try {
        await Promise.all([
            cargarTipoIdentificacion(),
            cargarDepartamentos(),
            cargarEPS(),
            cargarPension(),
            cargarEstadoCivil()
        ]);
        window.selectsLoaded = true;
        document.dispatchEvent(new Event('selects-cargados'));
    } catch (err) {
        console.error('Error inicializando selects:', err);
        window.selectsLoaded = false;
    }
}
