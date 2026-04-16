const API_URL_BASE =
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080/api"
    : "/api";
const form = document.getElementById("hv-form");
const steps = Array.from(document.querySelectorAll(".form-step"));
const stepperItems = Array.from(document.querySelectorAll(".stepper .step"));
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnSubmit = document.getElementById("btn-submit");
const medioSelect = document.getElementById("medio_reclutamiento");
const campoRecomendador = document.getElementById("campo-recomendador");
const fechaNacimientoInput = document.getElementById("fecha_nacimiento");
const fechaExpedicionInput = document.getElementById("fecha_expedicion");
const edadInput = document.getElementById("edad");

// Paso 0 (Ingreso)
const identificacionIngreso = document.getElementById("identificacion_ingreso");
const tipoDocumentoIngreso = document.getElementById("tipo_documento_ingreso");
const medioReclutamiento = document.getElementById("medio_reclutamiento");
const ingresoMsg = document.getElementById("ingreso-msg");

// Referencias
const ref_lab_empresa = document.getElementById("ref_lab_empresa");
const ref_lab_jefe = document.getElementById("ref_lab_jefe");
const ref_lab_cargo = document.getElementById("ref_lab_cargo");
const ref_lab_tel = document.getElementById("ref_lab_tel");

const ref_fam_nombre = document.getElementById("ref_fam_nombre");
const ref_fam_parentesco = document.getElementById("ref_fam_parentesco");
const ref_fam_tel = document.getElementById("ref_fam_tel");
const ref_fam_ocupacion = document.getElementById("ref_fam_ocupacion");

const ref_per_nombre = document.getElementById("ref_per_nombre");
const ref_per_relacion = document.getElementById("ref_per_relacion");
const ref_per_tel = document.getElementById("ref_per_tel");
const ref_per_ocupacion = document.getElementById("ref_per_ocupacion");

// Emergencia
const emer_nombre = document.getElementById("emer_nombre");
const emer_parentesco = document.getElementById("emer_parentesco");
const emer_telefono = document.getElementById("emer_telefono");
const emer_correo = document.getElementById("emer_correo");
const emer_direccion = document.getElementById("emer_direccion");

// Metas
const meta_corto = document.getElementById("meta_corto");
const meta_mediano = document.getElementById("meta_mediano");
const meta_largo = document.getElementById("meta_largo");

// Seguridad
const seg_llamados = document.getElementById("seg_llamados");
const seg_accidente = document.getElementById("seg_accidente");
const seg_enfermedad = document.getElementById("seg_enfermedad");
const seg_alcohol = document.getElementById("seg_alcohol");
const seg_familiar = document.getElementById("seg_familiar");
const seg_familiar_nombre = document.getElementById("seg_familiar_nombre");
const seg_frecuencia = document.getElementById("seg_frecuencia");
const seg_falsa = document.getElementById("seg_falsa");
const seg_poligrafo = document.getElementById("seg_poligrafo");
const seg_observaciones = document.getElementById("seg_observaciones");
const seg_califica = document.getElementById("seg_califica");
const seg_fortal = document.getElementById("seg_fortal");
const seg_mejorar = document.getElementById("seg_mejorar");
const seg_resolucion = document.getElementById("seg_resolucion");
const seg_detalle_llamados = document.getElementById("seg_detalle_llamados");
const seg_detalle_accidente = document.getElementById("seg_detalle_accidente");
const seg_detalle_enfermedad = document.getElementById("seg_detalle_enfermedad");

// Datos personales base
const identificacionInput = document.getElementById("identificacion");

let currentStep = 0;

// ⭐ AHORA SÍ PONLO AQUÍ ⭐
showStep(0);

// ========= FUNCIÓN DE SANITIZACIÓN =========
function sanitizarString(str) {
    if (!str) return "";
    return String(str)
        .trim()
        .replace(/[<>]/g, "") // Elimina caracteres que podrían romper JSON/HTML
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Elimina caracteres de control
}

function sanitizarNumero(val) {
    if (!val && val !== 0) return "";
    return String(val).replace(/[^0-9]/g, "");
}

function formatearFechaParaServidor(fecha) {
    if (!fecha) return null;
    // Asegurar formato YYYY-MM-DD
    const partes = String(fecha).split("T")[0].split("-");
    if (partes.length !== 3) return null;
    const [year, month, day] = partes;
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return null;
    return `${year}-${month}-${day}`;
}

// ========= FUNCIÓN PARA LIMPIAR ERRORES =========
function limpiarErroresCampo() {
    // Limpiar todos los mensajes de error
    document.querySelectorAll('.field-error').forEach(el => {
        el.textContent = '';
    });

    // Quitar clase error de todos los campos
    document.querySelectorAll('input.error, select.error, textarea.error').forEach(el => {
        el.classList.remove('error');
    });
}

// ========= FUNCIÓN PARA MOSTRAR ERROR EN CAMPO =========
function mostrarErrorCampo(idCampo, mensaje) {
    const campo = document.getElementById(idCampo);
    const errorDiv = document.getElementById(`error-${idCampo}`);

    if (campo) {
        campo.classList.add('error');
    }

    if (errorDiv) {
        errorDiv.textContent = mensaje;
    }
}

// ========= VALIDACIÓN POR PASO =========
function validateStep(stepIndex) {
    // 1. Limpiar errores anteriores
    limpiarErroresCampo();

    const stepElement = steps[stepIndex];
    if (!stepElement) return false;

    const requiredFields = stepElement.querySelectorAll("[data-required='true']");
    let valid = true;
    let firstInvalid = null;

    // --- MEJORA PARA MÓVILES: Validar si los datos de la API cargaron ---
    // Si estamos en un paso que depende de selectores (como Ingreso, Datos Personales o Seguridad)
    const selects = stepElement.querySelectorAll("select");
    for (let sel of selects) {
        // Si el select obligatorio dice "Cargando..." o está vacío por error de red
        if (sel.getAttribute("data-required") === "true" && (sel.options.length <= 1 && sel.innerText.includes("Cargando"))) {
            alert("⚠️ Algunos datos no cargaron por falla de internet. Por favor, refresca la página.");
            return false;
        }
    }

    // 2. Validar campos obligatorios vacíos
    requiredFields.forEach((field) => {
        const value = (field.value || "").trim();
        // Caso especial para la firma en el último paso
       if (stepIndex === 1) {
        const firma = sessionStorage.getItem('firma_temp');
        if (!firma || firma.length <= 200) {
            valid = false;
            const errorFirma = document.getElementById("error-firma");
            if (errorFirma) errorFirma.textContent = "Debes dibujar tu firma antes de continuar.";
        }
    }

        const isInvalid = value === "" || value === null;

        if (isInvalid) {
            field.classList.add('error');
            const fieldId = field.id;
            if (fieldId) {
                const errorDiv = document.getElementById(`error-${fieldId}`);
                if (errorDiv) errorDiv.textContent = "Este campo es obligatorio";
            }
            if (!firstInvalid) firstInvalid = field;
            valid = false;
        }
    });

    // 3. Validaciones específicas por paso (Tu lógica original mejorada)
    if (stepIndex === 1) { // Datos personales
        // Validar email
        const email = document.getElementById("correo_electronico");
        if (email && email.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.value)) {
                email.classList.add('error');
                const errorDiv = document.getElementById("error-correo_electronico");
                if (errorDiv) errorDiv.textContent = "El correo electrónico no es válido";
                if (!firstInvalid) firstInvalid = email;
                valid = false;
            }
        }

        // Validar teléfono (Exactamente 10 dígitos para Colombia)
        const telefono = document.getElementById("telefono");
        if (telefono && telefono.value) {
            const soloNumeros = telefono.value.replace(/\D/g, "");
            if (soloNumeros.length !== 10) {
                telefono.classList.add('error');
                const errorDiv = document.getElementById("error-telefono");
                if (errorDiv) errorDiv.textContent = "El teléfono celular debe tener 10 dígitos";
                if (!firstInvalid) firstInvalid = telefono;
                valid = false;
            }
        }

        // Validar identificación (5 a 12 dígitos)
        const identificacion = document.getElementById("identificacion");
        if (identificacion && identificacion.value) {
            const soloNumeros = identificacion.value.replace(/\D/g, "");
            if (soloNumeros.length < 5 || soloNumeros.length > 12) {
                identificacion.classList.add('error');
                const errorDiv = document.getElementById("error-identificacion");
                if (errorDiv) errorDiv.textContent = "La identificación debe tener entre 5 y 12 dígitos";
                if (!firstInvalid) firstInvalid = identificacion;
                valid = false;
            }
        }
    }

    // 4. Feedback visual final del paso
    const errorStepDiv = document.getElementById(`error-step-${stepIndex}`);
    if (errorStepDiv) {
        if (!valid) {
            errorStepDiv.textContent = "⚠️ Por favor corrige los campos marcados en rojo.";
            errorStepDiv.style.display = "block";
        } else {
            errorStepDiv.textContent = "";
            errorStepDiv.style.display = "none";
        }
    }

    if (firstInvalid) {
        firstInvalid.focus();
        // Scroll suave al primer error para móviles
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return valid;
}

// ========= PASO 0: Validación de ingreso =========
async function validarIngreso() {
    // Primero validar campos localmente
    if (!validateStep(0)) {
        return false;
    }

    const tipo = sanitizarString(tipoDocumentoIngreso.value);
    const id = sanitizarNumero(identificacionIngreso.value);

    try {
    // Usamos la URL base dinámica para evitar errores de despliegue
    const VALIDAR_URL = `${API_URL_BASE}/aspirante`;

    const resp = await fetch(`${VALIDAR_URL}?identificacion=${id}`);

    if (!resp.ok) {
        throw new Error(`Error HTTP: ${resp.status}`);
    }

        const data = await resp.json();

        if (data.existe) {
            ingresoMsg.style.color = "green";
            ingresoMsg.textContent = "✔ Registro encontrado. Cargando datos...";

            // Guardar en sessionStorage
            sessionStorage.setItem("tipo_ingreso", tipo);
            sessionStorage.setItem("id_ingreso", id);
            sessionStorage.setItem("aspirante_data", JSON.stringify(data.aspirante));

            if (typeof updateIngresoLabel === "function") {
                updateIngresoLabel();
            }

            await rellenarFormulario(data);

            setTimeout(() => {
                const tipoMain = document.getElementById("tipo_documento");
                const identMain = document.getElementById("identificacion");

                if (tipoMain) {
                    tipoMain.value = tipo;
                    tipoMain.setAttribute("disabled", true);
                }
                if (identMain) {
                    identMain.value = id;
                    identMain.setAttribute("readonly", true);
                }

                showStep(1);
            }, 500);

            return true;
        } else {
            ingresoMsg.style.color = "#444";
            ingresoMsg.textContent = "ℹ No encontramos un registro previo. Continúa con el formulario.";

            sessionStorage.setItem("tipo_ingreso", tipo);
            sessionStorage.setItem("id_ingreso", id);

            if (typeof updateIngresoLabel === "function") {
                updateIngresoLabel();
            }

            setTimeout(() => {
                showStep(1);
            }, 300);
            return true;
        }
    } catch (err) {
        ingresoMsg.style.color = "var(--error)";
        ingresoMsg.textContent = "⚠ Error consultando el servidor. Intenta nuevamente.";
        console.error("Error en validarIngreso:", err);
        return false;
    }
}

identificacionIngreso.addEventListener("blur", validarIngreso);
tipoDocumentoIngreso.addEventListener("change", () => {
    ingresoMsg.textContent = "";
    // Limpiar error al cambiar
    document.getElementById("error-tipo_documento_ingreso").textContent = "";
    tipoDocumentoIngreso.classList.remove('error');
});

identificacionIngreso.addEventListener("input", () => {
    // Limpiar error al escribir
    document.getElementById("error-identificacion_ingreso").textContent = "";
    identificacionIngreso.classList.remove('error');
});

function showStep(index) {
    steps.forEach((step, i) => {
        step.classList.toggle("active", i === index);
    });

    stepperItems.forEach((item, i) => {
        item.classList.remove("active", "completed");
        if (i === index) {
            item.classList.add("active");
        } else if (i < index) {
            item.classList.add("completed");
        }
    });

    btnPrev.disabled = index === 0;

    if (index === steps.length - 1) {
        btnNext.classList.add("hidden");
        btnSubmit.classList.remove("hidden");
    } else {
        btnNext.classList.remove("hidden");
        btnSubmit.classList.add("hidden");
    }

    currentStep = index;

    if (index === 7) {
    buildPreview();
    }
}

// =====================
// EDUCACIÓN DINÁMICA
// =====================
const educacionList = document.getElementById("educacion-list");
const btnAddEducacion = document.getElementById("btn-add-educacion");

let educacionData = [];

function crearCardEducacion(index, data = {}) {
    const finalizadoVal = data.finalizado !== undefined ? String(data.finalizado) : "1";
    return `
        <div class="educ-card" data-index="${index}">
          <div class="educ-grid">
            <div class="field">
              <label>Institución <span class="required">*</span></label>
              <input type="text" class="educ-institucion" value="${escapeHtml(data.institucion || "")}" data-required="true">
              <div class="field-error" id="error-educ-institucion-${index}"></div>
            </div>
            <div class="field">
              <label>Programa <span class="required">*</span></label>
              <input type="text" class="educ-programa" value="${escapeHtml(data.programa || "")}" data-required="true">
              <div class="field-error" id="error-educ-programa-${index}"></div>
            </div>

            <div class="field">
              <label>Nivel de escolaridad <span class="required">*</span></label>
              <select class="educ-nivel" data-required="true">
                <option value="">Selecciona</option>
                <option value="bachiller" ${data.nivel_escolaridad === "bachiller" ? "selected" : ""}>Bachiller</option>
                <option value="tecnico" ${data.nivel_escolaridad === "tecnico" ? "selected" : ""}>Técnico</option>
                <option value="tecnologo" ${data.nivel_escolaridad === "tecnologo" ? "selected" : ""}>Tecnólogo</option>
                <option value="tecnico_superior" ${data.nivel_escolaridad === "tecnico_superior" ? "selected" : ""}>Técnico Superior</option>
                <option value="profesional" ${data.nivel_escolaridad === "profesional" ? "selected" : ""}>Profesional</option>
                <option value="especializacion" ${data.nivel_escolaridad === "especializacion" ? "selected" : ""}>Especialización</option>
                <option value="maestria" ${data.nivel_escolaridad === "maestria" ? "selected" : ""}>Maestría</option>
                <option value="doctorado" ${data.nivel_escolaridad === "doctorado" ? "selected" : ""}>Doctorado</option>
                <option value="otro" ${data.nivel_escolaridad === "otro" ? "selected" : ""}>Otro</option>
              </select>
              <div class="field-error" id="error-educ-nivel-${index}"></div>
            </div>

            <div class="field">
              <label>Modalidad</label>
              <select class="educ-modalidad">
                <option value="">Selecciona</option>
                <option value="presencial" ${data.modalidad === "presencial" ? "selected" : ""}>Presencial</option>
                <option value="virtual" ${data.modalidad === "virtual" ? "selected" : ""}>Virtual</option>
                <option value="distancia" ${data.modalidad === "distancia" ? "selected" : ""}>A distancia</option>
              </select>
            </div>

            <div class="field">
              <label>Año</label>
              <input type="number" class="educ-ano" min="1950" max="2050" value="${data.ano || ""}">
            </div>

            <div class="field">
              <label>Finalizado</label>
              <select class="educ-finalizado">
                <option value="1" ${finalizadoVal === "1" ? "selected" : ""}>Sí</option>
                <option value="0" ${finalizadoVal === "0" ? "selected" : ""}>No</option>
                <option value="2" ${finalizadoVal === "2" ? "selected" : ""}>En curso</option>
              </select>
            </div>
          </div>
          <span class="educ-remove" onclick="eliminarEducacion(${index})">🗑️ Eliminar</span>
        </div>
      `;
}

function renderEducacion() {
    educacionList.innerHTML = "";
    educacionData.forEach((item, index) => {
        educacionList.innerHTML += crearCardEducacion(index, item);
    });
}

btnAddEducacion.addEventListener("click", () => {
    recopilarEducacion();
    educacionData.push({
        institucion: "",
        programa: "",
        nivel_escolaridad: "",
        modalidad: "",
        ano: "",
        finalizado: "1"
    });
    renderEducacion();
});

function eliminarEducacion(index) {
    educacionData.splice(index, 1);
    renderEducacion();
}
window.eliminarEducacion = eliminarEducacion;

function recopilarEducacion() {
    const cards = document.querySelectorAll(".educ-card");

    educacionData = Array.from(cards).map(card => {
        return {
            institucion: sanitizarString(card.querySelector(".educ-institucion")?.value || ""),
            programa: sanitizarString(card.querySelector(".educ-programa")?.value || ""),
            nivel_escolaridad: card.querySelector(".educ-nivel")?.value || "",
            modalidad: card.querySelector(".educ-modalidad")?.value || "",
            ano: card.querySelector(".educ-ano")?.value || "",
            finalizado: card.querySelector(".educ-finalizado")?.value || "1"
        };
    }).filter(edu => edu.institucion || edu.programa); // Filtrar vacíos

    return educacionData;
}

// =====================
// EXPERIENCIA LABORAL
// =====================
const expList = document.getElementById("exp-list");
const btnAddExp = document.getElementById("btn-add-exp");

let expData = [];

function crearCardExp(index, data = {}) {
  return `
    <div class="exp-card" data-index="${index}">
      <div class="exp-grid">
        <div class="field">
          <label>Empresa *</label>
          <input type="text" class="exp-empresa" value="${escapeHtml(data.empresa || "")}" data-required="true" />
          <div class="field-error" id="error-exp-empresa-${index}"></div>
        </div>

        <div class="field">
          <label>Cargo *</label>
          <input type="text" class="exp-cargo" value="${escapeHtml(data.cargo || "")}" data-required="true" />
          <div class="field-error" id="error-exp-cargo-${index}"></div>
        </div>

        <div class="field">
          <label>Año inicio</label>
          <input type="number" class="exp-ano" min="1950" max="2050"
            value="${escapeHtml(data.ano_experiencia || "")}" />
          <div class="field-error" id="error-exp-ano-${index}"></div>
        </div>

        <div class="field">
          <label>Tiempo laborado</label>
          <input type="text" class="exp-tiempo" value="${escapeHtml(data.tiempo_laborado || "")}" />
        </div>

        <div class="field">
          <label>Salario</label>
          <input type="text" class="exp-salario" value="${escapeHtml(data.salario || "")}" />
        </div>

        <div class="field">
          <label>Motivo del retiro</label>
          <input type="text" class="exp-motivo" value="${escapeHtml(data.motivo_retiro || "")}" />
        </div>

        <div class="field" style="grid-column: span 2;">
          <label>Funciones realizadas</label>
          <textarea class="exp-funciones" rows="2">${escapeHtml(data.funciones || "")}</textarea>
        </div>
      </div>

      <span class="exp-remove" onclick="eliminarExp(${index})">🗑️ Eliminar</span>
    </div>
  `;
}

function renderExp() {
    expList.innerHTML = "";
    expData.forEach((item, index) => {
        expList.innerHTML += crearCardExp(index, item);
    });
}

btnAddExp.addEventListener("click", () => {
    recopilarExp();
    expData.push({
        empresa: "",
        cargo: "",
        ano_experiencia: "",
        tiempo_laborado: "",
        salario: "",
        motivo_retiro: "",
        funciones: ""
    });
    renderExp();
});

function eliminarExp(index) {
    expData.splice(index, 1);
    renderExp();
}
window.eliminarExp = eliminarExp;

function recopilarExp() {
    const cards = document.querySelectorAll(".exp-card");

    expData = Array.from(cards).map(card => ({
        empresa: sanitizarString(card.querySelector(".exp-empresa")?.value || ""),
        cargo: sanitizarString(card.querySelector(".exp-cargo")?.value || ""),
        ano_experiencia: sanitizarNumero(card.querySelector(".exp-ano")?.value || ""),
        tiempo_laborado: sanitizarString(card.querySelector(".exp-tiempo")?.value || ""),
        salario: sanitizarString(card.querySelector(".exp-salario")?.value || ""),
        motivo_retiro: sanitizarString(card.querySelector(".exp-motivo")?.value || ""),
        funciones: sanitizarString(card.querySelector(".exp-funciones")?.value || "")
    })).filter(exp => exp.empresa || exp.cargo); // Filtrar vacíos

    return expData;
}

// =====================
// FAMILIARES DINÁMICOS
// =====================
const famList = document.getElementById("fam-list");
const btnAddFam = document.getElementById("btn-add-fam");

let familiaresData = [];

function crearCardFamiliar(index, data = {}) {
    const convivenVal = data.conviven_juntos !== undefined ? String(data.conviven_juntos) : "1";
    return `
        <div class="fam-card" data-index="${index}">
          <div class="fam-grid">
            <div class="field">
              <label>Nombre completo <span class="required">*</span></label>
              <input type="text" class="fam-nombre" value="${escapeHtml(data.nombre_completo || "")}" data-required="true">
              <div class="field-error" id="error-fam-nombre-${index}"></div>
            </div>
            <div class="field">
              <label>Parentesco <span class="required">*</span></label>
              <input type="text" class="fam-parentesco" value="${escapeHtml(data.parentesco || "")}" data-required="true">
              <div class="field-error" id="error-fam-parentesco-${index}"></div>
            </div>
            <div class="field">
              <label>Edad</label>
              <input type="number" class="fam-edad" min="0" max="120" value="${data.edad || ""}">
            </div>
            <div class="field">
              <label>Ocupación</label>
              <input type="text" class="fam-ocupacion" value="${escapeHtml(data.ocupacion || "")}">
            </div>
            <div class="field">
              <label>¿Conviven juntos?</label>
              <select class="fam-conviven">
                <option value="1" ${convivenVal === "1" ? "selected" : ""}>Sí</option>
                <option value="0" ${convivenVal === "0" ? "selected" : ""}>No</option>
              </select>
            </div>
          </div>
          <span class="fam-remove" onclick="eliminarFamiliar(${index})">🗑️ Eliminar</span>
        </div>
      `;
}

function renderFamiliares() {
    famList.innerHTML = "";
    familiaresData.forEach((item, index) => {
        famList.innerHTML += crearCardFamiliar(index, item);
    });
}

// Inicializar primer registro por defecto
if (Array.isArray(educacionData) && educacionData.length === 0) {
    educacionData.push({
        institucion: "",
        programa: "",
        nivel_escolaridad: "",
        modalidad: "",
        ano: "",
        finalizado: "1"
    });
    renderEducacion();
}

if (Array.isArray(expData) && expData.length === 0) {
    expData.push({
    empresa: "",
    cargo: "",
    ano_experiencia: "",
    tiempo_laborado: "",
    salario: "",
    motivo_retiro: "",
    funciones: ""
    });
    renderExp();
}

if (Array.isArray(familiaresData) && familiaresData.length === 0) {
    familiaresData.push({
        nombre_completo: "",
        parentesco: "",
        edad: "",
        ocupacion: "",
        conviven_juntos: "1"
    });
    renderFamiliares();
}

btnAddFam.addEventListener("click", () => {
    recopilarFamiliares();
    familiaresData.push({
        nombre_completo: "",
        parentesco: "",
        edad: "",
        ocupacion: "",
        conviven_juntos: "1"
    });
    renderFamiliares();
});

function eliminarFamiliar(index) {
    familiaresData.splice(index, 1);
    renderFamiliares();
}
window.eliminarFamiliar = eliminarFamiliar;

function recopilarFamiliares() {
    const cards = document.querySelectorAll(".fam-card");

    familiaresData = Array.from(cards).map(card => ({
        nombre_completo: sanitizarString(card.querySelector(".fam-nombre")?.value || ""),
        parentesco: sanitizarString(card.querySelector(".fam-parentesco")?.value || ""),
        edad: card.querySelector(".fam-edad")?.value || "",
        ocupacion: sanitizarString(card.querySelector(".fam-ocupacion")?.value || ""),
        conviven_juntos: card.querySelector(".fam-conviven")?.value || "1"
    })).filter(fam => fam.nombre_completo || fam.parentesco); // Filtrar vacíos

    return familiaresData;
}

// ========= Toggles de seguridad =========
function handleToggle(selectId, wrapperId) {
    const select = document.getElementById(selectId);
    const wrapper = document.getElementById(wrapperId);

    if (!select || !wrapper) return;

    select.addEventListener("change", () => {
        if (select.value === "1") {
            wrapper.classList.remove("hidden");
        } else {
            wrapper.classList.add("hidden");
            const inputs = wrapper.querySelectorAll("input, textarea");
            inputs.forEach(i => i.value = "");
        }
    });
}

handleToggle("seg_llamados", "detalle_llamados_wrap");
handleToggle("seg_accidente", "detalle_accidente_wrap");
handleToggle("seg_enfermedad", "detalle_enfermedad_wrap");
handleToggle("seg_alcohol", "detalle_alcohol_wrap");
handleToggle("seg_familiar", "detalle_familiar_wrap");

// ======== Función para ESCAPE HTML ========
// ✅ Función para escapar HTML en el frontend (para preview/cards)
function escapeHtml(str = "") {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ======== Función para PRELLENAR datos ========
async function rellenarFormulario(a) {
    try {
        console.log("rellenarFormulario - payload:", a);
        if (!a) return;

        if (!window.selectsLoaded) {
            window._pendingAspirante = a;
            document.addEventListener("selects-cargados", async () => {
                try {
                    await rellenarFormulario(window._pendingAspirante);
                } catch (err) {
                    console.error("Error rellenando tras selects-cargados:", err);
                } finally {
                    window._pendingAspirante = null;
                }
            }, { once: true });
            return;
        }

        const aspirante = a.aspirante || a;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value != null ? value : "";
        };

        if (aspirante) {
            set("primer_nombre", sanitizarString(aspirante.primer_nombre || ""));
            set("segundo_nombre", sanitizarString(aspirante.segundo_nombre || ""));
            set("primer_apellido", sanitizarString(aspirante.primer_apellido || ""));
            set("segundo_apellido", sanitizarString(aspirante.segundo_apellido || ""));
            set("correo_electronico", sanitizarString(aspirante.correo_electronico || ""));
            set("telefono", sanitizarNumero(aspirante.telefono || ""));
            set("direccion_barrio", sanitizarString(aspirante.direccion_barrio || ""));
            set("estado_civil", aspirante.estado_civil || "");
            set("eps", aspirante.eps || "");
            set("afp", aspirante.afp || "");
            set("rh", aspirante.rh || "");
            set("talla_pantalon", aspirante.talla_pantalon || "");
            set("camisa_talla", aspirante.camisa_talla || "");
            set("zapatos_talla", aspirante.zapatos_talla || "");

            set("fecha_nacimiento", aspirante.fecha_nacimiento ? aspirante.fecha_nacimiento.split("T")[0] : "");
            if (fechaNacimientoInput) {
                edadInput.value = calcularEdadDesdeFecha(fechaNacimientoInput.value);
            }
            set("fecha_expedicion", aspirante.fecha_expedicion ? aspirante.fecha_expedicion.split("T")[0] : "");

            rellenarFotoDesdeAspirante(aspirante);
        }

        // Departamentos y ciudades
        if (aspirante && aspirante.departamento_expedicion) {
            set("departamento_expedicion", aspirante.departamento_expedicion);
            if (typeof cargarCiudades === "function") {
                await cargarCiudades("departamento_expedicion", "ciudad_expedicion");
                set("ciudad_expedicion", aspirante.ciudad_expedicion || "");
            }
        }

        if (aspirante && (aspirante.departamento || aspirante.departamento_residencia)) {
            const depResid = aspirante.departamento || aspirante.departamento_residencia || "";
            set("departamento_residencia", depResid);
            if (typeof cargarCiudades === "function") {
                await cargarCiudades("departamento_residencia", "ciudad_residencia");
                set("ciudad_residencia", aspirante.ciudad || aspirante.ciudad_residencia || "");
            }
        }

        // Tipo de documento e identificacion
        const identEl = document.getElementById("identificacion");
        if (identEl && !identEl.value && aspirante.identificacion) {
            identEl.value = sanitizarNumero(aspirante.identificacion);
        }
        const tipoEl = document.getElementById("tipo_documento");
        if (tipoEl && !tipoEl.value && aspirante.tipo_documento) {
            tipoEl.value = aspirante.tipo_documento;
        }

        // Educación
        const educ = Array.isArray(a.educacion) ? a.educacion : (a.educacion || []);
        if (educ.length > 0) {
            educacionData = educ.map(e => ({
                institucion: sanitizarString(e.institucion || ""),
                programa: sanitizarString(e.programa || ""),
                nivel_escolaridad: e.nivel_escolaridad || "",
                modalidad: e.modalidad || "",
                ano: e.ano || "",
                finalizado: (typeof e.finalizado !== "undefined" && e.finalizado !== null) ? String(e.finalizado) : "1"
            }));
        } else {
            if (!educacionData || educacionData.length === 0) {
                educacionData = [{
                    institucion: "",
                    programa: "",
                    nivel_escolaridad: "",
                    modalidad: "",
                    ano: "",
                    finalizado: "1"
                }];
            }
        }
        renderEducacion();

        // Experiencia
        const exp = Array.isArray(a.experiencia_laboral) ? a.experiencia_laboral : (a.experiencia_laboral || []);
        if (exp.length > 0) {
            expData = exp.map(x => ({
                empresa: sanitizarString(x.empresa || ""),
                cargo: sanitizarString(x.cargo || ""),
                ano_experiencia: x.ano_experiencia || "",
                tiempo_laborado: sanitizarString(x.tiempo_laborado || ""),
                salario: sanitizarString(x.salario || ""),
                motivo_retiro: sanitizarString(x.motivo_retiro || ""),
                funciones: sanitizarString(x.funciones || "")
            }));
        } else if (!expData || expData.length === 0) {
            expData = [{ empresa: "", cargo: "", tiempo_laborado: "", salario: "", motivo_retiro: "", funciones: "" }];
        }
        renderExp();

        // Familiares
        const fam = Array.isArray(a.familiares) ? a.familiares : (a.familiares || []);
        if (fam.length > 0) {
            familiaresData = fam.map(f => ({
                nombre_completo: sanitizarString(f.nombre_completo || ""),
                parentesco: sanitizarString(f.parentesco || ""),
                edad: f.edad || "",
                ocupacion: sanitizarString(f.ocupacion || ""),
                conviven_juntos: (typeof f.conviven_juntos !== "undefined" && f.conviven_juntos !== null) ? String(f.conviven_juntos) : "1"
            }));
        } else if (!familiaresData || familiaresData.length === 0) {
            familiaresData = [{ nombre_completo: "", parentesco: "", edad: "", ocupacion: "", conviven_juntos: "1" }];
        }
        renderFamiliares();

        // Referencias
        const refs = Array.isArray(a.referencias) ? a.referencias : (a.referencias || []);
        if (refs.length > 0) {
            refs.forEach(r => {
                const tipo = (r.tipo_referencia || "").toLowerCase();
                if (tipo === "laboral") {
                    set("ref_lab_empresa", sanitizarString(r.empresa || ""));
                    set("ref_lab_jefe", sanitizarString(r.jefe_inmediato || ""));
                    set("ref_lab_cargo", sanitizarString(r.cargo_jefe || ""));
                    set("ref_lab_tel", sanitizarNumero(r.telefono || ""));
                } else if (tipo === "familiar") {
                    set("ref_fam_nombre", sanitizarString(r.nombre_completo || ""));
                    set("ref_fam_parentesco", sanitizarString(r.parentesco || r.relacion || ""));
                    set("ref_fam_tel", sanitizarNumero(r.telefono || ""));
                    set("ref_fam_ocupacion", sanitizarString(r.ocupacion || ""));
                } else if (tipo === "personal") {
                    set("ref_per_nombre", sanitizarString(r.nombre_completo || ""));
                    set("ref_per_relacion", sanitizarString(r.relacion || ""));
                    set("ref_per_tel", sanitizarNumero(r.telefono || ""));
                    set("ref_per_ocupacion", sanitizarString(r.ocupacion || ""));
                }
            });
        }

        // Contacto de emergencia
        if (a.contacto_emergencia) {
            set("emer_nombre", sanitizarString(a.contacto_emergencia.nombre_completo || ""));
            set("emer_parentesco", sanitizarString(a.contacto_emergencia.parentesco || ""));
            set("emer_telefono", sanitizarNumero(a.contacto_emergencia.telefono || ""));
            set("emer_correo", sanitizarString(a.contacto_emergencia.correo_electronico || ""));
            set("emer_direccion", sanitizarString(a.contacto_emergencia.direccion || ""));
        }

        // Metas personales
        if (a.metas_personales) {
            set("meta_corto", sanitizarString(a.metas_personales.meta_corto_plazo || ""));
            set("meta_mediano", sanitizarString(a.metas_personales.meta_mediano_plazo || ""));
            set("meta_largo", sanitizarString(a.metas_personales.meta_largo_plazo || ""));
        }

        // Seguridad / cuestionario
        if (a.seguridad) {
            const s = a.seguridad;
            if (typeof s.llamados_atencion !== "undefined") {
                document.getElementById("seg_llamados").value = String(s.llamados_atencion || 0);
                if (s.llamados_atencion == 1) document.getElementById("detalle_llamados_wrap").classList.remove("hidden");
                set("seg_detalle_llamados", sanitizarString(s.detalle_llamados || ""));
            }
            if (typeof s.accidente_laboral !== "undefined") {
                document.getElementById("seg_accidente").value = String(s.accidente_laboral || 0);
                if (s.accidente_laboral == 1) document.getElementById("detalle_accidente_wrap").classList.remove("hidden");
                set("seg_detalle_accidente", sanitizarString(s.detalle_accidente || ""));
            }
            if (typeof s.enfermedad_importante !== "undefined") {
                document.getElementById("seg_enfermedad").value = String(s.enfermedad_importante || 0);
                if (s.enfermedad_importante == 1) document.getElementById("detalle_enfermedad_wrap").classList.remove("hidden");
                set("seg_detalle_enfermedad", sanitizarString(s.detalle_enfermedad || ""));
            }
            if (typeof s.consume_alcohol !== "undefined") {
                document.getElementById("seg_alcohol").value = String(s.consume_alcohol || 0);
                if (s.consume_alcohol == 1) document.getElementById("detalle_alcohol_wrap").classList.remove("hidden");
                set("seg_frecuencia", sanitizarString(s.frecuencia_alcohol || ""));
            }
            if (typeof s.familiar_en_empresa !== "undefined") {
                document.getElementById("seg_familiar").value = String(s.familiar_en_empresa || 0);
                if (s.familiar_en_empresa == 1) document.getElementById("detalle_familiar_wrap").classList.remove("hidden");
                set("seg_familiar_nombre", sanitizarString(s.detalle_familiar_empresa || ""));
            }
            set("seg_observaciones", sanitizarString(s.observaciones || ""));
            set("seg_califica", sanitizarString(s.califica_para_cargo || ""));
            set("seg_fortal", sanitizarString(s.fortalezas || ""));
            set("seg_mejorar", sanitizarString(s.aspectos_mejorar || ""));
            set("seg_resolucion", sanitizarString(s.resolucion_problemas || ""));
            if (typeof s.info_falsa !== "undefined") document.getElementById("seg_falsa").value = String(s.info_falsa || 0);
            if (typeof s.acepta_poligrafo !== "undefined") document.getElementById("seg_poligrafo").value = String(s.acepta_poligrafo || 0);
        }

        console.log("rellenarFormulario completado");
    } catch (err) {
        console.error("Error en rellenarFormulario:", err);
    }
}

// Medio de reclutamiento → mostrar campo recomendador
medioSelect.addEventListener("change", () => {
    const value = medioSelect.value;
    const needsRecomendador = value === "recomendado" || value === "empleado_interno";
    campoRecomendador.classList.toggle("hidden", !needsRecomendador);

    // Limpiar errores al cambiar
    document.getElementById("error-medio_reclutamiento").textContent = "";
    medioSelect.classList.remove('error');
});

function calcularEdadDesdeFecha(value) {
    if (!value) return "";
    const parts = String(value).split("T")[0].split("-");
    if (parts.length < 3) return "";
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const birth = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age >= 18 ? String(age) : ""; // Solo mostrar si es mayor de edad
}

if (fechaNacimientoInput) {
    fechaNacimientoInput.addEventListener("change", () => {
        const value = fechaNacimientoInput.value;
        edadInput.value = calcularEdadDesdeFecha(value);

        // Limpiar errores al cambiar
        document.getElementById("error-fecha_nacimiento").textContent = "";
        fechaNacimientoInput.classList.remove('error');
    });
}

// Navegación
btnPrev.addEventListener("click", () => {
    if (currentStep > 0) {
        showStep(currentStep - 1);
    }
});

btnNext.addEventListener("click", async () => {
    // 1. Verificación de seguridad para el primer paso (Ingreso)
    if (currentStep === 0) {
        // Validación técnica: ¿Cargaron los datos de la API?
        if (tipoDocumentoIngreso && tipoDocumentoIngreso.options.length <= 1) {
            alert("❌ Los datos de configuración no han cargado correctamente debido a una falla en tu conexión. Por favor, refresca la página e intenta de nuevo.");
            return;
        }

        const ok = await validarIngreso(); // Tu lógica original que consulta si existe el aspirante
        if (!ok) return;

        const tipo = typeof sanitizarString === "function" ? sanitizarString(tipoDocumentoIngreso.value) : tipoDocumentoIngreso.value;
        const id = typeof sanitizarNumero === "function" ? sanitizarNumero(identificacionIngreso.value) : identificacionIngreso.value;

        sessionStorage.setItem("tipo_ingreso", tipo);
        sessionStorage.setItem("id_ingreso", id);

        if (typeof updateIngresoLabel === "function") {
            updateIngresoLabel();
        }

        // Pequeño delay para asegurar que los datos cargados en validarIngreso se pinten en el DOM
        setTimeout(() => {
            if (!validateStep(currentStep)) return;
            if (currentStep < steps.length - 1) {
                currentStep++; // Actualizamos la variable global
                showStep(currentStep);
            }
        }, 300);
        return;
    }

    // 2. Lógica para el resto de los pasos
    if (!validateStep(currentStep)) {
    console.warn("Faltan campos obligatorios en el paso " + currentStep);
    return;
    }

    if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
    }
});

// Reemplaza COMPLETA la función buildPreview() por esta versión:
function buildPreview() {
    const wrap = document.getElementById("preview-container");
    if (!wrap) return;

    // refrescar arreglos desde UI
    recopilarEducacion();
    recopilarExp();
    recopilarFamiliares();

    const v = (id) => {
        const el = document.getElementById(id);
        return el ? (el.value || "").trim() : "";
    };

    const siNoTxt = (val) => (String(val) === "1" ? "Sí" : "No");

    const nombreCompleto = [v("primer_nombre"), v("segundo_nombre"), v("primer_apellido"), v("segundo_apellido")]
        .filter(Boolean)
        .join(" ");

    const ciudadResidencia = [v("ciudad_residencia"), v("departamento_residencia")]
        .filter(Boolean)
        .join(" - ");

    // Foto: tomamos lo que se guarda en hidden
    const fotoUrl = (document.getElementById("hidden_foto_public_url")?.value || "").trim();

    // Educación/Exp/Fam render simples
    // REEMPLAZA renderLista dentro de buildPreview() por esta:
    // ✅ renderLista consistente con CSS preview (mejor en móvil)
        const renderLista = (items, renderItem, empty = "No registrado") => {
        if (!Array.isArray(items) || items.length === 0) {
            return `
            <div class="preview-row">
                <div class="preview-label"></div>
                <div class="preview-value" style="text-align:left;flex:1">${escapeHtml(empty)}</div>
            </div>
            `;
        }

        return items.map((it, i) => `
            <div class="preview-row">
            <div class="preview-label">${i + 1}.</div>
            <div class="preview-value" style="text-align:left;flex:1">${renderItem(it)}</div>
            </div>
        `).join("");
        };

    // Referencias
    const refs = [
        {
            tipo_referencia: "Laboral",
            empresa: v("ref_lab_empresa"),
            jefe_inmediato: v("ref_lab_jefe"),
            cargo_jefe: v("ref_lab_cargo"),
            telefono: v("ref_lab_tel"),
        },
        {
            tipo_referencia: "Familiar",
            nombre_completo: v("ref_fam_nombre"),
            parentesco: v("ref_fam_parentesco"),
            telefono: v("ref_fam_tel"),
            ocupacion: v("ref_fam_ocupacion"),
        },
        {
            tipo_referencia: "Personal",
            nombre_completo: v("ref_per_nombre"),
            relacion: v("ref_per_relacion"),
            telefono: v("ref_per_tel"),
            ocupacion: v("ref_per_ocupacion"),
        },
    ].filter(r => Object.values(r).some(x => (x || "").trim() !== ""));

    // Cuestionario
    const cuestionario = [
        ["Llamados de atención", siNoTxt(v("seg_llamados")), v("seg_detalle_llamados")],
        ["Accidente laboral", siNoTxt(v("seg_accidente")), v("seg_detalle_accidente")],
        ["Enfermedad importante", siNoTxt(v("seg_enfermedad")), v("seg_detalle_enfermedad")],
        ["Consume alcohol", siNoTxt(v("seg_alcohol")), v("seg_frecuencia")],
        ["Familiar en la empresa", siNoTxt(v("seg_familiar")), v("seg_familiar_nombre")],
        ["Info falsa", siNoTxt(v("seg_falsa")), ""],
        ["Acepta polígrafo", (String(v("seg_poligrafo")) === "1" ? "Sí" : "No"), ""],
    ];

    const bloqueDatosPersonales = `
      <div class="preview-section">
        <details open>
          <summary>Datos personales <span class="preview-pill">Obligatorio</span></summary>
          <div class="preview-content">
            ${fotoUrl ? `<div style="margin:8px 0"><img src="${fotoUrl}" alt="Foto" style="max-height:120px;border-radius:12px;border:1px solid #ddd"/></div>` : ""}
            <div class="preview-row"><div class="preview-label">Nombre completo</div><div class="preview-value">${escapeHtml(nombreCompleto) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Identificación</div><div class="preview-value">${escapeHtml(v("identificacion")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Fecha nacimiento</div><div class="preview-value">${escapeHtml(v("fecha_nacimiento")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Edad</div><div class="preview-value">${escapeHtml(v("edad")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Ciudad de residencia</div><div class="preview-value">${escapeHtml(ciudadResidencia) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Teléfono</div><div class="preview-value">${escapeHtml(v("telefono")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Correo</div><div class="preview-value">${escapeHtml(v("correo_electronico")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">EPS</div><div class="preview-value">${escapeHtml(v("eps")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">AFP</div><div class="preview-value">${escapeHtml(v("afp")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">RH</div><div class="preview-value">${escapeHtml(v("rh")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Talla camisa</div><div class="preview-value">${escapeHtml(v("camisa_talla")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Talla pantalón</div><div class="preview-value">${escapeHtml(v("talla_pantalon")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Talla zapatos</div><div class="preview-value">${escapeHtml(v("zapatos_talla")) || "-"}</div></div>
          </div>
        </details>
      </div>
    `;

    const bloqueMedio = `
      <div class="preview-section">
        <details>
          <summary>Medio de reclutamiento</summary>
          <div class="preview-content">
            <div class="preview-row"><div class="preview-label">Medio</div><div class="preview-value">${escapeHtml(v("medio_reclutamiento")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Recomendador</div><div class="preview-value">${escapeHtml(v("recomendador_aspirante")) || "-"}</div></div>
          </div>
        </details>
      </div>
    `;

    const bloqueEducacion = `
      <div class="preview-section">
        <details>
          <summary>Educación <span class="preview-pill">${educacionData.length}</span></summary>
          ${renderLista(educacionData, (e) => `
            <b>${escapeHtml(e.institucion || "-")}</b> — ${escapeHtml(e.programa || "-")}
            <div style="color:#555;font-size:.82rem">
              Nivel: ${escapeHtml(e.nivel_escolaridad || "-")} | Modalidad: ${escapeHtml(e.modalidad || "-")} | Año: ${escapeHtml(e.ano || "-")} | Finalizado: ${escapeHtml(String(e.finalizado ?? ""))}
            </div>
          `)}
        </details>
      </div>
    `;

    const bloqueExp = `
      <div class="preview-section">
        <details>
          <summary>Experiencia <span class="preview-pill">${expData.length}</span></summary>
          ${renderLista(expData, (x) => `
            <b>${escapeHtml(x.empresa || "-")}</b> — ${escapeHtml(x.cargo || "-")}
            <div style="color:#555;font-size:.82rem">
              Año inicio: ${escapeHtml(x.ano_experiencia || "-")} | Tiempo: ${escapeHtml(x.tiempo_laborado || "-")} | Salario: ${escapeHtml(x.salario || "-")}
            </div>
            <div style="color:#555;font-size:.82rem">Motivo retiro: ${escapeHtml(x.motivo_retiro || "-")}</div>
            <div style="color:#333;font-size:.82rem">Funciones: ${escapeHtml(x.funciones || "-")}</div>
          `)}
        </details>
      </div>
    `;

    const bloqueFam = `
      <div class="preview-section">
        <details>
          <summary>Familiares <span class="preview-pill">${familiaresData.length}</span></summary>
          ${renderLista(familiaresData, (f) => `
            <b>${escapeHtml(f.nombre_completo || "-")}</b> — ${escapeHtml(f.parentesco || "-")}
            <div style="color:#555;font-size:.82rem">
              Edad: ${escapeHtml(String(f.edad || "-"))} | Ocupación: ${escapeHtml(f.ocupacion || "-")} | Conviven: ${escapeHtml(String(f.conviven_juntos ?? "-"))}
            </div>
          `)}
        </details>
      </div>
    `;

    const bloqueRefs = `
      <div class="preview-section">
        <details>
          <summary>Referencias <span class="preview-pill">${refs.length}</span></summary>
          ${renderLista(refs, (r) => `
            <b>${escapeHtml(r.tipo_referencia || "-")}</b>
            <div style="color:#555;font-size:.82rem">
              ${r.empresa ? `Empresa: ${escapeHtml(r.empresa)} | ` : ""}
              ${r.jefe_inmediato ? `Jefe: ${escapeHtml(r.jefe_inmediato)} | ` : ""}
              ${r.cargo_jefe ? `Cargo: ${escapeHtml(r.cargo_jefe)} | ` : ""}
              ${r.nombre_completo ? `Nombre: ${escapeHtml(r.nombre_completo)} | ` : ""}
              ${r.parentesco ? `Parentesco: ${escapeHtml(r.parentesco)} | ` : ""}
              ${r.relacion ? `Relación: ${escapeHtml(r.relacion)} | ` : ""}
              ${r.ocupacion ? `Ocupación: ${escapeHtml(r.ocupacion)} | ` : ""}
              ${r.telefono ? `Tel: ${escapeHtml(r.telefono)}` : ""}
            </div>
          `)}
        </details>
      </div>
    `;

    const bloqueEmer = `
      <div class="preview-section">
        <details>
          <summary>Contacto de emergencia</summary>
          <div class="preview-content">
            <div class="preview-row"><div class="preview-label">Nombre</div><div class="preview-value">${escapeHtml(v("emer_nombre")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Parentesco</div><div class="preview-value">${escapeHtml(v("emer_parentesco")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Teléfono</div><div class="preview-value">${escapeHtml(v("emer_telefono")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Correo</div><div class="preview-value">${escapeHtml(v("emer_correo")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Dirección</div><div class="preview-value">${escapeHtml(v("emer_direccion")) || "-"}</div></div>
          </div>
        </details>
      </div>
    `;

    const bloqueMetas = `
      <div class="preview-section">
        <details>
          <summary>Metas personales</summary>
          <div class="preview-content">
            <div class="preview-row"><div class="preview-label">Corto plazo</div><div class="preview-value">${escapeHtml(v("meta_corto")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Mediano plazo</div><div class="preview-value">${escapeHtml(v("meta_mediano")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Largo plazo</div><div class="preview-value">${escapeHtml(v("meta_largo")) || "-"}</div></div>
          </div>
        </details>
      </div>
    `;

    const bloqueSeg = `
      <div class="preview-section">
        <details>
          <summary>Cuestionario y seguridad</summary>
          <div class="preview-content">
            ${cuestionario.map(([titulo, val, detalle]) => `
              <div class="preview-row">
                <div class="preview-label">${escapeHtml(titulo)}</div>
                <div class="preview-value">${escapeHtml(val || "-")}</div>
              </div>
              ${detalle ? `<div class="preview-row"><div class="preview-label">Detalle</div><div class="preview-value">${escapeHtml(detalle)}</div></div>` : ""}
            `).join("")}

            <div class="preview-row"><div class="preview-label">Observaciones</div><div class="preview-value">${escapeHtml(v("seg_observaciones")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Por qué califica</div><div class="preview-value">${escapeHtml(v("seg_califica")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Fortalezas</div><div class="preview-value">${escapeHtml(v("seg_fortal")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Aspectos por mejorar</div><div class="preview-value">${escapeHtml(v("seg_mejorar")) || "-"}</div></div>
            <div class="preview-row"><div class="preview-label">Resolución de problemas</div><div class="preview-value">${escapeHtml(v("seg_resolucion")) || "-"}</div></div>
          </div>
        </details>
      </div>
    `;

    // REEMPLAZA el wrap.innerHTML actual por este:
        wrap.innerHTML =
        bloqueDatosPersonales +
        bloqueMedio +
        bloqueEducacion +
        bloqueExp +
        bloqueFam +
        bloqueRefs +
        bloqueEmer +
        bloqueMetas +
        bloqueSeg;
}

// ======= Foto de perfil (MEJORADO: opcional + auto-subida) =======
const photoInput = document.getElementById("photo_input");
const btnUploadPhoto = document.getElementById("btn-upload-photo");
const btnRemovePhoto = document.getElementById("btn-remove-photo");
const photoImg = document.getElementById("photo-img");
const photoPlaceholder = document.getElementById("photo-placeholder");
const photoStatus = document.getElementById("photo-status");

// Estado: evita avanzar/enviar mientras una subida esté en curso
let photoUploading = false;

function ensureFotoHiddenInputs() {
  const formEl = document.getElementById("hv-form");
  if (!formEl) return {};
  let hidPath = document.getElementById("hidden_foto_gcs_path");
  if (!hidPath) {
    hidPath = document.createElement("input");
    hidPath.type = "hidden";
    hidPath.id = "hidden_foto_gcs_path";
    hidPath.name = "foto_gcs_path";
    formEl.appendChild(hidPath);
  }
  let hidUrl = document.getElementById("hidden_foto_public_url");
  if (!hidUrl) {
    hidUrl = document.createElement("input");
    hidUrl.type = "hidden";
    hidUrl.id = "hidden_foto_public_url";
    hidUrl.name = "foto_public_url";
    formEl.appendChild(hidUrl);
  }
  return { hidPath, hidUrl };
}

function getFotoHidden() {
  const hidPath = document.getElementById("hidden_foto_gcs_path");
  const hidUrl = document.getElementById("hidden_foto_public_url");
  return {
    gcsPath: (hidPath?.value || "").trim(),
    publicUrl: (hidUrl?.value || "").trim()
  };
}

function isFotoSeleccionadaLocal() {
  return Boolean(photoInput && photoInput.files && photoInput.files.length > 0);
}

function setPhotoPreview(url, gcsPath = "") {
  const { hidPath, hidUrl } = ensureFotoHiddenInputs();

  if (url) {
    photoImg.src = url;
    photoImg.style.display = "block";
    photoPlaceholder.style.display = "none";
    btnRemovePhoto.classList.remove("hidden");
    if (hidPath) hidPath.value = gcsPath || "";
    if (hidUrl) hidUrl.value = url || "";
  } else {
    photoImg.src = "";
    photoImg.style.display = "none";
    photoPlaceholder.style.display = "block";
    btnRemovePhoto.classList.add("hidden");
    if (hidPath) hidPath.value = "";
    if (hidUrl) hidUrl.value = "";
  }
}

function clearPhotoLocal() {
  setPhotoPreview("", "");
  if (photoStatus) photoStatus.textContent = "";
  if (photoInput) photoInput.value = "";
  const err = document.getElementById("error-photo");
  if (err) err.textContent = "";
}

function setUploadingState(isUploading, msg = "") {
  photoUploading = isUploading;

  if (photoStatus) photoStatus.textContent = msg || (isUploading ? "Subiendo foto..." : "");
  if (btnUploadPhoto) btnUploadPhoto.disabled = isUploading;

  // UX: no bloqueamos toda la navegación global aquí porque depende de tu flujo,
  // pero puedes bloquear Next/Submit en tus handlers con `if (photoUploading) return;`
}

// ✅ Validación: foto opcional.
// Solo bloquea si el usuario seleccionó un archivo local y aún no se ha subido.
function validarFotoSiAplica() {
  const err = document.getElementById("error-photo");
  const { gcsPath } = getFotoHidden();

  if (!isFotoSeleccionadaLocal()) {
    // No seleccionó archivo: NO es obligatoria
    if (err) err.textContent = "";
    return true;
  }

  // Seleccionó archivo: exige que ya esté subida a GCS (hidPath lleno)
  if (!gcsPath) {
    if (err) err.textContent = "La foto está seleccionada pero aún no se ha subido. Espera un momento.";
    return false;
  }

  if (err) err.textContent = "";
  return true;
}

async function uploadPhoto() {
  const file = photoInput.files && photoInput.files[0];

  let identificacionVal = (document.getElementById("identificacion")?.value || "").trim();
  if (!identificacionVal) identificacionVal = sessionStorage.getItem("id_ingreso") || "";

  if (!identificacionVal) throw new Error("Primero ingresa número de identificación (Paso 0).");
  if (!file) throw new Error("Selecciona un archivo antes de subir.");

  // Validaciones
  if (!file.type.startsWith("image/")) throw new Error("Sólo se aceptan imágenes (jpg/png).");
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error("La imagen excede el límite de 5 MB.");

  setUploadingState(true, "Subiendo foto...");

  try {
    const formData = new FormData();
    formData.append("identificacion", identificacionVal);
    formData.append("photo", file);

    const resp = await fetch(`${API_URL_BASE}/hv/upload-photo`, {
      method: "POST",
      body: formData
    });

    const contentType = resp.headers.get("content-type") || "";
    let result;
    if (contentType.includes("application/json")) {
      result = await resp.json();
    } else {
      const text = await resp.text();
      throw new Error(`Respuesta no-JSON del servidor (HTTP ${resp.status}). Inicio: ${text.slice(0, 120)}`);
    }

    if (!resp.ok) {
      throw new Error(result?.error || "Error subiendo la foto");
    }

    const { foto_gcs_path, foto_public_url } = result;
    setPhotoPreview(foto_public_url || "", foto_gcs_path || "");
    setUploadingState(false, "Foto subida correctamente.");

    const err = document.getElementById("error-photo");
    if (err) err.textContent = "";

    return result;
  } catch (e) {
    console.error("uploadPhoto error:", e);
    setUploadingState(false, "Error al subir la foto.");
    throw e;
  } finally {
    // Si quieres reintento manual, puedes volver a habilitar el botón aquí.
    // (ya se habilita en setUploadingState(false))
  }
}

// 🔁 Auto-subida al seleccionar archivo (reemplaza el flujo “selecciona y luego presiona subir”)
if (photoInput) {
  photoInput.addEventListener("change", async () => {
    const f = photoInput.files && photoInput.files[0];
    if (!f) return;

    // Preview local SIN base64 (solo visual)
    const localUrl = URL.createObjectURL(f);
    photoImg.src = localUrl;
    photoImg.style.display = "block";
    photoPlaceholder.style.display = "none";
    btnRemovePhoto.classList.remove("hidden");

    // Limpiar hidden (evita inconsistencias si había una foto previa)
    const { hidPath, hidUrl } = ensureFotoHiddenInputs();
    if (hidPath) hidPath.value = "";
    if (hidUrl) hidUrl.value = "";

    // Auto-subir
    try {
      await uploadPhoto();
    } catch (err) {
      alert("Error subiendo la foto: " + (err?.message || err));
      // dejamos el preview local, pero hidden queda vacío => no se enviará como foto en HV
      // si deseas, aquí puedes limpiar todo:
      // clearPhotoLocal();
    }
  });
}

// Botón de subir: lo dejamos como "reintentar" si falló la auto-subida (opcional)
if (btnUploadPhoto) {
  btnUploadPhoto.addEventListener("click", async () => {
    try {
      await uploadPhoto();
    } catch (err) {
      alert("Error subiendo la foto: " + (err?.message || err));
    }
  });

  // Si quieres ocultarlo siempre:
  // btnUploadPhoto.classList.add("hidden");
}

// Modal de eliminación de foto (local)
if (btnRemovePhoto) {
  const modalBackdrop = document.getElementById("deletePhotoModalBackdrop");
  const modalCancel = document.getElementById("deleteModalCancel");
  const modalConfirm = document.getElementById("deleteModalConfirm");

  btnRemovePhoto.addEventListener("click", () => {
    if (!modalBackdrop) {
      if (!confirm("¿Está seguro de eliminar esta foto?")) return;
      clearPhotoLocal();
      return;
    }
    modalBackdrop.classList.add("visible");
    modalBackdrop.setAttribute("aria-hidden", "false");
    if (modalConfirm) modalConfirm.focus();
  });

  if (modalCancel) {
    modalCancel.addEventListener("click", () => {
      modalBackdrop.classList.remove("visible");
      modalBackdrop.setAttribute("aria-hidden", "true");
      btnRemovePhoto.focus();
    });
  }

  if (modalConfirm) {
    modalConfirm.addEventListener("click", async () => {
        try {
        if (modalBackdrop) {
            modalBackdrop.classList.remove("visible");
            modalBackdrop.setAttribute("aria-hidden", "true");
        }

        // Identificación para borrar en servidor
        let identificacionVal = (document.getElementById("identificacion")?.value || "").trim();
        if (!identificacionVal) identificacionVal = sessionStorage.getItem("id_ingreso") || "";

        if (!identificacionVal) {
            clearPhotoLocal(); // al menos limpia local
            alert("Foto eliminada de la vista. No se pudo eliminar del servidor porque no hay identificación.");
            return;
        }

        // Solo intentar borrar en servidor si hay una foto “guardada”
        const hidPath = document.getElementById("hidden_foto_gcs_path");
        const hidUrl = document.getElementById("hidden_foto_public_url");
        const tieneFotoGuardada = Boolean((hidPath?.value || "").trim() || (hidUrl?.value || "").trim());

        if (tieneFotoGuardada) {
            photoStatus.textContent = "Eliminando foto...";
            const resp = await fetch(`${API_URL_BASE}/hv/foto/${encodeURIComponent(identificacionVal)}`, {
            method: "DELETE"
            });

            const contentType = resp.headers.get("content-type") || "";
            const result = contentType.includes("application/json") ? await resp.json() : { ok: false };

            if (!resp.ok || !result.ok) {
            throw new Error(result?.error || `No se pudo eliminar la foto (HTTP ${resp.status})`);
            }
        }

        // Limpieza final local
        clearPhotoLocal();
        photoStatus.textContent = "Foto eliminada.";
        } catch (err) {
        console.error("Error eliminando foto:", err);
        alert("No se pudo eliminar la foto del servidor: " + (err?.message || err));
        photoStatus.textContent = "Error al eliminar.";
        } finally {
        btnRemovePhoto.focus();
        }
    });
    }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalBackdrop && modalBackdrop.classList.contains("visible")) {
      modalBackdrop.classList.remove("visible");
      modalBackdrop.setAttribute("aria-hidden", "true");
      btnRemovePhoto.focus();
    }
  });

  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) {
        modalBackdrop.classList.remove("visible");
        modalBackdrop.setAttribute("aria-hidden", "true");
        btnRemovePhoto.focus();
      }
    });
  }
}

function rellenarFotoDesdeAspirante(aspirante) {
  try {
    if (!aspirante) return;
    const url = aspirante.foto_public_url || aspirante.foto_url || null;
    const gcsPath = aspirante.foto_gcs_path || null;

    if (url) {
      setPhotoPreview(url, gcsPath || "");
      if (photoStatus) photoStatus.textContent = "Foto cargada previamente.";
    } else {
      clearPhotoLocal();
    }
  } catch (err) {
    console.error("rellenarFotoDesdeAspirante error:", err);
  }
}

// RESET del formulario
function resetFormToInitialState() {
    try {
        sessionStorage.removeItem("tipo_ingreso");
        sessionStorage.removeItem("id_ingreso");
        sessionStorage.removeItem("firma_temp");

        const hidTipo = document.getElementById("hidden_tipo_documento");
        if (hidTipo) hidTipo.remove();
        const hidId = document.getElementById("hidden_identificacion");
        if (hidId) hidId.remove();

        const tipoMain = document.getElementById("tipo_documento");
        if (tipoMain) {
            tipoMain.removeAttribute("disabled");
            tipoMain.value = "";
        }
        const identMain = document.getElementById("identificacion");
        if (identMain) {
            identMain.removeAttribute("readonly");
            identMain.value = "";
        }

        const tipoIngreso = document.getElementById("tipo_documento_ingreso");
        if (tipoIngreso) tipoIngreso.value = "";
        const identIngreso = document.getElementById("identificacion_ingreso");
        if (identIngreso) {
            identIngreso.value = "";
            identIngreso.focus();
        }

        if (form) form.reset();

        const ciudadExp = document.getElementById("ciudad_expedicion");
        const ciudadRes = document.getElementById("ciudad_residencia");
        if (ciudadExp) ciudadExp.innerHTML = `<option value="">Selecciona...</option>`;
        if (ciudadRes) ciudadRes.innerHTML = `<option value="">Selecciona...</option>`;

        educacionData = [{
            institucion: "",
            programa: "",
            nivel_escolaridad: "",
            modalidad: "",
            ano: "",
            finalizado: "1"
        }];
        expData = [{
            empresa: "",
            cargo: "",
            tiempo_laborado: "",
            salario: "",
            motivo_retiro: "",
            funciones: ""
        }];
        familiaresData = [{
            nombre_completo: "",
            parentesco: "",
            edad: "",
            ocupacion: "",
            conviven_juntos: "1"
        }];

        renderEducacion();
        renderExp();
        renderFamiliares();

        document.getElementById("ingreso-msg").textContent = "";
        const preview = document.getElementById("preview-container");
        if (preview) preview.innerHTML = "";

        showStep(0);

        clearPhotoLocal();
        const hidFotoPath = document.getElementById("hidden_foto_gcs_path");
        if (hidFotoPath) hidFotoPath.remove();
        const hidFotoUrl = document.getElementById("hidden_foto_public_url");
        if (hidFotoUrl) hidFotoUrl.remove();

        // Limpiar todos los errores
        limpiarErroresCampo();

        console.log("Formulario reseteado correctamente.");
    } catch (err) {
        console.error("Error al resetear formulario:", err);
    }
}

// Submit final - VERSIÓN MEJORADA
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpiar resumen de errores previo
    const resumenError = document.getElementById("resumen-errores");
    if (resumenError) {
        resumenError.textContent = "";
        resumenError.style.display = "none";
    }

    if (form.dataset.submitting === "1") return;
    form.dataset.submitting = "1";

    const originalSubmitHtml = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnNext.disabled = true;
    btnPrev.disabled = true;
    btnSubmit.innerHTML = "Enviando... No cierre la ventana";

    try {
        // 1. Validar campos obligatorios finales
        if (!validateStep(currentStep)) {
            throw new Error("Hay campos obligatorios sin completar en este paso.");
        }

        // ✅ Foto opcional: solo bloquear si hay foto seleccionada y aún NO terminó la subida
        if (!validarFotoSiAplica()) {
        throw new Error("Seleccionaste una foto, pero aún se está subiendo. Espera un momento o elimina la foto para continuar.");
        }
        // 2. Validar firma (Crucial para estabilidad en móviles)
        const firmaGuardada = sessionStorage.getItem('firma_temp');
        if (!firmaGuardada || firmaGuardada.length <= 200) {
            const errorFirma = document.getElementById("error-firma");
            if (errorFirma) errorFirma.textContent = "Debes dibujar tu firma antes de enviar.";
            throw new Error("La firma no está registrada o es muy corta. Por favor, vuelve al paso 2 y dibuja tu firma.");
        }

        // 3. Preparar payload (Tu lógica original intacta)
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = typeof sanitizarString === "function" ? sanitizarString(value) : value;
        });

        data.identificacion = typeof sanitizarNumero === "function" ? sanitizarNumero(data.identificacion || sessionStorage.getItem("id_ingreso") || "") : (data.identificacion || "");
        data.telefono = typeof sanitizarNumero === "function" ? sanitizarNumero(data.telefono || "") : (data.telefono || "");

        if (typeof formatearFechaParaServidor === "function") {
            data.fecha_nacimiento = formatearFechaParaServidor(data.fecha_nacimiento);
            data.fecha_expedicion = formatearFechaParaServidor(data.fecha_expedicion);
        }

        data.educacion = recopilarEducacion();
        data.experiencia_laboral = recopilarExp();
        data.familiares = recopilarFamiliares();

        data.referencias = [
            {
                tipo_referencia: "laboral",
                empresa: sanitizarString(ref_lab_empresa.value),
                jefe_inmediato: sanitizarString(ref_lab_jefe.value),
                cargo_jefe: sanitizarString(ref_lab_cargo.value),
                telefono: sanitizarNumero(ref_lab_tel.value),
            },
            {
                tipo_referencia: "familiar",
                nombre_completo: sanitizarString(ref_fam_nombre.value),
                parentesco: sanitizarString(ref_fam_parentesco.value),
                telefono: sanitizarNumero(ref_fam_tel.value),
                ocupacion: sanitizarString(ref_fam_ocupacion.value),
            },
            {
                tipo_referencia: "personal",
                nombre_completo: sanitizarString(ref_per_nombre.value),
                relacion: sanitizarString(ref_per_relacion.value),
                telefono: sanitizarNumero(ref_per_tel.value),
                ocupacion: sanitizarString(ref_per_ocupacion.value),
            }
        ].filter(ref => Object.values(ref).some(v => v));

        data.contacto_emergencia = {
            nombre_completo: sanitizarString(emer_nombre.value),
            parentesco: sanitizarString(emer_parentesco.value),
            telefono: sanitizarNumero(emer_telefono.value),
            correo_electronico: sanitizarString(emer_correo.value),
            direccion: sanitizarString(emer_direccion.value)
        };

        data.metas_personales = {
            meta_corto_plazo: sanitizarString(meta_corto.value),
            meta_mediano_plazo: sanitizarString(meta_mediano.value),
            meta_largo_plazo: sanitizarString(meta_largo.value),
        };

        data.seguridad = {
            // Convertimos a número (1 o 0) para que MySQL tinyint no falle
            llamados_atencion: parseInt(seg_llamados.value) || 0,
            detalle_llamados: sanitizarString(seg_detalle_llamados?.value || ""),
            accidente_laboral: parseInt(seg_accidente.value) || 0,
            detalle_accidente: sanitizarString(seg_detalle_accidente?.value || ""),
            enfermedad_importante: parseInt(seg_enfermedad.value) || 0,
            detalle_enfermedad: sanitizarString(seg_detalle_enfermedad?.value || ""),
            consume_alcohol: parseInt(seg_alcohol.value) || 0,
            frecuencia_alcohol: sanitizarString(seg_frecuencia.value),
            familiar_en_empresa: parseInt(seg_familiar.value) || 0,
            detalle_familiar_empresa: sanitizarString(seg_familiar_nombre.value),
            info_falsa: parseInt(seg_falsa.value) || 0,
            acepta_poligrafo: parseInt(seg_poligrafo.value) || 0,
            observaciones: sanitizarString(seg_observaciones.value),
            califica_para_cargo: sanitizarString(seg_califica.value),
            fortalezas: sanitizarString(seg_fortal.value),
            aspectos_mejorar: sanitizarString(seg_mejorar.value),
            resolucion_problemas: sanitizarString(seg_resolucion.value)
        };

        data.firma_base64 = firmaGuardada;

        // ✅ PEGAR AQUÍ (antes del fetch):
        if (data.foto_public_url && String(data.foto_public_url).startsWith("data:image/")) {
        delete data.foto_public_url;
        }
        if (data.foto_gcs_path && String(data.foto_gcs_path).startsWith("data:")) {
        delete data.foto_gcs_path;
        }

        // 4. Intento de envío con manejo de errores de red (Ajustado a 45s para móviles)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const resp = await fetch(`${API_URL_BASE}/hv/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal
        });

        clearTimeout(timeout);
        const contentType = resp.headers.get("content-type") || "";
        let result;

        if (contentType.includes("application/json")) {
        result = await resp.json();
        } else {
        const text = await resp.text();
        throw new Error(`Respuesta no-JSON (HTTP ${resp.status}). Inicio: ${text.slice(0, 120)}`);
        }

        if (resp.ok && (result.ok || result.success)) {
            sessionStorage.removeItem('firma_temp');
            alert("✅ Hoja de vida registrada correctamente.");
            if (typeof resetFormToInitialState === "function") {
                resetFormToInitialState();
            } else {
                location.reload();
            }
        } else {
        const detalles = result && (result.details || result.error)
            ? (result.details || result.error)
            : "Error desconocido";

        // ✅ LOG TÉCNICO (esto nos dice EXACTAMENTE qué pasó)
        console.error("Detalle servidor:", detalles, result);

        // Mensaje amigable al usuario
        throw new Error("No pudimos registrar tu hoja de vida. Por favor intenta de nuevo.");
        }

    } catch (err) {
        console.error("Error en submit HV:", err);

        // MOSTRAR ERROR AL USUARIO EN EL RESUMEN
        if (resumenError) {
            if (err.name === "AbortError") {
                resumenError.innerHTML = "❌ <b>Tiempo agotado:</b> Tu internet está muy lento y no se pudo completar el envío. Por favor, intenta de nuevo sin salir de la página.";
            } else if (err.message.includes("Failed to fetch")) {
                resumenError.innerHTML = "❌ <b>Falla de conexión:</b> No tienes internet o la señal es muy débil. Revisa tu conexión e intenta enviar de nuevo.";
            } else {
                resumenError.innerHTML = "❌ " + err.message;
            }
            resumenError.style.display = "block";
            resumenError.scrollIntoView({ behavior: "smooth", block: "center" });
        }

    } finally {
        form.dataset.submitting = "0";
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalSubmitHtml;
        }
        if (btnNext) btnNext.disabled = false;
        if (btnPrev) btnPrev.disabled = (currentStep === 0);
    }
}); // <--- Este cierra el form.addEventListener("submit", ...)
// --- Función para prellenar datos (VERSIÓN CORREGIDA) ---
function prellenarDatosPersonales() {
    const tipo = sessionStorage.getItem("tipo_ingreso");
    const id = sessionStorage.getItem("id_ingreso");
    // Recuperamos el objeto completo del aspirante que guardamos en el login
    const aspiranteFull = JSON.parse(sessionStorage.getItem("aspirante_data") || "{}");
    const formHv = document.getElementById("hv-form");

    if (!formHv) return;

    // Función interna para crear campos ocultos (mantiene la integridad del envío)
    function ensureHidden(name, idEl, value) {
        let hid = document.getElementById(idEl);
        if (!hid) {
            hid = document.createElement("input");
            hid.type = "hidden";
            hid.id = idEl;
            hid.name = name;
            formHv.appendChild(hid);
        }
        hid.value = value || "";
    }
    
    // 1. Campos de seguridad obligatorios
    ensureHidden("tipo_documento_ingreso_hidden", "tipo_doc_hid", tipo);
    ensureHidden("identificacion_ingreso_hidden", "id_hid", id);

    // 2. Prellenar y bloquear Tipo de Documento
    if (tipo) {
        const selectTipo = document.getElementById("tipo_documento");
        if (selectTipo) {
            selectTipo.value = tipo;
            if (selectTipo.value !== tipo) {
                const optionExists = Array.from(selectTipo.options).some(opt => opt.value === tipo);
                if (!optionExists) {
                    const newOption = document.createElement("option");
                    newOption.value = tipo;
                    newOption.textContent = tipo;
                    selectTipo.appendChild(newOption);
                    selectTipo.value = tipo;
                }
            }
            selectTipo.setAttribute("disabled", true);
            ensureHidden("tipo_documento", "hidden_tipo_documento", tipo);
        }
    }

    // 3. Prellenar y bloquear Identificación
    if (id) {
        const inputId = document.getElementById("identificacion");
        if (inputId) {
            inputId.value = typeof sanitizarNumero === "function" ? sanitizarNumero(id) : id;
            inputId.setAttribute("readonly", true);
            ensureHidden("identificacion", "hidden_identificacion", id);
        }
    }

    // 4. NUEVA LÓGICA: Persistencia de datos (Medio de Reclutamiento y más)
    if (aspiranteFull && Object.keys(aspiranteFull).length > 0) {
        
        // === BLOQUE CORREGIDO: Medio de Reclutamiento ===
        if (aspiranteFull.medio_reclutamiento) {
            const selectMedio = document.getElementById("medio_reclutamiento");
            if (selectMedio) {
                const valorGuardado = aspiranteFull.medio_reclutamiento;

                // 1. Intentar asignar por valor directamente (ej: "pagina_web")
                selectMedio.value = valorGuardado;

                // 2. Si no funcionó (quedó vacío), buscar por el texto de la opción
                if (selectMedio.value === "") {
                    const opciones = Array.from(selectMedio.options);
                    const opcionCoincidente = opciones.find(opt => 
                        opt.textContent.trim().toLowerCase() === valorGuardado.trim().toLowerCase()
                    );
                    
                    if (opcionCoincidente) {
                        selectMedio.value = opcionCoincidente.value;
                    } else {
                        // 3. Si no existe ni en valor ni en texto, creamos la opción
                        const newOpt = document.createElement("option");
                        newOpt.value = valorGuardado;
                        newOpt.textContent = valorGuardado;
                        selectMedio.appendChild(newOpt);
                        selectMedio.value = valorGuardado;
                    }
                }
                
                // Disparar el evento change para que se muestre el campo de "Quién recomendó"
                selectMedio.dispatchEvent(new Event('change'));
            }
        }

        // === Recomendador (Sigue igual) ===
        if (aspiranteFull.recomendador_aspirante) {
            const inputRecom = document.getElementById("recomendador_aspirante");
            if (inputRecom) inputRecom.value = aspiranteFull.recomendador_aspirante;
        }

        // === Otros campos básicos (Sigue igual) ===
        const camposMapeo = {
            "primer_nombre": "primer_nombre",
            "segundo_nombre": "segundo_nombre",
            "primer_apellido": "primer_apellido",
            "segundo_apellido": "segundo_apellido",
            "correo_electronico": "correo_electronico",
            "telefono": "telefono",
            "direccion_barrio": "direccion_barrio"
        };

        Object.keys(camposMapeo).forEach(key => {
            const input = document.getElementById(key);
            if (input && aspiranteFull[camposMapeo[key]]) {
                input.value = aspiranteFull[camposMapeo[key]];
            }
        });
    }
}

// ==========================================
// MODIFICAR SHOWSTEP ORIGINAL
// ==========================================
// Nota: Solo redefine si showStep ya existe globalmente
if (typeof showStep !== 'undefined') {
  const originalShowStep = showStep;

  showStep = function (index) {
    originalShowStep(index);

    // ✅ ÚNICO punto de inicialización para Datos personales (firma + prellenado)
    // Ajusta este índice a 1 cuando elimines el paso de "Medio de reclutamiento".
    const STEP_DATOS_PERSONALES = 1;

    if (index === STEP_DATOS_PERSONALES) {
      // Prellenado/labels
      setTimeout(() => {
        if (typeof updateIngresoLabel === 'function') updateIngresoLabel();
        if (typeof prellenarDatosPersonales === 'function') prellenarDatosPersonales();

        const tipoInput = document.getElementById("tipo_documento");
        const idInput = document.getElementById("identificacion");
        if (tipoInput && tipoInput.value) tipoInput.style.borderColor = "var(--border)";
        if (idInput && idInput.value) idInput.style.borderColor = "var(--border)";
      }, 100);

      // Firma
      setTimeout(() => {
        if (typeof setupSignature === 'function') setupSignature();
      }, 200);
    }
  };
}

// Evento para disparar el prellenado cuando los datos de la API carguen
document.addEventListener("tipos-cargados", prellenarDatosPersonales);
// Cargar tipos de identificación para Paso 0
async function cargarTiposPaso0() {
    try {
        const res = await fetch(`/api/config/tipo-identificacion`);
        const tipos = await res.json();

        const select = document.getElementById("tipo_documento_ingreso");
        select.innerHTML = `<option value="">Selecciona...</option>`;

        tipos.forEach(t => {
            select.innerHTML += `<option value="${t.descripcion}">${t.descripcion}</option>`;
        });
    } catch (err) {
        console.error("Error cargando tipos de identificación para Paso 0:", err);
    }
}

function updateIngresoLabel() {
    try {
        const tipo = sessionStorage.getItem("tipo_ingreso") || "";
        const id = sessionStorage.getItem("id_ingreso") || "";
        const wrap = document.getElementById("ingreso-summary");
        const text = document.getElementById("ingreso-summary-text");
        if (!wrap || !text) return;

        if (tipo || id) {
            text.textContent = `${tipo}${tipo && id ? " - " : ""}${id}`;
            wrap.style.display = "block";

            const tipoMain = document.getElementById("tipo_documento");
            const identMain = document.getElementById("identificacion");
            if (tipoMain) tipoMain.setAttribute("disabled", true);
            if (identMain) identMain.setAttribute("readonly", true);

            const formEl = document.getElementById("hv-form");
            if (formEl) {
                let hidTipo = document.getElementById("hidden_tipo_documento");
                if (!hidTipo) {
                    hidTipo = document.createElement("input");
                    hidTipo.type = "hidden";
                    hidTipo.id = "hidden_tipo_documento";
                    hidTipo.name = "tipo_documento";
                    formEl.appendChild(hidTipo);
                }
                hidTipo.value = tipo || "";

                let hidId = document.getElementById("hidden_identificacion");
                if (!hidId) {
                    hidId = document.createElement("input");
                    hidId.type = "hidden";
                    hidId.id = "hidden_identificacion";
                    hidId.name = "identificacion";
                    formEl.appendChild(hidId);
                }
                hidId.value = id || "";
            }
        } else {
            wrap.style.display = "none";
        }
    } catch (err) {
        console.error("updateIngresoLabel error:", err);
    }
}

if (window._pendingUpdateIngreso) {
    try { updateIngresoLabel(); } catch (err) { console.error(err); }
    window._pendingUpdateIngreso = false;
}

// Editar ingreso
const editBtn = document.getElementById("edit-ingreso");
if (editBtn) {
    editBtn.addEventListener("click", () => {
        sessionStorage.removeItem("tipo_ingreso");
        sessionStorage.removeItem("id_ingreso");

        const hidTipo = document.getElementById("hidden_tipo_documento");
        if (hidTipo) hidTipo.remove();
        const hidId = document.getElementById("hidden_identificacion");
        if (hidId) hidId.remove();

        const tipoMain = document.getElementById("tipo_documento");
        const identMain = document.getElementById("identificacion");
        if (tipoMain) { tipoMain.removeAttribute("disabled"); tipoMain.value = ""; }
        if (identMain) { identMain.removeAttribute("readonly"); identMain.value = ""; }

        const wrap = document.getElementById("ingreso-summary");
        if (wrap) wrap.style.display = "none";
        showStep(0);
    });
}

// 1. ELIMINA cualquier llamada a inicializarSelects() que esté suelta fuera de eventos.

// 2. CONFIGURACIÓN DEL DOM (Correcta y ordenada)
document.addEventListener("DOMContentLoaded", () => {
    // Solo lo llamamos aquí cuando todo el HTML está cargado
    if (typeof inicializarSelects === "function") {
        inicializarSelects();
    }
    
    // Si tienes esta función para el Paso 0, verifícala
    if (typeof cargarTiposPaso0 === "function") {
        cargarTiposPaso0();
    }

    setTimeout(() => {
        if (typeof updateIngresoLabel === "function") {
            updateIngresoLabel();
        }
    }, 200);
});

// 3. FIRMA - VERSIÓN MEJORADA (Asegúrate de que no haya llaves huérfanas antes)
let canvas, ctx;
let drawing = false;

window.clearSignature = function () {
    canvas = document.getElementById("signatureCanvas");
    ctx = canvas ? canvas.getContext("2d") : null;
    
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sessionStorage.removeItem('firma_temp');

    // Limpiar error de firma si existe el elemento
    const errorFirma = document.getElementById("error-firma");
    if (errorFirma) errorFirma.textContent = "";
};

function setupSignature() {
    canvas = document.getElementById("signatureCanvas");
    if (!canvas) return;

    canvas.width = 400;
    canvas.height = 200;
    canvas.style.width = "100%";
    canvas.style.height = "150px";
    canvas.style.border = "2px solid #ccc";
    canvas.style.backgroundColor = "#fff";
    canvas.style.cursor = "crosshair";
    canvas.style.touchAction = "none";

    ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const firmaGuardada = sessionStorage.getItem('firma_temp');
    if (firmaGuardada && firmaGuardada.length > 1000) {
        const img = new Image();
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
        img.src = firmaGuardada;
    }

    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);
}

function startDrawing(e) {
    e.preventDefault();
    drawing = true;
    const pos = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    // Limpiar error de firma cuando empieza a dibujar
    document.getElementById("error-firma").textContent = "";
}

function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const pos = getCoordinates(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function stopDrawing(e) {
    e.preventDefault();
    drawing = false;
    ctx.beginPath();
    saveSignatureToStorage();
}

function saveSignatureToStorage() {
    if (!canvas) return;
    try {
        const firmaBase64 = canvas.toDataURL('image/png');
        if (firmaBase64 && firmaBase64.length > 1000) {
            sessionStorage.setItem('firma_temp', firmaBase64);
        }
    } catch (err) {
        console.error('Error guardando firma:', err);
    }
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY))
    };
}