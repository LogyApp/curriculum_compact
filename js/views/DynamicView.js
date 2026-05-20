/* ── Dynamic cards: Educación, Experiencia, Familiares ──────────────────── */

/* ── EDUCACIÓN ──────────────────────────────────────────────────────────── */
function crearCardEducacion(index, data = {}) {
  const finalizadoVal = data.finalizado !== undefined ? String(data.finalizado) : '1';
  return `
    <div class="educ-card" data-index="${index}">
      <div class="educ-grid">
        <div class="field">
          <label>Institución <span class="required">*</span></label>
          <input type="text" class="educ-institucion" value="${escapeHtml(data.institucion || '')}" data-required="true">
          <div class="field-error" id="error-educ-institucion-${index}"></div>
        </div>
        <div class="field">
          <label>Programa <span class="required">*</span></label>
          <input type="text" class="educ-programa" value="${escapeHtml(data.programa || '')}" data-required="true">
          <div class="field-error" id="error-educ-programa-${index}"></div>
        </div>
        <div class="field">
          <label>Nivel de escolaridad <span class="required">*</span></label>
          <select class="educ-nivel" data-required="true">
            <option value="">Selecciona</option>
            <option value="bachiller"        ${data.nivel_escolaridad === 'bachiller' ? 'selected' : ''}>Bachiller</option>
            <option value="tecnico"          ${data.nivel_escolaridad === 'tecnico' ? 'selected' : ''}>Técnico</option>
            <option value="tecnologo"        ${data.nivel_escolaridad === 'tecnologo' ? 'selected' : ''}>Tecnólogo</option>
            <option value="tecnico_superior" ${data.nivel_escolaridad === 'tecnico_superior' ? 'selected' : ''}>Técnico Superior</option>
            <option value="profesional"      ${data.nivel_escolaridad === 'profesional' ? 'selected' : ''}>Profesional</option>
            <option value="especializacion"  ${data.nivel_escolaridad === 'especializacion' ? 'selected' : ''}>Especialización</option>
            <option value="maestria"         ${data.nivel_escolaridad === 'maestria' ? 'selected' : ''}>Maestría</option>
            <option value="doctorado"        ${data.nivel_escolaridad === 'doctorado' ? 'selected' : ''}>Doctorado</option>
            <option value="otro"             ${data.nivel_escolaridad === 'otro' ? 'selected' : ''}>Otro</option>
          </select>
          <div class="field-error" id="error-educ-nivel-${index}"></div>
        </div>
        <div class="field">
          <label>Modalidad</label>
          <select class="educ-modalidad">
            <option value="">Selecciona</option>
            <option value="presencial" ${data.modalidad === 'presencial' ? 'selected' : ''}>Presencial</option>
            <option value="virtual"    ${data.modalidad === 'virtual' ? 'selected' : ''}>Virtual</option>
            <option value="distancia"  ${data.modalidad === 'distancia' ? 'selected' : ''}>A distancia</option>
          </select>
        </div>
        <div class="field">
          <label>Año</label>
          <input type="number" class="educ-ano" min="1950" max="2050" value="${escapeHtml(String(data.ano || ''))}">
        </div>
        <div class="field">
          <label>Finalizado</label>
          <select class="educ-finalizado">
            <option value="1" ${finalizadoVal === '1' ? 'selected' : ''}>Sí</option>
            <option value="0" ${finalizadoVal === '0' ? 'selected' : ''}>No</option>
            <option value="2" ${finalizadoVal === '2' ? 'selected' : ''}>En curso</option>
          </select>
        </div>
      </div>
      ${educacionData.length > 1 ? `
      <button type="button" class="educ-remove" onclick="eliminarEducacion(${index})">
        ${ICONS.trash} Eliminar
      </button>` : ''}
    </div>`;
}

function renderEducacion() {
  const list = document.getElementById('educacion-list');
  if (!list) return;
  list.innerHTML = '';
  educacionData.forEach((item, i) => { list.innerHTML += crearCardEducacion(i, item); });
}

function recopilarEducacion() {
  const cards = document.querySelectorAll('.educ-card');
  educacionData = Array.from(cards).map(card => ({
    institucion: sanitizarString(card.querySelector('.educ-institucion')?.value || ''),
    programa: sanitizarString(card.querySelector('.educ-programa')?.value || ''),
    nivel_escolaridad: card.querySelector('.educ-nivel')?.value || '',
    modalidad: card.querySelector('.educ-modalidad')?.value || '',
    ano: card.querySelector('.educ-ano')?.value || '',
    finalizado: card.querySelector('.educ-finalizado')?.value || '1'
  })).filter(e => e.institucion || e.programa);
  return educacionData;
}

function eliminarEducacion(index) {
  educacionData.splice(index, 1);
  renderEducacion();
}
window.eliminarEducacion = eliminarEducacion;

/* ── EXPERIENCIA ────────────────────────────────────────────────────────── */
function crearCardExp(index, data = {}) {
  return `
    <div class="exp-card" data-index="${index}">
      <div class="exp-grid">
        <div class="field">
          <label>Empresa <span class="required">*</span></label>
          <input type="text" class="exp-empresa" value="${escapeHtml(data.empresa || '')}" data-required="true">
          <div class="field-error" id="error-exp-empresa-${index}"></div>
        </div>
        <div class="field">
          <label>Cargo <span class="required">*</span></label>
          <input type="text" class="exp-cargo" value="${escapeHtml(data.cargo || '')}" data-required="true">
          <div class="field-error" id="error-exp-cargo-${index}"></div>
        </div>
        <div class="field">
          <label>Año inicio</label>
          <input type="number" class="exp-ano" min="1950" max="2050" step="1" value="${escapeHtml(String(data.ano_experiencia || ''))}">
        </div>
        <div class="field">
          <label>Tiempo laborado</label>
          <input type="text" class="exp-tiempo" value="${escapeHtml(data.tiempo_laborado || '')}">
        </div>
        <div class="field">
          <label>Salario</label>
          <input type="text" class="exp-salario" value="${escapeHtml(data.salario || '')}">
        </div>
        <div class="field">
          <label>Motivo de retiro</label>
          <input type="text" class="exp-motivo" value="${escapeHtml(data.motivo_retiro || '')}">
        </div>
        <div class="field" style="grid-column:span 2;">
          <label>Funciones realizadas</label>
          <textarea class="exp-funciones" rows="2">${escapeHtml(data.funciones || '')}</textarea>
        </div>
      </div>
      ${expData.length > 1 ? `
      <button type="button" class="exp-remove" onclick="eliminarExp(${index})">
        ${ICONS.trash} Eliminar
      </button>` : ''}
    </div>`;
}

function renderExp() {
  const list = document.getElementById('exp-list');
  if (!list) return;
  list.innerHTML = '';
  expData.forEach((item, i) => { list.innerHTML += crearCardExp(i, item); });
}

function recopilarExp() {
  const cards = document.querySelectorAll('.exp-card');
  expData = Array.from(cards).map(card => ({
    empresa: sanitizarString(card.querySelector('.exp-empresa')?.value || ''),
    cargo: sanitizarString(card.querySelector('.exp-cargo')?.value || ''),
    ano_experiencia: sanitizarNumero(card.querySelector('.exp-ano')?.value || ''),
    tiempo_laborado: sanitizarString(card.querySelector('.exp-tiempo')?.value || ''),
    salario: sanitizarString(card.querySelector('.exp-salario')?.value || ''),
    motivo_retiro: sanitizarString(card.querySelector('.exp-motivo')?.value || ''),
    funciones: sanitizarString(card.querySelector('.exp-funciones')?.value || '')
  })).filter(e => e.empresa || e.cargo);
  return expData;
}

function eliminarExp(index) {
  expData.splice(index, 1);
  renderExp();
}
window.eliminarExp = eliminarExp;

/* ── FAMILIARES ─────────────────────────────────────────────────────────── */
function crearCardFamiliar(index, data = {}) {
  const convivenVal = data.conviven_juntos !== undefined ? String(data.conviven_juntos) : '1';
  return `
    <div class="fam-card" data-index="${index}">
      <div class="fam-grid">
        <div class="field">
          <label>Nombre completo <span class="required">*</span></label>
          <input type="text" class="fam-nombre" value="${escapeHtml(data.nombre_completo || '')}" data-required="true">
          <div class="field-error" id="error-fam-nombre-${index}"></div>
        </div>
        <div class="field">
          <label>Parentesco <span class="required">*</span></label>
          <input type="text" class="fam-parentesco" value="${escapeHtml(data.parentesco || '')}" data-required="true">
          <div class="field-error" id="error-fam-parentesco-${index}"></div>
        </div>
        <div class="field">
          <label>Edad</label>
          <input type="number" class="fam-edad" min="0" max="120" value="${escapeHtml(String(data.edad || ''))}">
        </div>
        <div class="field">
          <label>Ocupación</label>
          <input type="text" class="fam-ocupacion" value="${escapeHtml(data.ocupacion || '')}">
        </div>
        <div class="field">
          <label>Conviven juntos</label>
          <select class="fam-conviven">
            <option value="1" ${convivenVal === '1' ? 'selected' : ''}>Sí</option>
            <option value="0" ${convivenVal === '0' ? 'selected' : ''}>No</option>
          </select>
        </div>
      </div>
      ${familiaresData.length > 1 ? `
      <button type="button" class="fam-remove" onclick="eliminarFamiliar(${index})">
        ${ICONS.trash} Eliminar
      </button>` : ''}
    </div>`;
}

function renderFamiliares() {
  const list = document.getElementById('fam-list');
  if (!list) return;
  list.innerHTML = '';
  familiaresData.forEach((item, i) => { list.innerHTML += crearCardFamiliar(i, item); });
}

function recopilarFamiliares() {
  const cards = document.querySelectorAll('.fam-card');
  familiaresData = Array.from(cards).map(card => ({
    nombre_completo: sanitizarString(card.querySelector('.fam-nombre')?.value || ''),
    parentesco: sanitizarString(card.querySelector('.fam-parentesco')?.value || ''),
    edad: card.querySelector('.fam-edad')?.value || '',
    ocupacion: sanitizarString(card.querySelector('.fam-ocupacion')?.value || ''),
    conviven_juntos: card.querySelector('.fam-conviven')?.value || '1'
  })).filter(f => f.nombre_completo || f.parentesco);
  return familiaresData;
}

function eliminarFamiliar(index) {
  familiaresData.splice(index, 1);
  renderFamiliares();
}
window.eliminarFamiliar = eliminarFamiliar;

/* ── HIJOS (opcional — arranca vacío) ───────────────────────────────────── */
function crearCardHijo(index, data = {}) {
  const convivenVal = data.conviven_juntos !== undefined ? String(data.conviven_juntos) : '1';
  return `
    <div class="hijo-card" data-index="${index}">
      <div class="hijo-grid">
        <div class="field">
          <label>Nombre completo <span class="required">*</span></label>
          <input type="text" class="hijo-nombre" value="${escapeHtml(data.nombre_completo || '')}" data-required="true">
          <div class="field-error" id="error-hijo-nombre-${index}"></div>
        </div>
        <div class="field">
          <label>Edad</label>
          <input type="number" class="hijo-edad" min="0" max="30" value="${escapeHtml(String(data.edad || ''))}">
        </div>
        <div class="field">
          <label>¿Conviven juntos?</label>
          <select class="hijo-conviven">
            <option value="1" ${convivenVal === '1' ? 'selected' : ''}>Sí</option>
            <option value="0" ${convivenVal === '0' ? 'selected' : ''}>No</option>
          </select>
        </div>
      </div>
      <button type="button" class="hijo-remove" onclick="eliminarHijo(${index})">
        ${ICONS.trash} Eliminar hijo
      </button>
    </div>`;
}

function renderHijos() {
  const list = document.getElementById('hijo-list');
  const emptyMsg = document.getElementById('hijo-empty-msg');
  if (!list) return;
  list.innerHTML = '';
  if (hijosData.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';
  hijosData.forEach((item, i) => { list.innerHTML += crearCardHijo(i, item); });
}

function recopilarHijos() {
  const cards = document.querySelectorAll('.hijo-card');
  hijosData = Array.from(cards).map(card => ({
    nombre_completo: sanitizarString(card.querySelector('.hijo-nombre')?.value || ''),
    edad: card.querySelector('.hijo-edad')?.value || '',
    conviven_juntos: card.querySelector('.hijo-conviven')?.value || '1'
  })).filter(h => h.nombre_completo);
  return hijosData;
}

function eliminarHijo(index) {
  hijosData.splice(index, 1);
  renderHijos();
}
window.eliminarHijo = eliminarHijo;

/* ── Initialize default cards ───────────────────────────────────────────── */
function initDynamicLists() {
  if (educacionData.length === 0) {
    educacionData.push({ institucion: '', programa: '', nivel_escolaridad: '', modalidad: '', ano: '', finalizado: '1' });
  }
  if (expData.length === 0) {
    expData.push({ empresa: '', cargo: '', ano_experiencia: '', tiempo_laborado: '', salario: '', motivo_retiro: '', funciones: '' });
  }
  if (familiaresData.length === 0) {
    familiaresData.push({ nombre_completo: '', parentesco: '', edad: '', ocupacion: '', conviven_juntos: '1' });
  }
  // hijosData starts empty (optional section — do not add a default card)
  renderHijos();
  renderEducacion();
  renderExp();
  renderFamiliares();
}
