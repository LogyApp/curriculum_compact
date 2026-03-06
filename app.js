const API_URL = "https://curriculum-compact-594761951101.europe-west1.run.app/api/config";

// ==============================
// Función helper para fetch con timeout y validación
// ==============================
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

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
      select.innerHTML = `<option value="">Selecciona...</option>`;

      data.forEach(item => {
        // Manejar diferentes posibles estructuras de datos
        const valor = item.descripcion || item.nombre || item.tipo || item;
        if (valor) {
          select.innerHTML += `<option value="${valor}">${valor}</option>`;
        }
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

    if (depExp) depExp.innerHTML = `<option value="">Selecciona...</option>`;
    if (depRes) depRes.innerHTML = `<option value="">Selecciona...</option>`;

    data.forEach(item => {
      // Manejar diferentes estructuras
      const departamento = item.departamento || item.nombre || item;
      if (departamento) {
        if (depExp) depExp.innerHTML += `<option value="${departamento}">${departamento}</option>`;
        if (depRes) depRes.innerHTML += `<option value="${departamento}">${departamento}</option>`;
      }
    });
  } catch (err) {
    console.error("Error cargando departamentos:", err);

    ["departamento_expedicion", "departamento_residencia"].forEach(id => {
      const select = document.getElementById(id);
      if (select) {
        select.innerHTML = `<option value="">Error cargando departamentos</option>`;
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

    ciudadSelect.innerHTML = `<option value="">Selecciona...</option>`;

    if (Array.isArray(data)) {
      data.forEach(item => {
        const ciudad = item.ciudad || item.nombre || item;
        if (ciudad) {
          ciudadSelect.innerHTML += `<option value="${ciudad}">${ciudad}</option>`;
        }
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

    select.innerHTML = `<option value="">Selecciona...</option>`;

    data.forEach(item => {
      const eps = item.eps || item.nombre || item;
      if (eps) {
        select.innerHTML += `<option value="${eps}">${eps}</option>`;
      }
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

    select.innerHTML = `<option value="">Selecciona...</option>`;

    data.forEach(item => {
      const pension = item.pension || item.nombre || item;
      if (pension) {
        select.innerHTML += `<option value="${pension}">${pension}</option>`;
      }
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
// Inicializar todos los selects
// ==============================
async function inicializarSelects() {
  try {
    await Promise.all([
      cargarTipoIdentificacion(),
      cargarDepartamentos(),
      cargarEPS(),
      cargarPension()
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