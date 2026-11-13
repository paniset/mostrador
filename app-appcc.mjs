import { DIAS_SEMANA, EJEMPLO, INICIALES, MESES, UMBRAL_POLARES, diaSemana, diasDelMes, diasPrevistos, paginar, paginarEquipos, rotuloFrecuencia, rotuloRango, validarEquipo } from './appcc.mjs';
import { conectarRecordar, h, memoria } from './ui.mjs';

const $ = id => document.getElementById(id);
const mem = memoria('appcc');
const vacio = () => ({ local: '', equipos: [{ nombre: '', min: 0, max: 4 }], zonas: [{ nombre: '', frecuencia: 'diaria', dia: 0, producto: '' }], freidoras: [], lecturas: 2, incluir: { temp: true, limp: true, aceite: true, recep: true } });

function normalizar(d) {
  const base = vacio();
  if (!d || typeof d !== 'object') return base;
  const txt = (v, n) => String(v ?? '').slice(0, n);
  return {
    local: txt(d.local, 60),
    equipos: Array.isArray(d.equipos) ? d.equipos.slice(0, 24).map(e => ({ nombre: txt(e?.nombre, 40), min: e?.min ?? null, max: e?.max ?? '' })) : base.equipos,
    zonas: Array.isArray(d.zonas) ? d.zonas.slice(0, 40).map(z => ({
      nombre: txt(z?.nombre, 50), producto: txt(z?.producto, 50),
      frecuencia: ['diaria', 'semanal', 'mensual'].includes(z?.frecuencia) ? z.frecuencia : 'diaria',
      dia: Number.isInteger(z?.dia) && z.dia >= 0 && z.dia <= 6 ? z.dia : 0,
    })) : base.zonas,
    freidoras: Array.isArray(d.freidoras) ? d.freidoras.slice(0, 8).map(f => txt(f, 30)).filter(Boolean) : [],
    lecturas: d.lecturas === 1 ? 1 : 2,
    incluir: Object.fromEntries(Object.keys(base.incluir).map(k => [k, d.incluir && typeof d.incluir === 'object' && k in d.incluir ? Boolean(d.incluir[k]) : base.incluir[k]])),
  };
}

const demo = new URLSearchParams(location.search).has('ejemplo');
let estado = normalizar(demo ? { ...EJEMPLO, lecturas: 2 } : mem.leer());
const guardarSiProcede = conectarRecordar($('recordar'), mem, () => estado, $('aviso-memoria'));
// Con ?ejemplo no se toca lo guardado.
const guardar = () => { if (!demo) guardarSiProcede(); };

function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function mesElegido() {
  const m = /^(\d{4})-(\d{2})$/.exec($('mes').value || '');
  if (!m) return null;
  const anio = Number(m[1]), mes = Number(m[2]);
  return anio >= 2000 && anio <= 2100 && mes >= 1 && mes <= 12 ? { anio, mes } : null;
}

const quitar = (lista, i, nuevo) => () => { lista.splice(i, 1); if (!lista.length) lista.push(nuevo()); pintarFormulario(); actualizar(); };

function pintarFormulario() {
  $('equipos').replaceChildren(...estado.equipos.map((eq, i) => h('fieldset', { class: 'fila-equipo' },
    h('legend', {}, `Equipo ${i + 1}`),
    h('label', { class: 'ancho' }, 'Nombre', h('input', { type: 'text', maxlength: 40, value: eq.nombre, placeholder: 'Cámara de carnes', autocomplete: 'off', oninput: e => { eq.nombre = e.target.value; actualizar(); } })),
    h('label', {}, 'Mín. °C', h('input', { type: 'text', inputmode: 'decimal', value: eq.min ?? '', placeholder: 'vacío = sin mínimo', oninput: e => { eq.min = e.target.value.trim() === '' ? null : e.target.value; actualizar(); } })),
    h('label', {}, 'Máx. °C', h('input', { type: 'text', inputmode: 'decimal', value: eq.max ?? '', oninput: e => { eq.max = e.target.value; actualizar(); } })),
    h('button', { type: 'button', class: 'btn-quitar', onclick: quitar(estado.equipos, i, () => ({ nombre: '', min: 0, max: 4 })) }, `Quitar equipo ${i + 1}`))));

  $('zonas').replaceChildren(...estado.zonas.map((z, i) => h('fieldset', { class: 'fila-zona' },
    h('legend', {}, `Zona ${i + 1}`),
    h('label', { class: 'ancho' }, 'Zona o equipo', h('input', { type: 'text', maxlength: 50, value: z.nombre, placeholder: 'Suelos de cocina', autocomplete: 'off', oninput: e => { z.nombre = e.target.value; actualizar(); } })),
    h('label', {}, 'Frecuencia', h('select', { onchange: e => { z.frecuencia = e.target.value; pintarFormulario(); actualizar(); } },
      ['diaria', 'semanal', 'mensual'].map(f => h('option', { value: f, selected: z.frecuencia === f }, f[0].toUpperCase() + f.slice(1))))),
    z.frecuencia === 'diaria' ? null : h('label', {}, z.frecuencia === 'semanal' ? 'Cada' : 'El primer', h('select', { onchange: e => { z.dia = Number(e.target.value); actualizar(); } },
      DIAS_SEMANA.map((d, n) => h('option', { value: n, selected: z.dia === n }, d)))),
    h('label', { class: 'ancho' }, 'Producto (opcional)', h('input', { type: 'text', maxlength: 50, value: z.producto, autocomplete: 'off', oninput: e => { z.producto = e.target.value; actualizar(); } })),
    h('button', { type: 'button', class: 'btn-quitar', onclick: quitar(estado.zonas, i, () => ({ nombre: '', frecuencia: 'diaria', dia: 0, producto: '' })) }, `Quitar zona ${i + 1}`))));

  $('freidoras').value = estado.freidoras.join(', ');
  $('lecturas').value = String(estado.lecturas);
  for (const k of Object.keys(estado.incluir)) $(`inc-${k}`).checked = estado.incluir[k];
  for (const k of Object.keys(estado.incluir)) $(`bloque-${k}`).hidden = !estado.incluir[k];
}

const titulo = (texto, local, mes) => h('header', { class: 'hoja-cab' }, h('h3', {}, texto),
  h('p', {}, h('span', {}, local || 'Nombre del local'), h('span', {}, mes ? `${MESES[mes.mes - 1]} de ${mes.anio}` : 'Mes: ________')));

function hojasTemperaturas(mes, equipos) {
  const dias = diasDelMes(mes.anio, mes.mes);
  const lect = estado.lecturas;
  return paginarEquipos(equipos, lect).map((grupo, n, todas) => h('section', { class: 'hoja hoja-temp', 'aria-label': 'Registro de temperaturas' },
    titulo(`Registro de temperaturas de cámaras y neveras${todas.length > 1 ? ` (${n + 1}/${todas.length})` : ''}`, estado.local, mes),
    h('div', { class: 'desliza' }, h('table', { class: 'reg' },
      h('thead', {},
        h('tr', {}, h('th', { rowspan: lect === 2 ? 2 : 1, scope: 'col' }, 'Día'),
          grupo.map(eq => h('th', { colspan: lect, scope: 'colgroup' }, eq.nombre, h('br'), h('small', {}, rotuloRango(eq)))),
          h('th', { rowspan: lect === 2 ? 2 : 1, scope: 'col', class: 'col-inc' }, 'Incidencia y medida tomada'),
          h('th', { rowspan: lect === 2 ? 2 : 1, scope: 'col', class: 'col-firma' }, 'Firma')),
        lect === 2 ? h('tr', {}, grupo.map(() => [h('th', { scope: 'col' }, 'Mañana'), h('th', { scope: 'col' }, 'Tarde')])) : null),
      h('tbody', {}, Array.from({ length: dias }, (_, i) => h('tr', { class: diaSemana(mes.anio, mes.mes, i + 1) === 6 ? 'domingo' : '' },
        h('th', { scope: 'row' }, `${INICIALES[diaSemana(mes.anio, mes.mes, i + 1)]} ${i + 1}`),
        grupo.map(() => Array.from({ length: lect }, () => h('td', {}, ''))),
        h('td', {}, ''), h('td', {}, '')))))),
    h('p', { class: 'nota-hoja' }, 'Anota la temperatura en °C. Si una lectura queda fuera del rango, escribe qué has hecho (revisar el equipo, trasladar el género, desecharlo…).')));
}

function hojasLimpieza(mes, zonas) {
  const dias = diasDelMes(mes.anio, mes.mes);
  return paginar(zonas, 14).map((grupo, n, todas) => h('section', { class: 'hoja apaisada hoja-limp', 'aria-label': 'Registro de limpieza' },
    titulo(`Registro de limpieza y desinfección${todas.length > 1 ? ` (${n + 1}/${todas.length})` : ''}`, estado.local, mes),
    h('div', { class: 'desliza' }, h('table', { class: 'reg reg-limp' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'col-zona' }, 'Zona · producto'), h('th', { scope: 'col', class: 'col-frec' }, 'Frecuencia'),
        Array.from({ length: dias }, (_, i) => h('th', { scope: 'col', class: 'col-dia' }, INICIALES[diaSemana(mes.anio, mes.mes, i + 1)], h('br'), String(i + 1))))),
      h('tbody', {}, grupo.map(z => {
        const toca = new Set(diasPrevistos(z.frecuencia, mes.anio, mes.mes, z.dia));
        return h('tr', {}, h('th', { scope: 'row', class: 'col-zona' }, z.nombre, z.producto ? [h('br'), h('small', {}, z.producto)] : null),
          h('td', { class: 'col-frec' }, rotuloFrecuencia(z.frecuencia, z.dia)),
          Array.from({ length: dias }, (_, i) => h('td', { class: toca.has(i + 1) ? 'toca' : 'no-toca' }, '')));
      })))),
    h('p', { class: 'nota-hoja' }, 'Pon tus iniciales en la casilla blanca cuando la tarea esté hecha. Las casillas grises son días en que no toca. Observaciones: ______________________________________________')));
}

function filasEnBlanco(n, columnas) {
  return Array.from({ length: n }, () => h('tr', {}, Array.from({ length: columnas }, () => h('td', {}, ''))));
}

function hojaAceite(mes) {
  const cols = [['Fecha', 10], ['Freidora', 14], ['Compuestos polares (%)', 12], [`¿Apto? (< ${UMBRAL_POLARES} %)`, 10], ['Cambio de aceite', 10], ['Observaciones', 32], ['Firma', 12]];
  return h('section', { class: 'hoja hoja-aceite', 'aria-label': 'Control del aceite de fritura' },
    titulo('Control del aceite de fritura', estado.local, mes),
    h('p', { class: 'nota-hoja' }, estado.freidoras.length ? `Freidoras: ${estado.freidoras.join(', ')}. ` : '',
      `Límite: compuestos polares inferiores al ${UMBRAL_POLARES} %. Si la lectura llega al ${UMBRAL_POLARES} % o lo supera, cambia el aceite y anótalo.`),
    h('table', { class: 'reg reg-blanco' }, h('thead', {}, h('tr', {}, cols.map(([c, w]) => h('th', { scope: 'col', class: `w${w}` }, c)))), h('tbody', {}, filasEnBlanco(24, cols.length))));
}

function hojaRecepcion(mes) {
  const cols = [['Fecha', 8], ['Proveedor', 16], ['Producto', 18], ['Lote', 10], ['Caducidad o consumo preferente', 10], ['T.ª (°C)', 6], ['Envase y transporte correctos', 10], ['Aceptado / rechazado', 10], ['Firma', 12]];
  return h('section', { class: 'hoja apaisada hoja-recep', 'aria-label': 'Registro de recepción de mercancía' },
    titulo('Registro de recepción de mercancía', estado.local, mes),
    h('table', { class: 'reg reg-blanco' }, h('thead', {}, h('tr', {}, cols.map(([c, w]) => h('th', { scope: 'col', class: `w${w}` }, c)))), h('tbody', {}, filasEnBlanco(16, cols.length))),
    h('p', { class: 'nota-hoja' }, 'Si rechazas un producto, anota el motivo en la fila y comunícalo al proveedor.'));
}

function actualizar() {
  const mes = mesElegido();
  const errores = [];
  const hojas = [];
  if (!mes) errores.push('Elige el mes.');
  if (estado.incluir.temp) {
    const validos = [];
    estado.equipos.forEach((eq, i) => {
      if (!String(eq.nombre).trim() && (eq.max === '' || eq.max === null)) return;
      const r = validarEquipo(eq);
      if (r.ok) validos.push(r.equipo); else errores.push(`Equipo ${i + 1}: ${r.errores.join(' ')}`);
    });
    if (!validos.length) errores.push('Temperaturas: añade al menos un equipo con nombre y temperatura máxima.');
    else if (mes) hojas.push(...hojasTemperaturas(mes, validos));
  }
  if (estado.incluir.limp) {
    const zonas = estado.zonas.filter(z => z.nombre.trim());
    if (!zonas.length) errores.push('Limpieza: añade al menos una zona.');
    else if (mes) hojas.push(...hojasLimpieza(mes, zonas));
  }
  if (estado.incluir.aceite && mes) hojas.push(hojaAceite(mes));
  if (estado.incluir.recep && mes) hojas.push(hojaRecepcion(mes));
  $('errores').replaceChildren(...errores.map(e => h('li', {}, e)));
  $('errores').hidden = errores.length === 0;
  $('hojas').replaceChildren(...(hojas.length ? hojas : [h('p', { class: 'vacio' }, 'Elige qué hojas quieres y rellena los datos para verlas aquí.')]));
  $('imprimir').disabled = hojas.length === 0;
  $('num-hojas').textContent = hojas.length ? `${hojas.length} ${hojas.length === 1 ? 'hoja' : 'hojas'} A4 listas para imprimir.` : '';
  guardar();
}

$('mes').value = mesActual();
$('local').value = estado.local;
$('local').addEventListener('input', e => { estado.local = e.target.value.slice(0, 60); actualizar(); });
$('mes').addEventListener('input', actualizar);
$('lecturas').addEventListener('change', e => { estado.lecturas = Number(e.target.value) === 1 ? 1 : 2; actualizar(); });
$('freidoras').addEventListener('input', e => { estado.freidoras = e.target.value.split(',').map(s => s.trim().slice(0, 30)).filter(Boolean).slice(0, 8); actualizar(); });
for (const k of Object.keys(estado.incluir)) {
  $(`inc-${k}`).addEventListener('change', e => { estado.incluir[k] = e.target.checked; $(`bloque-${k}`).hidden = !e.target.checked; actualizar(); });
}
$('anadir-equipo').addEventListener('click', () => { estado.equipos.push({ nombre: '', min: 0, max: 4 }); pintarFormulario(); actualizar(); });
$('anadir-zona').addEventListener('click', () => { estado.zonas.push({ nombre: '', frecuencia: 'diaria', dia: 0, producto: '' }); pintarFormulario(); actualizar(); });
$('ejemplo').addEventListener('click', () => {
  if ((estado.equipos.some(e => e.nombre) || estado.zonas.some(z => z.nombre)) && !window.confirm('¿Sustituir tus datos por el ejemplo?')) return;
  estado = normalizar({ ...EJEMPLO, lecturas: 2 }); $('local').value = estado.local; pintarFormulario(); actualizar();
});
$('imprimir').addEventListener('click', () => window.print());
pintarFormulario();
actualizar();
