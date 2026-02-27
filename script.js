
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

// Datos personales base
const identificacionInput = document.getElementById("identificacion");

let currentStep = 0;

// ⭐ AHORA SÍ PONLO AQUÍ ⭐
showStep(0);

// ========= PASO 0: Validación de ingreso =========
async function validarIngreso() {
    const tipo = tipoDocumentoIngreso.value.trim();
    const id = identificacionIngreso.value.trim();

    if (!tipo || !id) {
        ingresoMsg.textContent = "Debes completar ambos campos.";
        ingresoMsg.style.color = "var(--error)";
        return false;
    }

    try {
        const resp = await fetch(`https://curriculum-compact-594761951101.europe-west1.run.app/api/aspirante?identificacion=${id}`);
        const data = await resp.json();

        if (data.existe) {
            ingresoMsg.style.color = "green";
            ingresoMsg.textContent = "✔ Registro encontrado. Cargando datos...";

            // Guardar en sessionStorage inmediatamente
            sessionStorage.setItem("tipo_ingreso", tipo);
            sessionStorage.setItem("id_ingreso", id);

            // Llamar a updateIngresoLabel para que se muestre en el paso 2
            if (typeof updateIngresoLabel === "function") {
                updateIngresoLabel();
            }

            rellenarFormulario(data);

            setTimeout(() => {
                // Forzar que se muestren los valores en el paso 2
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

            // Guardar igualmente para que aparezcan en el paso 2
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
        ingresoMsg.textContent = "⚠ Error consultando el servidor.";
        console.error(err);
        return false;
    }
}

identificacionIngreso.addEventListener("blur", validarIngreso);
tipoDocumentoIngreso.addEventListener("change", () => {
    ingresoMsg.textContent = "";
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

    // Si entramos a la previsualización, construir resumen
    if (index === 8) {
        buildPreview();
    }

    // En showStep, cuando index === 2
    if (index === 2) {
        setTimeout(() => {
            setupSignature();
            // Restaurar firma si existe
            const firmaGuardada = sessionStorage.getItem('firma_temp');
            if (firmaGuardada && canvas && ctx) {
                const img = new Image();
                img.onload = function () {
                    ctx.drawImage(img, 0, 0);
                };
                img.src = firmaGuardada;
                console.log('✅ Firma restaurada desde sessionStorage');
            }
        }, 300);
    }
}

function validateStep(stepIndex) {
    const stepElement = steps[stepIndex];
    const requiredFields = stepElement.querySelectorAll("[data-required='true']");
    let valid = true;
    let firstInvalid = null;

    requiredFields.forEach((field) => {
        const value = (field.value || "").trim();
        const isInvalid = value === "";
        field.style.borderColor = isInvalid ? "var(--error)" : "var(--border)";
        if (isInvalid && !firstInvalid) {
            firstInvalid = field;
        }
        if (isInvalid) valid = false;
    });

    const errorDiv = document.getElementById(`error-step-${stepIndex}`);
    if (errorDiv) {
        if (!valid) {
            errorDiv.textContent =
                "Por favor completa los campos obligatorios marcados con * antes de continuar.";
        } else {
            errorDiv.textContent = "";
        }
    }

    if (firstInvalid) {
        firstInvalid.focus();
    }

    return valid;
}

// =====================
// EDUCACIÓN DINÁMICA
// =====================
const educacionList = document.getElementById("educacion-list");
const btnAddEducacion = document.getElementById("btn-add-educacion");

let educacionData = [];

function crearCardEducacion(index, data = {}) {
    return `
        <div class="educ-card" data-index="${index}">
          <div class="educ-grid">
            <div class="field">
              <label>Institución</label>
              <input type="text" class="educ-institucion" value="${data.institucion || ""}">
            </div>
            <div class="field">
              <label>Programa</label>
              <input type="text" class="educ-programa" value="${data.programa || ""}">
            </div>

            <div class="field">
              <label>Nivel de escolaridad</label>
              <select class="educ-nivel">
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
                <option value="1" ${String(data.finalizado) === "1" ? "selected" : ""}>Sí</option>
                <option value="0" ${String(data.finalizado) === "0" ? "selected" : ""}>No</option>
                <option value="2" ${String(data.finalizado) === "2" ? "selected" : ""}>En curso</option>
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
        const nivelEl = card.querySelector(".educ-nivel");
        const modalidadEl = card.querySelector(".educ-modalidad");
        const finalizadoEl = card.querySelector(".educ-finalizado");

        return {
            institucion: (card.querySelector(".educ-institucion")?.value || "").trim(),
            programa: (card.querySelector(".educ-programa")?.value || "").trim(),
            nivel_escolaridad: (nivelEl?.value || "").trim(),
            modalidad: (modalidadEl?.value || "").trim(),
            ano: (card.querySelector(".educ-ano")?.value || "").trim(),
            finalizado: (finalizadoEl?.value || "").trim()
        };
    });

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
              <label>Empresa</label>
              <input type="text" class="exp-empresa" value="${data.empresa || ""}">
            </div>
            <div class="field">
              <label>Cargo</label>
              <input type="text" class="exp-cargo" value="${data.cargo || ""}">
            </div>
            <div class="field">
              <label>Tiempo laborado</label>
              <input type="text" class="exp-tiempo" value="${data.tiempo_laborado || ""}">
            </div>
            <div class="field">
              <label>Salario</label>
              <input type="text" class="exp-salario" value="${data.salario || ""}">
            </div>
            <div class="field">
              <label>Motivo del retiro</label>
              <input type="text" class="exp-motivo" value="${data.motivo_retiro || ""}">
            </div>
            <div class="field" style="grid-column: span 2;">
              <label>Funciones realizadas</label>
              <textarea class="exp-funciones" rows="2">${data.funciones || ""}</textarea>
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
        tiempo_laborado: "",
        salario: "",
        motivo_retiro: "",
        causa_motivo_retiro: "",
        funciones: "",
        observaciones: ""
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
        empresa: (card.querySelector(".exp-empresa")?.value || "").trim(),
        cargo: (card.querySelector(".exp-cargo")?.value || "").trim(),
        tiempo_laborado: (card.querySelector(".exp-tiempo")?.value || "").trim(),
        salario: (card.querySelector(".exp-salario")?.value || "").trim(),
        motivo_retiro: (card.querySelector(".exp-motivo")?.value || "").trim(),
        funciones: (card.querySelector(".exp-funciones")?.value || "").trim()
        // nota: ya no se incluye causa_motivo_retiro ni observaciones
    }));

    return expData;
}

// =====================
// FAMILIARES DINÁMICOS
// =====================
const famList = document.getElementById("fam-list");
const btnAddFam = document.getElementById("btn-add-fam");

let familiaresData = [];

function crearCardFamiliar(index, data = {}) {
    return `
        <div class="fam-card" data-index="${index}">
          <div class="fam-grid">
            <div class="field">
              <label>Nombre completo</label>
              <input type="text" class="fam-nombre" value="${data.nombre_completo || ""}">
            </div>
            <div class="field">
              <label>Parentesco</label>
              <input type="text" class="fam-parentesco" value="${data.parentesco || ""}">
            </div>
            <div class="field">
              <label>Edad</label>
              <input type="number" class="fam-edad" value="${data.edad || ""}">
            </div>
            <div class="field">
              <label>Ocupación</label>
              <input type="text" class="fam-ocupacion" value="${data.ocupacion || ""}">
            </div>
            <div class="field">
              <label>¿Conviven juntos?</label>
              <select class="fam-conviven">
                <option value="1" ${data.conviven_juntos == 1 ? "selected" : ""}>Sí</option>
                <option value="0" ${data.conviven_juntos == 0 ? "selected" : ""}>No</option>
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

// Inicializar primer registro por defecto para Educación, Experiencia y Familiares
// (Pegar justo después de `function renderFamiliares() { ... }` y antes del resto del código)
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
        tiempo_laborado: "",
        salario: "",
        motivo_retiro: "",
        causa_motivo_retiro: "",
        funciones: "",
        observaciones: ""
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
        nombre_completo: card.querySelector(".fam-nombre").value.trim(),
        parentesco: card.querySelector(".fam-parentesco").value.trim(),
        edad: card.querySelector(".fam-edad").value.trim(),
        ocupacion: card.querySelector(".fam-ocupacion").value.trim(),
        conviven_juntos: card.querySelector(".fam-conviven").value.trim()
    }));

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

// ======== Función para PRELLENAR datos ========
// Reemplazar la función rellenarFormulario existente por esta:
// Reemplaza la función existente por esta versión más robusta y con logs:
// Reemplaza la función rellenarFormulario existente por esta:
async function rellenarFormulario(a) {
    try {
        console.log("rellenarFormulario - payload:", a);
        if (!a) return;

        // Si los selects aún no están listos, esperar al evento 'selects-cargados'
        if (!window.selectsLoaded) {
            window._pendingAspirante = a;
            console.log("Espera selects-cargados antes de rellenar los selects.");
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

        // aspirante puede estar en a.aspirante (forma que devuelve el backend) o directamente en 'a'
        const aspirante = a.aspirante || a;

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value != null ? value : "";
        };

        // --- Campos personales simples ---
        if (aspirante) {
            set("primer_nombre", aspirante.primer_nombre || "");
            set("segundo_nombre", aspirante.segundo_nombre || "");
            set("primer_apellido", aspirante.primer_apellido || "");
            set("segundo_apellido", aspirante.segundo_apellido || "");
            set("correo_electronico", aspirante.correo_electronico || "");
            set("telefono", aspirante.telefono || "");
            set("direccion_barrio", aspirante.direccion_barrio || "");
            set("estado_civil", aspirante.estado_civil || "");
            set("eps", aspirante.eps || "");
            set("afp", aspirante.afp || "");
            set("rh", aspirante.rh || "");
            set("talla_pantalon", aspirante.talla_pantalon || "");
            set("camisa_talla", aspirante.camisa_talla || "");
            set("zapatos_talla", aspirante.zapatos_talla || "");
            // Fecha de nacimiento: el input date acepta 'YYYY-MM-DD' si viene así desde DB
            set("fecha_nacimiento", aspirante.fecha_nacimiento ? aspirante.fecha_nacimiento.split("T")[0] || aspirante.fecha_nacimiento : "");
            if (typeof fechaNacimientoInput !== "undefined" && fechaNacimientoInput) {
                edadInput.value = calcularEdadDesdeFecha(fechaNacimientoInput.value);
            }
            set("fecha_expedicion", aspirante.fecha_expedicion ? aspirante.fecha_expedicion.split("T")[0] || aspirante.fecha_expedicion : "");
            // dentro de rellenarFormulario, tras set(...) de campos personales
            // Mostrar foto existente (si la hay)
            rellenarFotoDesdeAspirante(aspirante);
        }

        // --- Departamentos y ciudades (hay que poblar ciudades después de asignar departamento) ---
        // Expedición
        if (aspirante && aspirante.departamento_expedicion) {
            set("departamento_expedicion", aspirante.departamento_expedicion);
            // cargar ciudades y luego fijar la ciudad si existe
            if (typeof cargarCiudades === "function") {
                await cargarCiudades("departamento_expedicion", "ciudad_expedicion");
                set("ciudad_expedicion", aspirante.ciudad_expedicion || "");
            }
        } else {
            set("departamento_expedicion", "");
            set("ciudad_expedicion", "");
        }

        // Residencia
        if (aspirante && (aspirante.departamento || aspirante.departamento_residencia)) {
            const depResid = aspirante.departamento || aspirante.departamento_residencia || "";
            set("departamento_residencia", depResid);
            if (typeof cargarCiudades === "function") {
                await cargarCiudades("departamento_residencia", "ciudad_residencia");
                // en la tabla el campo se llama 'ciudad' (mapeado antes), usamos aspirante.ciudad o ciudad_residencia
                set("ciudad_residencia", aspirante.ciudad || aspirante.ciudad_residencia || "");
            }
        } else {
            set("departamento_residencia", "");
            set("ciudad_residencia", "");
        }

        // Tipo de documento e identificacion (solo si están vacíos en el formulario)
        const identEl = document.getElementById("identificacion");
        if (identEl && !identEl.value && aspirante.identificacion) {
            identEl.value = aspirante.identificacion;
        }
        const tipoEl = document.getElementById("tipo_documento");
        if (tipoEl && !tipoEl.value && aspirante.tipo_documento) {
            tipoEl.value = aspirante.tipo_documento;
        }

        // --- Arrays relacionales y otros campos ya manejados anteriormente ---
        // Educación
        const educ = Array.isArray(a.educacion) ? a.educacion : (a.educacion || []);

        if (educ.length > 0) {
            educacionData = educ.map(e => ({
                institucion: e.institucion || "",
                programa: e.programa || "",
                nivel_escolaridad: e.nivel_escolaridad || "",
                modalidad: e.modalidad || "",
                ano: e.ano || "",
                // Aceptar valores '1' (Sí), '0' (No) o '2' (En curso). Convertir a string por consistencia.
                finalizado: (typeof e.finalizado !== "undefined" && e.finalizado !== null) ? String(e.finalizado) : "1"
            }));
        } else {
            // Si no hay registros del servidor, mantener al menos una card vacía para la UX
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

        // Renderizar una sola vez después de haber preparado educacionData
        renderEducacion();

        // Experiencia
        const exp = Array.isArray(a.experiencia_laboral) ? a.experiencia_laboral : (a.experiencia_laboral || []);
        if (exp.length > 0) {
            expData = exp.map(x => ({
                empresa: x.empresa || "",
                cargo: x.cargo || "",
                tiempo_laborado: x.tiempo_laborado || "",
                salario: x.salario || "",
                motivo_retiro: x.motivo_retiro || "",
                funciones: x.funciones || ""
                // NO incluimos causa_motivo_retiro ni observaciones
            }));
        } else if (!expData || expData.length === 0) {
            expData = [{ empresa: "", cargo: "", tiempo_laborado: "", salario: "", motivo_retiro: "", funciones: "" }];
        }
        renderExp();

        // Familiares
        const fam = Array.isArray(a.familiares) ? a.familiares : (a.familiares || []);
        if (fam.length > 0) {
            familiaresData = fam.map(f => ({
                nombre_completo: f.nombre_completo || "",
                parentesco: f.parentesco || "",
                edad: f.edad || "",
                ocupacion: f.ocupacion || "",
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
                    set("ref_lab_empresa", r.empresa || "");
                    set("ref_lab_jefe", r.jefe_inmediato || "");
                    set("ref_lab_cargo", r.cargo_jefe || "");
                    set("ref_lab_tel", r.telefono || "");
                } else if (tipo === "familiar") {
                    set("ref_fam_nombre", r.nombre_completo || "");
                    set("ref_fam_parentesco", r.parentesco || r.relacion || "");
                    set("ref_fam_tel", r.telefono || "");
                    set("ref_fam_ocupacion", r.ocupacion || "");
                } else if (tipo === "personal") {
                    set("ref_per_nombre", r.nombre_completo || "");
                    set("ref_per_relacion", r.relacion || "");
                    set("ref_per_tel", r.telefono || "");
                    set("ref_per_ocupacion", r.ocupacion || "");
                }
            });
        }

        // Contacto de emergencia
        if (a.contacto_emergencia) {
            set("emer_nombre", a.contacto_emergencia.nombre_completo || "");
            set("emer_parentesco", a.contacto_emergencia.parentesco || "");
            set("emer_telefono", a.contacto_emergencia.telefono || "");
            set("emer_correo", a.contacto_emergencia.correo_electronico || "");
            set("emer_direccion", a.contacto_emergencia.direccion || "");
        }

        // Metas personales
        if (a.metas_personales) {
            set("meta_corto", a.metas_personales.meta_corto_plazo || "");
            set("meta_mediano", a.metas_personales.meta_mediano_plazo || "");
            set("meta_largo", a.metas_personales.meta_largo_plazo || "");
        }

        // Seguridad / cuestionario
        if (a.seguridad) {
            const s = a.seguridad;
            if (typeof s.llamados_atencion !== "undefined") {
                document.getElementById("seg_llamados").value = String(s.llamados_atencion || 0);
                if (s.llamados_atencion == 1) document.getElementById("detalle_llamados_wrap").classList.remove("hidden");
                set("seg_detalle_llamados", s.detalle_llamados || "");
            }
            if (typeof s.accidente_laboral !== "undefined") {
                document.getElementById("seg_accidente").value = String(s.accidente_laboral || 0);
                if (s.accidente_laboral == 1) document.getElementById("detalle_accidente_wrap").classList.remove("hidden");
                set("seg_detalle_accidente", s.detalle_accidente || "");
            }
            if (typeof s.enfermedad_importante !== "undefined") {
                document.getElementById("seg_enfermedad").value = String(s.enfermedad_importante || 0);
                if (s.enfermedad_importante == 1) document.getElementById("detalle_enfermedad_wrap").classList.remove("hidden");
                set("seg_detalle_enfermedad", s.detalle_enfermedad || "");
            }
            if (typeof s.consume_alcohol !== "undefined") {
                document.getElementById("seg_alcohol").value = String(s.consume_alcohol || 0);
                if (s.consume_alcohol == 1) document.getElementById("detalle_alcohol_wrap").classList.remove("hidden");
                set("seg_frecuencia", s.frecuencia_alcohol || "");
            }
            if (typeof s.familiar_en_empresa !== "undefined") {
                document.getElementById("seg_familiar").value = String(s.familiar_en_empresa || 0);
                if (s.familiar_en_empresa == 1) document.getElementById("detalle_familiar_wrap").classList.remove("hidden");
                set("seg_familiar_nombre", s.detalle_familiar_empresa || "");
            }
            set("seg_observaciones", s.observaciones || "");
            set("seg_califica", s.califica_para_cargo || "");
            set("seg_fortal", s.fortalezas || "");
            set("seg_mejorar", s.aspectos_mejorar || "");
            set("seg_resolucion", s.resolucion_problemas || "");
            if (typeof s.info_falsa !== "undefined") document.getElementById("seg_falsa").value = String(s.info_falsa || 0);
            if (typeof s.acepta_poligrafo !== "undefined") document.getElementById("seg_poligrafo").value = String(s.acepta_poligrafo || 0);
        }

        console.log("rellenarFormulario - finished. educacionData, expData, familiaresData lengths:", educacionData.length, expData.length, familiaresData.length);
    } catch (err) {
        console.error("Error en rellenarFormulario:", err);
    }
}
// Medio de reclutamiento → mostrar campo recomendador
medioSelect.addEventListener("change", () => {
    const value = medioSelect.value;
    const needsRecomendador =
        value === "recomendado" || value === "empleado_interno";
    if (needsRecomendador) {
        campoRecomendador.classList.remove("hidden");
    } else {
        campoRecomendador.classList.add("hidden");
    }
});
// --- Reemplazar por este bloque limpio ---
function calcularEdadDesdeFecha(value) {
    if (!value) return "";
    // asegurar formato YYYY-MM-DD
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
    return age >= 0 ? String(age) : "";
}

// Edad automática: usa la función y no deja código extra
if (fechaNacimientoInput) {
    fechaNacimientoInput.addEventListener("change", () => {
        const value = fechaNacimientoInput.value;
        edadInput.value = calcularEdadDesdeFecha(value);
    });
}

// Navegación
// Registrar el listener del botón "Anterior" UNA VEZ (corrección)
btnPrev.addEventListener("click", () => {
    if (currentStep > 0) {
        showStep(currentStep - 1);
    }
});

btnNext.addEventListener("click", async () => {
    if (currentStep === 0) {
        const ok = await validarIngreso();
        if (!ok) return;

        // Asegurar que los datos se guarden antes de cambiar de paso
        const tipo = tipoDocumentoIngreso.value.trim();
        const id = identificacionIngreso.value.trim();

        sessionStorage.setItem("tipo_ingreso", tipo);
        sessionStorage.setItem("id_ingreso", id);

        // Actualizar etiqueta inmediatamente
        if (typeof updateIngresoLabel === "function") {
            updateIngresoLabel();
        }

        // Forzar el cambio después de un pequeño delay para que los selects se carguen
        setTimeout(() => {
            if (!validateStep(currentStep)) return;
            if (currentStep < steps.length - 1) {
                showStep(currentStep + 1);
            }
        }, 300);
        return;
    }

    if (!validateStep(currentStep)) return;

    if (currentStep < steps.length - 1) {
        showStep(currentStep + 1);
    }
});

// Escapa texto para insertarlo en el HTML de preview (protege contra caracteres especiales)
function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
// Construcción de PREVIEW (Opción C)
function buildPreview() {
    const wrap = document.getElementById("preview-container");
    if (!wrap) return;

    // Actualizar arrays dinámicos antes de leer
    recopilarEducacion();
    recopilarExp();
    recopilarFamiliares();

    const v = (id) => {
        const el = document.getElementById(id);
        return el ? (el.value || "").trim() : "";
    };

    const datosPersonalesResumen =
        [v("primer_nombre"), v("segundo_nombre"), v("primer_apellido"), v("segundo_apellido")]
            .filter(Boolean)
            .join(" ");

    const ciudadResidencia = [v("ciudad_residencia"), v("departamento_residencia")]
        .filter(Boolean)
        .join(" - ");

    const medioRec = v("medio_reclutamiento");

    const educCount = educacionData.length;
    const expCount = expData.length;
    const famCount = familiaresData.length;

    // Secciones
    const bloqueDatos = `
        <div class="preview-section">
          <details open>
            <summary>
              Datos personales
              <span class="preview-pill">Obligatorio</span>
            </summary>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">Nombre completo</span>
                <span class="preview-value">${datosPersonalesResumen || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Identificación</span>
                <span class="preview-value">${v("identificacion") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Fecha nacimiento</span>
                <span class="preview-value">${v("fecha_nacimiento") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Edad</span>
                <span class="preview-value">${v("edad") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Ciudad de residencia</span>
                <span class="preview-value">${ciudadResidencia || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Teléfono</span>
                <span class="preview-value">${v("telefono") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Correo</span>
                <span class="preview-value">${v("correo_electronico") || "-"}</span>
              </div>
            </div>
          </details>
        </div>
      `;

    const bloqueReclutamiento = `
        <div class="preview-section">
          <details>
            <summary>
              Medio de reclutamiento
              <span class="preview-pill">Registro inicial</span>
            </summary>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">Medio</span>
                <span class="preview-value">${medioRec || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Recomendador / contacto</span>
                <span class="preview-value">${v("recomendador_aspirante") || "-"}</span>
              </div>
            </div>
          </details>
        </div>
      `;

    const bloqueSalud = `
        <div class="preview-section">
          <details>
            <summary>
              Salud y dotación
              <span class="preview-pill">Información general</span>
            </summary>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">EPS</span>
                <span class="preview-value">${v("eps") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Pensión</span>
                <span class="preview-value">${v("afp") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">RH</span>
                <span class="preview-value">${v("rh") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Talla pantalón</span>
                <span class="preview-value">${v("talla_pantalon") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Talla camisa</span>
                <span class="preview-value">${v("camisa_talla") || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Talla zapatos</span>
                <span class="preview-value">${v("zapatos_talla") || "-"}</span>
              </div>
            </div>
          </details>
        </div>
      `;

    const bloqueEducacion = `
        <div class="preview-section">
          <details>
            <summary>
              Educación
              <span class="preview-pill">${educCount} registro(s)</span>
            </summary>
            <div class="preview-content">
              ${educCount === 0
            ? "<p>No registraste estudios.</p>"
            : educacionData.map((e, i) => `
                    <div style="margin-bottom:6px;">
                      <strong>${i + 1}. ${e.institucion || "Institución no especificada"}</strong><br>
                      <span>${e.programa || "Programa no especificado"} (${e.modalidad || "-"})</span><br>
                      <span>Año: ${e.ano || "-"} | Finalizado: ${e.finalizado == 1 ? "Sí" : "No"}</span>
                    </div>
                  `).join("")
        }
            </div>
          </details>
        </div>
      `;

    const bloqueExp = `
        <div class="preview-section">
          <details>
            <summary>
              Experiencia laboral
              <span class="preview-pill">${expCount} registro(s)</span>
            </summary>
            <div class="preview-content">
              ${expCount === 0
            ? "<p>No registraste experiencia laboral.</p>"
            : expData.map((e, i) => {
                const empresa = e?.empresa ? escapeHtml(e.empresa) : "Empresa no especificada";
                const cargo = escapeHtml(e?.cargo || "-");
                const tiempo = escapeHtml(e?.tiempo_laborado || "-");
                const salario = escapeHtml(e?.salario || "-");
                const motivo = escapeHtml(e?.motivo_retiro || "-");
                return `
                        <div style="margin-bottom:6px;">
                          <strong>${i + 1}. ${empresa}</strong><br>
                          <span>Cargo: ${cargo}</span><br>
                          <span>Tiempo: ${tiempo} | Salario: ${salario}</span><br>
                          <span>Motivo retiro: ${motivo}</span>
                        </div>
                      `;
            }).join("")
        }
            </div>
          </details>
        </div>
      `;

    const bloqueFamilia = `
        <div class="preview-section">
          <details>
            <summary>
              Familiares
              <span class="preview-pill">${famCount} registro(s)</span>
            </summary>
            <div class="preview-content">
              ${famCount === 0
            ? "<p>No registraste familiares.</p>"
            : familiaresData.map((f, i) => `
                    <div style="margin-bottom:6px;">
                      <strong>${i + 1}. ${f.nombre_completo || "Sin nombre"}</strong><br>
                      <span>Parentesco: ${f.parentesco || "-"}</span><br>
                      <span>Edad: ${f.edad || "-"}</span><br>
                      <span>Ocupación: ${f.ocupacion || "-"}</span><br>
                      <span>Conviven juntos: ${f.conviven_juntos == 1 ? "Sí" : "No"}</span>
                    </div>
                  `).join("")
        }
            </div>
          </details>
        </div>
      `;

    const bloqueReferencias = `
        <div class="preview-section">
          <details>
            <summary>
              Referencias
              <span class="preview-pill">3 tipos</span>
            </summary>
            <div class="preview-content">
              <strong>Laboral</strong><br>
              Empresa: ${ref_lab_empresa.value.trim() || "-"}<br>
              Jefe: ${ref_lab_jefe.value.trim() || "-"}<br>
              Teléfono: ${ref_lab_tel.value.trim() || "-"}<br><br>

              <strong>Familiar</strong><br>
              Nombre: ${ref_fam_nombre.value.trim() || "-"}<br>
              Parentesco: ${ref_fam_parentesco.value.trim() || "-"}<br>
              Teléfono: ${ref_fam_tel.value.trim() || "-"}<br><br>

              <strong>Personal</strong><br>
              Nombre: ${ref_per_nombre.value.trim() || "-"}<br>
              Relación: ${ref_per_relacion.value.trim() || "-"}<br>
              Teléfono: ${ref_per_tel.value.trim() || "-"}
            </div>
          </details>
        </div>
      `;

    const bloqueEmergencia = `
        <div class="preview-section">
          <details>
            <summary>
              Contacto de emergencia
              <span class="preview-pill">1 contacto</span>
            </summary>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">Nombre</span>
                <span class="preview-value">${emer_nombre.value.trim() || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Parentesco</span>
                <span class="preview-value">${emer_parentesco.value.trim() || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Teléfono</span>
                <span class="preview-value">${emer_telefono.value.trim() || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Correo</span>
                <span class="preview-value">${emer_correo.value.trim() || "-"}</span>
              </div>
            </div>
          </details>
        </div>
      `;

    const bloqueMetas = `
        <div class="preview-section">
          <details>
            <summary>
              Metas personales
              <span class="preview-pill">Resumen</span>
            </summary>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">Corto plazo</span>
                <span class="preview-value">${meta_corto.value.trim() || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Mediano plazo</span>
                <span class="preview-value">${meta_mediano.value.trim() || "-"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Largo plazo</span>
                <span class="preview-value">${meta_largo.value.trim() || "-"}</span>
              </div>
            </div>
          </details>
        </div>
      `;

    const bloqueSeguridad = `
        <div class="preview-section">
          <details>
            <summary>
              Cuestionario personal
              <span class="preview-pill">Confidencial</span>
            </summary>
            <div class="preview-content">
              <div class="preview-row">
                <span class="preview-label">Llamados de atención</span>
                <span class="preview-value">${seg_llamados.value === "1" ? "Sí" : "No"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Accidente laboral</span>
                <span class="preview-value">${seg_accidente.value === "1" ? "Sí" : "No"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Enfermedad importante</span>
                <span class="preview-value">${seg_enfermedad.value === "1" ? "Sí" : "No"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Consume alcohol</span>
                <span class="preview-value">${seg_alcohol.value === "1" ? "Sí" : "No"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Familiar en empresa</span>
                <span class="preview-value">${seg_familiar.value === "1" ? "Sí" : "No"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Acepta polígrafo</span>
                <span class="preview-value">${seg_poligrafo.value === "1" ? "Sí" : "No"}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">Motivación para el cargo</span>
                <span class="preview-value">${seg_califica.value.trim() || "-"}</span>
              </div>
            </div>
          </details>
        </div>
      `;

    wrap.innerHTML =
        bloqueDatos +
        bloqueReclutamiento +
        bloqueSalud +
        bloqueEducacion +
        bloqueExp +
        bloqueFamilia +
        bloqueReferencias +
        bloqueEmergencia +
        bloqueMetas +
        bloqueSeguridad;
}
// ======= Foto de perfil: preview, upload y manejo =======
const photoInput = document.getElementById("photo_input");
const btnUploadPhoto = document.getElementById("btn-upload-photo");
const btnRemovePhoto = document.getElementById("btn-remove-photo");
const photoImg = document.getElementById("photo-img");
const photoPlaceholder = document.getElementById("photo-placeholder");
const photoStatus = document.getElementById("photo-status");

// Helper: asegurar hidden inputs foto_gcs_path y foto_public_url en el form
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

// Mostrar preview (url puede ser dataURL o public URL)
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

// Limpiar preview y hidden inputs localmente (no borra en GCS)
function clearPhotoLocal() {
    setPhotoPreview("", "");
    photoStatus.textContent = "";
}

// Preview inmediato al seleccionar archivo (sin subir aún)
if (photoInput) {
    photoInput.addEventListener("change", () => {
        const f = photoInput.files && photoInput.files[0];
        if (!f) return;
        // Validaciones cliente
        if (!f.type.startsWith("image/")) {
            alert("Sólo se aceptan imágenes (jpg/png).");
            photoInput.value = "";
            return;
        }
        const maxBytes = 5 * 1024 * 1024; // 5 MB
        if (f.size > maxBytes) {
            alert("La imagen excede el límite de 5 MB.");
            photoInput.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            setPhotoPreview(ev.target.result, ""); // preview local (dataURL); gcsPath vacío hasta subir
        };
        reader.readAsDataURL(f);
    });
}

// Upload: enviar a /api/hv/upload-photo (multipart/form-data)
// Requiere que server.js tenga el endpoint y permisos GCS (ya lo implementaste)
async function uploadPhoto() {
    const file = photoInput.files && photoInput.files[0];
    // Identificación: preferir el campo visible de Paso 2, si vacío usar el ingreso en sessionStorage
    let identificacionVal = (document.getElementById("identificacion")?.value || "").trim();
    if (!identificacionVal) {
        identificacionVal = sessionStorage.getItem("id_ingreso") || "";
    }
    if (!identificacionVal) {
        alert("Primero ingresa número de identificación (Paso 0).");
        return;
    }
    if (!file) {
        alert("Selecciona un archivo antes de subir.");
        return;
    }

    try {
        // UI feedback
        btnUploadPhoto.disabled = true;
        photoStatus.textContent = "Subiendo...";
        const form = new FormData();
        form.append("identificacion", identificacionVal);
        form.append("photo", file);

        const resp = await fetch("https://curriculum-compact-594761951101.europe-west1.run.app/api/hv/upload-photo", {
            method: "POST",
            body: form
        });

        const result = await resp.json();
        if (!resp.ok) {
            const msg = result && result.error ? result.error : "Error subiendo la foto";
            throw new Error(msg);
        }

        // result debe contener foto_gcs_path y foto_public_url
        const { foto_gcs_path, foto_public_url } = result;
        // Actualizar preview y hidden inputs con la URL pública
        setPhotoPreview(foto_public_url || "", foto_gcs_path || "");
        photoStatus.textContent = "Subida correctamente.";
    } catch (err) {
        console.error("uploadPhoto error:", err);
        alert("Error subiendo la foto: " + (err.message || err));
        photoStatus.textContent = "Error al subir.";
    } finally {
        btnUploadPhoto.disabled = false;
    }
}

if (btnUploadPhoto) btnUploadPhoto.addEventListener("click", uploadPhoto);

// Reemplazo del listener btnRemovePhoto: uso de modal propio
if (btnRemovePhoto) {
    const modalBackdrop = document.getElementById("deletePhotoModalBackdrop");
    const modalCancel = document.getElementById("deleteModalCancel");
    const modalConfirm = document.getElementById("deleteModalConfirm");

    // Mostrar modal
    btnRemovePhoto.addEventListener("click", () => {
        if (!modalBackdrop) {
            // fallback a confirm nativo si el modal no existe por alguna razón
            if (!confirm("¿Está seguro de eliminar esta foto?")) return;
            clearPhotoLocal();
            if (photoInput) photoInput.value = "";
            return;
        }

        // mostrar modal
        modalBackdrop.classList.add("visible");
        modalBackdrop.setAttribute("aria-hidden", "false");

        // foco al boton confirmar para accesibilidad
        if (modalConfirm) modalConfirm.focus();
    });

    // Cancelar
    if (modalCancel) {
        modalCancel.addEventListener("click", () => {
            if (!modalBackdrop) return;
            modalBackdrop.classList.remove("visible");
            modalBackdrop.setAttribute("aria-hidden", "true");
            // devolver foco al btnRemovePhoto
            btnRemovePhoto.focus();
        });
    }

    // Confirmar eliminación (solo limpia local por ahora)
    if (modalConfirm) {
        modalConfirm.addEventListener("click", async () => {
            try {
                // ocultar modal inmediatamente
                if (modalBackdrop) {
                    modalBackdrop.classList.remove("visible");
                    modalBackdrop.setAttribute("aria-hidden", "true");
                }

                // acción local: limpiar preview y hidden inputs
                clearPhotoLocal();
                if (photoInput) photoInput.value = "";

                // OPCIONAL: si quieres que al confirmar se llame al backend para eliminar la referencia / archivo
                // descomenta y ajusta la ruta /api/hv/delete-photo si la implementas en server.js.
                /*
                try {
                  const identificacionVal = (document.getElementById("identificacion")?.value || sessionStorage.getItem("id_ingreso") || "").trim();
                  const gcsPath = document.getElementById("hidden_foto_gcs_path")?.value || "";
                  await fetch("/api/hv/delete-photo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identificacion: identificacionVal, foto_gcs_path: gcsPath })
                  });
                } catch (errDel) {
                  console.warn("Advertencia: no se pudo llamar al endpoint delete-photo:", errDel);
                }
                */

                // feedback al usuario opcional
                // alert("Foto eliminada localmente.");
            } catch (err) {
                console.error("Error al confirmar eliminación de foto:", err);
            } finally {
                // devolver foco
                btnRemovePhoto.focus();
            }
        });
    }

    // Cerrar modal con Esc
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalBackdrop && modalBackdrop.classList.contains("visible")) {
            modalBackdrop.classList.remove("visible");
            modalBackdrop.setAttribute("aria-hidden", "true");
            btnRemovePhoto.focus();
        }
    });

    // Cerrar si se hace click fuera del card
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

// Integración con rellenarFormulario: si aspirante tiene foto_public_url, mostrarla
// Busca el lugar dentro rellenarFormulario donde se setean los campos personales (ya existe)
function rellenarFotoDesdeAspirante(aspirante) {
    try {
        if (!aspirante) return;
        const url = aspirante.foto_public_url || aspirante.foto_url || null;
        const gcsPath = aspirante.foto_gcs_path || null;
        if (url) {
            setPhotoPreview(url, gcsPath || "");
        } else {
            // si no tiene foto, limpiar preview
            clearPhotoLocal();
        }
    } catch (err) {
        console.error("rellenarFotoDesdeAspirante error:", err);
    }
}
// RESET: dejar el formulario como al inicio para ingresar otra cédula
function resetFormToInitialState() {
    try {
        // 1) Limpiar sessionStorage del ingreso previo
        sessionStorage.removeItem("tipo_ingreso");
        sessionStorage.removeItem("id_ingreso");

        // 2) Quitar hidden inputs generados por prellenarDatosPersonales (si existen)
        const hidTipo = document.getElementById("hidden_tipo_documento");
        if (hidTipo) hidTipo.remove();
        const hidId = document.getElementById("hidden_identificacion");
        if (hidId) hidId.remove();

        // 3) Re-habilitar / limpiar campos principales (Paso 2)
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

        // 4) Limpiar inputs del Paso 0 (ingreso)
        const tipoIngreso = document.getElementById("tipo_documento_ingreso");
        if (tipoIngreso) tipoIngreso.value = "";
        const identIngreso = document.getElementById("identificacion_ingreso");
        if (identIngreso) {
            identIngreso.value = "";
            identIngreso.focus();
        }

        // 5) Reset general del formulario (resetea la mayoría de inputs/selects)
        if (form) form.reset();

        // 6) Reestablecer selects dependientes a su estado "selecciona..."
        const ciudadExp = document.getElementById("ciudad_expedicion");
        const ciudadRes = document.getElementById("ciudad_residencia");
        if (ciudadExp) ciudadExp.innerHTML = `<option value="">Selecciona...</option>`;
        if (ciudadRes) ciudadRes.innerHTML = `<option value="">Selecciona...</option>`;

        // 7) Reset de arrays dinámicos y render
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

        // 8) Limpiar referencia/emer/metas/seguridad visibles (form.reset suele cubrirlo,
        //    pero forzamos valores por si quedaron en estado diferente)
        document.getElementById("ingreso-msg").textContent = "";
        const preview = document.getElementById("preview-container");
        if (preview) preview.innerHTML = "";

        // 9) Volver al paso 0
        showStep(0);

        // Limpiar preview y hidden foto al resetear
        clearPhotoLocal();
        const hidFotoPath = document.getElementById("hidden_foto_gcs_path");
        if (hidFotoPath) hidFotoPath.remove();
        const hidFotoUrl = document.getElementById("hidden_foto_public_url");
        if (hidFotoUrl) hidFotoUrl.remove();

        // 10) (opcional) volver a inicializar selects si necesitas recargar opciones dinámicas
        //    Por defecto no lo hacemos porque app.js ya cargó los selects. Si observas
        //    inconsistencia, descomenta la línea siguiente:
        // inicializarSelects();

        console.log("Formulario reseteado y listo para nuevo ingreso.");
    } catch (err) {
        console.error("Error al resetear formulario:", err);
    }
}

// Submit final
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Evitar doble envío
    if (form.dataset.submitting === "1") return;
    form.dataset.submitting = "1";

    // Guardar texto original del botón para restaurar luego
    const originalSubmitHtml = btnSubmit.innerHTML;

    // Bloquear UI
    btnSubmit.disabled = true;
    btnNext.disabled = true;
    btnPrev.disabled = true;
    btnSubmit.innerHTML = "Enviando...";

    try {
        // Preparar payload como antes
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        data.educacion = recopilarEducacion();
        data.experiencia_laboral = recopilarExp();
        data.familiares = recopilarFamiliares();

        data.referencias = [
            {
                tipo_referencia: "laboral",
                empresa: ref_lab_empresa.value.trim(),
                jefe_inmediato: ref_lab_jefe.value.trim(),
                cargo_jefe: ref_lab_cargo.value.trim(),
                telefono: ref_lab_tel.value.trim(),
            },
            {
                tipo_referencia: "familiar",
                nombre_completo: ref_fam_nombre.value.trim(),
                parentesco: ref_fam_parentesco.value.trim(),
                telefono: ref_fam_tel.value.trim(),
                ocupacion: ref_fam_ocupacion.value.trim(),
            },
            {
                tipo_referencia: "personal",
                nombre_completo: ref_per_nombre.value.trim(),
                relacion: ref_per_relacion.value.trim(),
                telefono: ref_per_tel.value.trim(),
                ocupacion: ref_per_ocupacion.value.trim(),
            }
        ];

        data.contacto_emergencia = {
            nombre_completo: emer_nombre.value.trim(),
            parentesco: emer_parentesco.value.trim(),
            telefono: emer_telefono.value.trim(),
            correo_electronico: emer_correo.value.trim(),
            direccion: emer_direccion.value.trim()
        };

        data.metas_personales = {
            corto_plazo: meta_corto.value.trim(),
            mediano_plazo: meta_mediano.value.trim(),
            largo_plazo: meta_largo.value.trim(),
        };

        data.seguridad = {
            llamados_atencion: seg_llamados.value,
            detalle_llamados: seg_detalle_llamados ? seg_detalle_llamados.value.trim() : "",
            accidente_laboral: seg_accidente.value,
            detalle_accidente: seg_detalle_accidente ? seg_detalle_accidente.value.trim() : "",
            enfermedad_importante: seg_enfermedad.value,
            detalle_enfermedad: seg_detalle_enfermedad ? seg_detalle_enfermedad.value.trim() : "",
            consume_alcohol: seg_alcohol.value,
            frecuencia_alcohol: seg_frecuencia.value.trim(),
            familiar_en_empresa: seg_familiar.value,
            detalle_familiar_empresa: seg_familiar_nombre.value.trim(),
            info_falsa: seg_falsa.value,
            acepta_poligrafo: seg_poligrafo.value,
            observaciones: seg_observaciones.value.trim(),
            califica_para_cargo: seg_califica.value.trim(),
            fortalezas: seg_fortal.value.trim(),
            aspectos_mejorar: seg_mejorar.value.trim(),
            resolucion_problemas: seg_resolucion.value.trim()
        };

        // ===== CAPTURAR FIRMA - VERSIÓN ÚNICA Y FINAL =====
        const firmaGuardada = sessionStorage.getItem('firma_temp');
        if (firmaGuardada && firmaGuardada.length > 1000) {
            data.firma_base64 = firmaGuardada;
            console.log('✅ Firma capturada de sessionStorage, tamaño:', firmaGuardada.length);
        } else {
            console.warn('⚠️ No hay firma guardada válida');
            // Si la firma es obligatoria, descomenta las siguientes líneas:
            // alert('Por favor dibuja tu firma antes de continuar');
            // form.dataset.submitting = "0";
            // btnSubmit.disabled = false;
            // btnNext.disabled = false;
            // btnPrev.disabled = currentStep === 0;
            // btnSubmit.innerHTML = originalSubmitHtml;
            // return;
        }

        // PREPARAR DATOS PARA EL CORREO
        const datosCorreo = {
            nombre: `${data.primer_nombre || ""} ${data.primer_apellido || ""}`.trim(),
            identificacion: data.identificacion || "",
            correo: data.correo_electronico || "",
            telefono: data.telefono || "",
            timestamp: new Date().toLocaleString("es-CO", {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        // Timeout: 30 segundos
        const controller = new AbortController();
        const timeoutMs = 30000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        // Registrar la hoja de vida
        const resp = await fetch("https://curriculum-compact-594761951101.europe-west1.run.app/api/hv/registrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeout);

        const result = await resp.json();

        if (resp.ok && result.ok) {
            // Obtener URL del PDF
            let pdf_url = "";
            if (result.pdf_url) {
                pdf_url = result.pdf_url;
            } else if (result.id_aspirante) {
                pdf_url = `https://storage.googleapis.com/hojas_vida_logyser/${data.identificacion}/CV_${data.identificacion}.pdf`;
            }
            datosCorreo.pdf_url = pdf_url;

            // Limpiar la firma guardada después de enviar
            sessionStorage.removeItem('firma_temp');

            alert("✅ Hoja de vida registrada correctamente.");

            // Resetear el formulario
            if (typeof resetFormToInitialState === "function") {
                resetFormToInitialState();
            } else {
                location.reload();
            }
        } else {
            const msg = (result && result.error) ? result.error : "Ocurrió un error guardando la hoja de vida.";
            alert("⚠ " + msg);
        }
    } catch (err) {
        console.error("Error en submit HV:", err);
        if (err.name === "AbortError") {
            alert("⚠ Tiempo de espera agotado (30s). Intenta nuevamente.");
        } else {
            alert("⚠ Error de conexión con el servidor.");
        }
    } finally {
        // Desbloquear UI
        form.dataset.submitting = "0";
        btnSubmit.disabled = false;
        btnNext.disabled = false;
        btnPrev.disabled = currentStep === 0;
        btnSubmit.innerHTML = originalSubmitHtml;
    }
});

function prellenarDatosPersonales() {
    // Lo que se guardó en el paso 0
    const tipo = sessionStorage.getItem("tipo_ingreso");
    const id = sessionStorage.getItem("id_ingreso");
    const form = document.getElementById("hv-form");

    console.log("prellenarDatosPersonales ejecutado:", { tipo, id });

    // Helper para crear/actualizar hidden inputs
    function ensureHidden(name, idEl, value) {
        let hid = document.getElementById(idEl);
        if (!hid) {
            hid = document.createElement("input");
            hid.type = "hidden";
            hid.id = idEl;
            hid.name = name;
            form.appendChild(hid);
        }
        hid.value = value || "";
    }

    // === Tipo de documento (Paso 2) ===
    if (tipo) {
        const selectTipo = document.getElementById("tipo_documento");
        if (selectTipo) {
            selectTipo.value = tipo;
            // Asegurar que el select tenga la opción disponible
            if (selectTipo.value !== tipo) {
                // Si el valor no está disponible en las opciones, agregarlo
                const optionExists = Array.from(selectTipo.options).some(opt => opt.value === tipo);
                if (!optionExists && tipo) {
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

    // === Número de identificación (Paso 2) ===
    if (id) {
        const inputId = document.getElementById("identificacion");
        if (inputId) {
            inputId.value = id;
            inputId.setAttribute("readonly", true);
            ensureHidden("identificacion", "hidden_identificacion", id);
        }
    }
}

// Modificar el event listener para que se ejecute cada vez que cambiamos al paso 2
document.addEventListener("tipos-cargados", prellenarDatosPersonales);

// También ejecutar prellenarDatosPersonales cuando se muestra el paso 2
const originalShowStep = showStep;
showStep = function (index) {
    originalShowStep(index);

    if (index === 6) {
        setTimeout(() => {
            // forceResizeSignature(); // Comentado porque no existe
            if (typeof setupSignature === 'function') {
                setupSignature();
            }
        }, 200);
    }

    // Si estamos mostrando el paso 2, asegurar que los datos de ingreso estén visibles
    if (index === 2) {
        setTimeout(() => {
            updateIngresoLabel();
            prellenarDatosPersonales();

            // Forzar la validación para que no marque error
            const tipoInput = document.getElementById("tipo_documento");
            const idInput = document.getElementById("identificacion");

            if (tipoInput && tipoInput.value) {
                tipoInput.style.borderColor = "var(--border)";
            }
            if (idInput && idInput.value) {
                idInput.style.borderColor = "var(--border)";
            }
        }, 100);
    }
};
document.addEventListener("tipos-cargados", prellenarDatosPersonales);

// ⭐ Cargar tipos de identificación dinámicos para el Paso 0 ⭐
async function cargarTiposPaso0() {
    try {
        const res = await fetch("https://curriculum-compact-594761951101.europe-west1.run.app/api/config/tipo-identificacion");
        const tipos = await res.json();

        const select = document.getElementById("tipo_documento_ingreso");
        select.innerHTML = `<option value="">Selecciona...</option>`;

        tipos.forEach(t => {
            select.innerHTML += `
          <option value="${t.descripcion}">${t.descripcion}</option>
        `;
        });

    } catch (err) {
        console.error("Error cargando tipos de identificación para Paso 0:", err);
    }
}
// Sincroniza visualmente el ingreso (tipo + identificación) en Paso 2
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

            // Marcar campo visible como no editable en Paso 2
            const tipoMain = document.getElementById("tipo_documento");
            const identMain = document.getElementById("identificacion");
            if (tipoMain) tipoMain.setAttribute("disabled", true);
            if (identMain) identMain.setAttribute("readonly", true);

            // Asegurar hidden inputs para envío (si no existen, crearlos)
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

// Si validarIngreso se ejecutó antes de que la función exista, la ejecutamos ahora
if (window._pendingUpdateIngreso) {
    try { updateIngresoLabel(); } catch (err) { console.error(err); }
    window._pendingUpdateIngreso = false;
}

// Editar ingreso: limpiar y volver al paso 0
const editBtn = document.getElementById("edit-ingreso");
if (editBtn) {
    editBtn.addEventListener("click", () => {
        sessionStorage.removeItem("tipo_ingreso");
        sessionStorage.removeItem("id_ingreso");

        // Quitar hidden inputs si existen
        const hidTipo = document.getElementById("hidden_tipo_documento");
        if (hidTipo) hidTipo.remove();
        const hidId = document.getElementById("hidden_identificacion");
        if (hidId) hidId.remove();

        // Re-habilitar campos en paso 2
        const tipoMain = document.getElementById("tipo_documento");
        const identMain = document.getElementById("identificacion");
        if (tipoMain) { tipoMain.removeAttribute("disabled"); tipoMain.value = ""; }
        if (identMain) { identMain.removeAttribute("readonly"); identMain.value = ""; }

        // Ocultar summary y volver a paso 0
        const wrap = document.getElementById("ingreso-summary");
        if (wrap) wrap.style.display = "none";
        showStep(0);
    });
}
// Cuando el DOM esté listo cargamos ambos pasos
document.addEventListener("DOMContentLoaded", () => {
    inicializarSelects();
    cargarTiposPaso0();

    // Asegurar que la etiqueta de ingreso se actualice al cargar la página
    setTimeout(() => {
        if (typeof updateIngresoLabel === "function") updateIngresoLabel();
    }, 200);
});

async function enviarCorreoAspirante(datosAspirante) {
    try {
        const response = await fetch('https://curriculum-compact-594761951101.europe-west1.run.app/api/correo/aspirante', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosAspirante)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Correo enviado éxitosamente', result);
            return result;
        } else {
            throw new Error('Error al enviar el correo')
        }
    } catch (e) {
        console.error('Error:', e);
        throw e;
    }
}

function prepararDatosCorreo() {
    const nombre = document.getElementById('primer_nombre')?.value + ' ' +
        document.getElementById('segundo_nombre')?.value + ' ' +
        document.getElementById('primer_apellido')?.value + ' ' +
        document.getElementById('segundo_apellido')?.value;

    const identificacion = document.getElementById('identificacion')?.value;
    const correo = document.getElementById('correo_electronico')?.value;
    const telefono = document.getElementById('telefono')?.value;
}

// ===== FIRMA - VERSIÓN FINAL =====
let canvas, ctx;
let drawing = false;

// Hacer clearSignature global para el botón
window.clearSignature = function () {
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sessionStorage.removeItem('firma_temp');
    console.log('Firma limpiada');
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

    // Restaurar firma si existe
    const firmaGuardada = sessionStorage.getItem('firma_temp');
    if (firmaGuardada) {
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
        if (firmaBase64.length > 1000) {
            sessionStorage.setItem('firma_temp', firmaBase64);
            console.log('✅ Firma guardada, tamaño:', firmaBase64.length);
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

// Inicializar
document.addEventListener("DOMContentLoaded", function () {
    setTimeout(setupSignature, 500);
});