const API_URL =
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080/api/config"
    : "/api/config";

// ==============================
// Función helper para fetch con timeout y validación
// ==============================
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20 segundos para evitar fallos en cold starts

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ==============================
// Cargar Tipo de Identificación
// ==============================
async function cargarTipoIdentificacion() {
  try {
    const data = await fetchWithTimeout(`${API_URL}/tipo-identificacion`);

    // Validar que data sea un array
    if (!Array.isArray(data)) {
      console.error("La respuesta de tipo-identificacion no es un array:", data);
      return;
    }

    window.tiposIdentificacion = data;

    const select = document.getElementById("tipo_documento");
    if (select) {
      // Limpiar el select antes de llenar
      select.innerHTML = '<option value="">Seleccione...</option>';

      data.forEach(item => {
          const option = document.createElement("option");
          // Usamos item.descripcion porque así viene de tu MySQL
          option.value = item.descripcion; 
          option.textContent = item.descripcion; 
          select.appendChild(option);
      });
    }

    document.dispatchEvent(new Event("tipos-cargados"));
  } catch (err) {
    console.error("Error cargando tipos de identificación:", err);

    // Mostrar mensaje amigable al usuario
    const select = document.getElementById("tipo_documento");
    if (select) {
      select.innerHTML = `<option value="">Error cargando tipos</option>`;
    }
  }
}

// ==============================
// Cargar Departamentos
// ==============================
async function cargarDepartamentos() {
  try {
    const data = await fetchWithTimeout(`${API_URL}/departamentos`);
    if (!Array.isArray(data)) {
      console.error("La respuesta de departamentos no es un array:", data);
      return;
    }

    const depExp = document.getElementById("departamento_expedicion");
    const depRes = document.getElementById("departamento_residencia");

    const fill = (selectEl) => {
      if (!selectEl) return;
      selectEl.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Selecciona...";
      selectEl.appendChild(opt0);

      data.forEach((item) => {
        const departamento = item.departamento || item.nombre || item;
        if (!departamento) return;
        const opt = document.createElement("option");
        opt.value = departamento;
        opt.textContent = departamento;
        selectEl.appendChild(opt);
      });
    };

    fill(depExp);
    fill(depRes);
  } catch (err) {
    console.error("Error cargando departamentos:", err);

    ["departamento_expedicion", "departamento_residencia"].forEach((id) => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = "";
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "Error cargando departamentos";
        select.appendChild(opt);
      }
    });
  }
}

// ==============================
// Cargar Ciudades según Departamento
// ==============================
async function cargarCiudades(selectDepartamentoId, selectCiudadId) {
  const depEl = document.getElementById(selectDepartamentoId);
  const ciudadSelect = document.getElementById(selectCiudadId);

  if (!depEl || !ciudadSelect) return;

  const dep = depEl.value;

  ciudadSelect.innerHTML = `<option value="">Cargando ciudades...</option>`;
  ciudadSelect.disabled = true;

  if (!dep) {
    ciudadSelect.innerHTML = `<option value="">Selecciona...</option>`;
    ciudadSelect.disabled = false;
    return;
  }

  try {
    const data = await fetchWithTimeout(`${API_URL}/ciudades?departamento=${encodeURIComponent(dep)}`);

    ciudadSelect.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "Selecciona...";
    ciudadSelect.appendChild(opt0);

    if (Array.isArray(data)) {
      data.forEach((item) => {
        const ciudad = item.ciudad || item.nombre || item;
        if (!ciudad) return;
        const opt = document.createElement("option");
        opt.value = ciudad;
        opt.textContent = ciudad;
        ciudadSelect.appendChild(opt);
      });
    }

    ciudadSelect.disabled = false;
  } catch (err) {
    console.error(`Error cargando ciudades para ${dep}:`, err);
    ciudadSelect.innerHTML = `<option value="">Error cargando ciudades</option>`;
    ciudadSelect.disabled = false;
  }
}

// ==============================
// Cargar EPS
// ==============================
async function cargarEPS() {
  try {
    const data = await fetchWithTimeout(`${API_URL}/eps`);

    if (!Array.isArray(data)) {
      console.error("La respuesta de EPS no es un array:", data);
      return;
    }

    const select = document.getElementById("eps");
    if (!select) return;

    select.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Selecciona...";
      select.appendChild(opt0);

      data.forEach((item) => {
        const eps = item.eps || item.nombre || item;
        if (!eps) return;
        const opt = document.createElement("option");
        opt.value = eps;
        opt.textContent = eps;
        select.appendChild(opt);
      });

  } catch (err) {
    console.error("Error cargando EPS:", err);

    const select = document.getElementById("eps");
    if (select) {
      select.innerHTML = `<option value="">Error cargando EPS</option>`;
    }
  }
}

// ==============================
// Cargar Fondos de Pensión
// ==============================
async function cargarPension() {
  try {
    const data = await fetchWithTimeout(`${API_URL}/pension`);

    if (!Array.isArray(data)) {
      console.error("La respuesta de pension no es un array:", data);
      return;
    }

    const select = document.getElementById("afp");
    if (!select) return;

    select.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Selecciona...";
      select.appendChild(opt0);

      data.forEach((item) => {
        const pension = item.pension || item.nombre || item;
        if (!pension) return;
        const opt = document.createElement("option");
        opt.value = pension;
        opt.textContent = pension;
        select.appendChild(opt);
      });

  } catch (err) {
    console.error("Error cargando fondos de pensión:", err);

    const select = document.getElementById("afp");
    if (select) {
      select.innerHTML = `<option value="">Error cargando pensiones</option>`;
    }
  }
}

// ==============================
// Cargar Estado Civil
// ==============================
async function cargarEstadoCivil() {
  try {
    const data = await fetchWithTimeout(`${API_URL}/estado-civil`);

    if (!Array.isArray(data)) {
      console.error("La respuesta de estado-civil no es un array:", data);
      return;
    }

    const select = document.getElementById("estado_civil");
    if (!select) return;

    select.innerHTML = `<option value="">Selecciona una opción</option>`;

    data.forEach(item => {
      const val = item.estado_civil || item.Condición || item.condicion || item;
      if (!val) return;

      const option = document.createElement("option");
      option.value = val;
      option.textContent = val;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error cargando estado civil:", err);
    const select = document.getElementById("estado_civil");
    if (select) {
      select.innerHTML = `<option value="">Error cargando estado civil</option>`;
    }
  }
}

// ==============================
// Inicializar todos los selects
// ==============================
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
    document.dispatchEvent(new Event("selects-cargados"));
  } catch (err) {
    console.error("Error inicializando selects:", err);
    window.selectsLoaded = false;
  }
}

// ==============================
// Configurar event listeners cuando el DOM esté listo
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  inicializarSelects();

  // Configurar listeners de departamentos después de que el DOM cargue
  const depExpEl = document.getElementById("departamento_expedicion");
  if (depExpEl) {
    depExpEl.addEventListener("change", () =>
      cargarCiudades("departamento_expedicion", "ciudad_expedicion")
    );
  }

  const depResEl = document.getElementById("departamento_residencia");
  if (depResEl) {
    depResEl.addEventListener("change", () =>
      cargarCiudades("departamento_residencia", "ciudad_residencia")
    );
  }
});