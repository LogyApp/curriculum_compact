/* ── Preview View (paso de revisión) ────────────────────────────────────── */

function buildPreview() {
    const wrap = document.getElementById('preview-container');
    if (!wrap) return;

    recopilarEducacion();
    recopilarExp();
    recopilarHijos();
    recopilarFamiliares();

    const v = (id) => { const el = document.getElementById(id); return el ? (el.value || '').trim() : ''; };
    const siNo = (val) => (String(val) === '1' ? 'Sí' : 'No');
    const row = (label, val) => `<div class="preview-row"><div class="preview-label">${label}</div><div class="preview-value">${escapeHtml(val || '—')}</div></div>`;

    const nombreCompleto = [v('primer_nombre'), v('segundo_nombre'), v('primer_apellido'), v('segundo_apellido')].filter(Boolean).join(' ');
    const ciudadResid = [v('ciudad_residencia'), v('departamento_residencia')].filter(Boolean).join(' — ');
    const lugarNacimiento = [v('ciudad_nacimiento'), v('departamento_nacimiento'), v('pais_nacimiento')].filter(Boolean).join(' — ');
    const fotoUrl = (document.getElementById('hidden_foto_public_url')?.value || '').trim();

    const renderLista = (items, fn, empty = 'No registrado') => {
        if (!Array.isArray(items) || items.length === 0) {
            return `<div class="preview-row"><div class="preview-label"></div><div class="preview-value">${escapeHtml(empty)}</div></div>`;
        }
        return items.map((it, i) => `
            <div class="preview-row">
              <div class="preview-label">${i + 1}.</div>
              <div class="preview-value">${fn(it)}</div>
            </div>`).join('');
    };

    const refs = [
        { tipo_referencia: 'Laboral', empresa: v('ref_lab_empresa'), jefe_inmediato: v('ref_lab_jefe'), cargo_jefe: v('ref_lab_cargo'), telefono: v('ref_lab_tel') },
        { tipo_referencia: 'Familiar', nombre_completo: v('ref_fam_nombre'), parentesco: v('ref_fam_parentesco'), telefono: v('ref_fam_tel'), ocupacion: v('ref_fam_ocupacion') },
        { tipo_referencia: 'Personal', nombre_completo: v('ref_per_nombre'), relacion: v('ref_per_relacion'), telefono: v('ref_per_tel'), ocupacion: v('ref_per_ocupacion') }
    ].filter(r => Object.values(r).some(x => (x || '').trim() !== ''));

    const seccion = (titulo, pillVal, contenido) => `
        <div class="preview-section">
          <details>
            <summary>${titulo}${pillVal !== undefined ? `<span class="preview-pill">${pillVal}</span>` : ''}</summary>
            <div class="preview-content">${contenido}</div>
          </details>
        </div>`;

    const bloqueDatos = seccion('Datos personales', undefined, `
        ${fotoUrl ? `<div style="padding:12px 16px;border-bottom:1px solid var(--border)"><img src="${fotoUrl}" alt="Foto" style="height:80px;border-radius:var(--r-lg);border:1px solid var(--border)"></div>` : ''}
        ${row('Nombre completo', nombreCompleto)}
        ${row('Identificación', v('identificacion'))}
        ${row('Fecha nacimiento', v('fecha_nacimiento'))}
        ${row('Lugar de nacimiento', lugarNacimiento)}
        ${row('Edad', v('edad'))}
        ${row('Ciudad residencia', ciudadResid)}
        ${row('Teléfono', v('telefono'))}
        ${row('Correo', v('correo_electronico'))}
        ${row('EPS', v('eps'))}
        ${row('AFP', v('afp'))}
        ${row('RH', v('rh'))}
        ${row('T. camisa', v('camisa_talla'))}
        ${row('T. pantalón', v('talla_pantalon'))}
        ${row('T. zapatos', v('zapatos_talla'))}`);

    const bloqueMedio = seccion('Medio de reclutamiento', undefined, `
        ${row('Medio', v('medio_reclutamiento'))}
        ${row('Recomendador', v('recomendador_aspirante'))}`);

    const bloqueEduc = seccion('Educación', educacionData.length, renderLista(educacionData, e =>
        `<strong>${escapeHtml(e.institucion || '—')}</strong> — ${escapeHtml(e.programa || '—')}<br>
         <span style="color:var(--text-mid);font-size:11px">Nivel: ${escapeHtml(e.nivel_escolaridad || '—')} | Modalidad: ${escapeHtml(e.modalidad || '—')} | Año: ${escapeHtml(String(e.ano || '—'))} | Finalizado: ${escapeHtml(String(e.finalizado ?? '—'))}</span>`));

    const bloqueExp = seccion('Experiencia', expData.length, renderLista(expData, x =>
        `<strong>${escapeHtml(x.empresa || '—')}</strong> — ${escapeHtml(x.cargo || '—')}<br>
         <span style="color:var(--text-mid);font-size:11px">Año: ${escapeHtml(String(x.ano_experiencia || '—'))} | Tiempo: ${escapeHtml(x.tiempo_laborado || '—')} | Salario: ${escapeHtml(x.salario || '—')}</span>`));

    const bloqueHijos = hijosData.length > 0
        ? seccion('Hijos', hijosData.length, renderLista(hijosData, h =>
            `<strong>${escapeHtml(h.nombre_completo || '—')}</strong>
             <span style="color:var(--text-mid);font-size:11px"> | Edad: ${escapeHtml(String(h.edad || '—'))} | Conviven: ${String(h.conviven_juntos) === '1' ? 'Sí' : 'No'}</span>`))
        : '';

    const bloqueFam = seccion('Familiares', familiaresData.length, renderLista(familiaresData, f =>
        `<strong>${escapeHtml(f.nombre_completo || '—')}</strong> — ${escapeHtml(f.parentesco || '—')}<br>
         <span style="color:var(--text-mid);font-size:11px">Edad: ${escapeHtml(String(f.edad || '—'))} | Ocupación: ${escapeHtml(f.ocupacion || '—')}</span>`));

    const bloqueRefs = seccion('Referencias', refs.length, renderLista(refs, r => {
        const partes = [
            r.empresa ? `Empresa: ${escapeHtml(r.empresa)}` : '',
            r.jefe_inmediato ? `Jefe: ${escapeHtml(r.jefe_inmediato)}` : '',
            r.nombre_completo ? `Nombre: ${escapeHtml(r.nombre_completo)}` : '',
            r.parentesco ? `Parentesco: ${escapeHtml(r.parentesco)}` : '',
            r.relacion ? `Relación: ${escapeHtml(r.relacion)}` : '',
            r.ocupacion ? `Ocupación: ${escapeHtml(r.ocupacion)}` : '',
            r.telefono ? `Tel: ${escapeHtml(r.telefono)}` : ''
        ].filter(Boolean).join(' | ');
        return `<strong>${escapeHtml(r.tipo_referencia)}</strong><br><span style="color:var(--text-mid);font-size:11px">${partes}</span>`;
    }));

    const bloqueEmer = seccion('Contacto de emergencia', undefined, `
        ${row('Nombre', v('emer_nombre'))}
        ${row('Parentesco', v('emer_parentesco'))}
        ${row('Teléfono', v('emer_telefono'))}
        ${row('Correo', v('emer_correo'))}
        ${row('Dirección', v('emer_direccion'))}`);

    const bloqueMetas = seccion('Metas personales', undefined, `
        ${row('Corto plazo', v('meta_corto'))}
        ${row('Mediano plazo', v('meta_mediano'))}
        ${row('Largo plazo', v('meta_largo'))}`);

    const cuestionario = [
        ['Llamados de atención', siNo(v('seg_llamados')), v('seg_detalle_llamados')],
        ['Accidente laboral', siNo(v('seg_accidente')), v('seg_detalle_accidente')],
        ['Enfermedad importante', siNo(v('seg_enfermedad')), v('seg_detalle_enfermedad')],
        ['Consume alcohol', siNo(v('seg_alcohol')), v('seg_frecuencia')],
        ['Familiar en empresa', siNo(v('seg_familiar')), v('seg_familiar_nombre')],
        ['Info falsa', siNo(v('seg_falsa')), ''],
        ['Acepta polígrafo', siNo(v('seg_poligrafo')), '']
    ];

    const bloqueSeg = seccion('Cuestionario y seguridad', undefined,
        cuestionario.map(([titulo, val, detalle]) =>
            `${row(titulo, val)}${detalle ? row('Detalle', detalle) : ''}`
        ).join('') +
        row('Observaciones', v('seg_observaciones')) +
        row('Por qué califica', v('seg_califica')) +
        row('Fortalezas', v('seg_fortal')) +
        row('Aspectos a mejorar', v('seg_mejorar')) +
        row('Resolución de situaciones', v('seg_resolucion'))
    );

    wrap.innerHTML = bloqueDatos + bloqueMedio + bloqueEduc + bloqueExp + bloqueHijos + bloqueFam + bloqueRefs + bloqueEmer + bloqueMetas + bloqueSeg;
}
