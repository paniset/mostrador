import { ALERGENOS, AVISO_CARTA, EJEMPLO, MAX_PLATOS, lineaPlato, normalizarCarta, porSecciones } from './alergenos.mjs';
import { conectarRecordar, copiar, fechaLarga, h, hoyISO, memoria } from './ui.mjs';

const $ = id => document.getElementById(id);
const mem = memoria('alergenos');
const demo = new URLSearchParams(location.search).has('ejemplo');
let estado = normalizarCarta((demo ? EJEMPLO : mem.leer()) || { local: '', platos: [{ nombre: '', alergenos: [], trazas: [] }] });
if (!estado.platos.length) estado.platos.push({ nombre: '', seccion: '', alergenos: [], trazas: [] });

const guardarSiProcede = conectarRecordar($('recordar'), mem, () => normalizarCarta(estado), $('aviso-memoria'));
// Con ?ejemplo no se toca lo guardado.
const guardar = () => { if (!demo) guardarSiProcede(); };

function casillas(plato, campo, i) {
  return h('div', { class: 'alergenos-check' }, ALERGENOS.map(a => {
    const id = `p${i}-${campo}-${a.id}`;
    return h('label', { for: id, class: 'chk' },
      h('input', {
        type: 'checkbox', id, checked: plato[campo].includes(a.id),
        onchange: e => {
          const otro = campo === 'alergenos' ? 'trazas' : 'alergenos';
          plato[campo] = ALERGENOS.map(x => x.id).filter(x => (x === a.id ? e.target.checked : plato[campo].includes(x)));
          if (e.target.checked && plato[otro].includes(a.id)) {
            plato[otro] = plato[otro].filter(x => x !== a.id);
            const gemelo = document.getElementById(`p${i}-${otro}-${a.id}`);
            if (gemelo) gemelo.checked = false;
          }
          actualizar();
        },
      }),
      h('span', { class: 'abbr', 'aria-hidden': 'true' }, a.corto), ' ', a.nombre);
  }));
}

function pintarFormulario() {
  const cont = $('platos');
  cont.replaceChildren(...estado.platos.map((plato, i) => h('fieldset', { class: 'plato' },
    h('legend', {}, `Plato ${i + 1}`),
    h('div', { class: 'fila2' },
      h('label', {}, 'Nombre del plato', h('input', { type: 'text', maxlength: 80, value: plato.nombre, autocomplete: 'off', oninput: e => { plato.nombre = e.target.value; actualizar(); } })),
      h('label', {}, 'Sección (opcional)', h('input', { type: 'text', maxlength: 40, value: plato.seccion || '', placeholder: 'Raciones, postres…', autocomplete: 'off', oninput: e => { plato.seccion = e.target.value; actualizar(); } }))),
    h('p', { class: 'mini' }, 'Contiene:'),
    casillas(plato, 'alergenos', i),
    h('details', { class: 'trazas', open: plato.trazas.length > 0 },
      h('summary', {}, 'Puede contener trazas (opcional)'),
      casillas(plato, 'trazas', i)),
    h('button', { type: 'button', class: 'btn-quitar', onclick: () => { estado.platos.splice(i, 1); if (!estado.platos.length) estado.platos.push({ nombre: '', seccion: '', alergenos: [], trazas: [] }); pintarFormulario(); actualizar(); } }, `Quitar plato ${i + 1}`))));
  $('anadir').disabled = estado.platos.length >= MAX_PLATOS;
}

function hojaTabla(carta) {
  const fecha = fechaLarga(hoyISO());
  const cabecera = h('tr', {}, h('th', { scope: 'col', class: 'col-plato' }, 'Plato'),
    ALERGENOS.map(a => h('th', { scope: 'col', class: 'col-al', title: a.nombre }, h('span', { class: 'vertical' }, a.nombre), h('span', { class: 'abbr' }, a.corto))));
  const filas = [];
  for (const grupo of porSecciones(carta.platos)) {
    if (grupo.seccion) filas.push(h('tr', { class: 'seccion' }, h('th', { colspan: 15, scope: 'colgroup' }, grupo.seccion)));
    for (const p of grupo.platos) {
      filas.push(h('tr', {}, h('th', { scope: 'row', class: 'col-plato' }, p.nombre),
        ALERGENOS.map(a => {
          if (p.alergenos.includes(a.id)) return h('td', { class: 'si' }, h('span', { 'aria-label': `Contiene ${a.nombre}` }, '●'));
          if (p.trazas.includes(a.id)) return h('td', { class: 'trz' }, h('span', { 'aria-label': `Puede contener trazas de ${a.nombre}` }, 'T'));
          return h('td', {}, '');
        })));
    }
  }
  return h('section', { class: 'hoja', 'aria-label': 'Tabla de alérgenos para imprimir' },
    h('header', { class: 'hoja-cab' }, h('h3', {}, 'Información sobre alérgenos'), h('p', {}, carta.local || 'Nombre del local')),
    h('div', { class: 'desliza' }, h('table', { class: 'tabla-al' }, h('thead', {}, cabecera), h('tbody', {}, filas))),
    h('p', { class: 'leyenda' }, h('strong', {}, '●'), ' contiene · ', h('strong', {}, 'T'), ' puede contener trazas'),
    h('ul', { class: 'leyenda-lista' }, ALERGENOS.map(a => h('li', {}, h('strong', {}, a.corto), ` ${a.detalle}.`))),
    h('p', { class: 'pie-hoja' }, `${AVISO_CARTA} Información elaborada por el establecimiento. Actualizada el ${fecha}.`));
}

function hojaCartel(carta) {
  return h('section', { class: 'hoja cartel-aviso', 'aria-label': 'Cartel de aviso para imprimir' },
    h('p', { class: 'cartel-titulo' }, 'Alergias e intolerancias alimentarias'),
    h('p', { class: 'cartel-texto' }, 'Si tiene alguna alergia o intolerancia, consulte al personal.'),
    h('p', { class: 'cartel-sub' }, 'Le informaremos de los alérgenos de cada plato. Tenemos la información por escrito a su disposición.'),
    h('p', { class: 'cartel-local' }, carta.local || ''));
}

function actualizar() {
  const carta = normalizarCarta(estado);
  const hojas = [];
  if (carta.platos.length) hojas.push(hojaTabla(carta));
  else hojas.push(h('p', { class: 'vacio' }, 'Escribe al menos un plato para ver la tabla.'));
  if ($('con-cartel').checked) hojas.push(hojaCartel(carta));
  $('hojas').replaceChildren(...hojas);
  $('texto-carta').value = [AVISO_CARTA, '', ...carta.platos.map(lineaPlato)].join('\n');
  $('imprimir').disabled = carta.platos.length === 0 && !$('con-cartel').checked;
  guardar();
}

$('local').value = estado.local;
$('local').addEventListener('input', e => { estado.local = e.target.value; actualizar(); });
$('anadir').addEventListener('click', () => {
  estado.platos.push({ nombre: '', seccion: estado.platos.at(-1)?.seccion || '', alergenos: [], trazas: [] });
  pintarFormulario(); actualizar();
  const entradas = $('platos').querySelectorAll('fieldset:last-child input[type=text]');
  if (entradas[0]) entradas[0].focus();
});
$('ejemplo').addEventListener('click', () => {
  if (normalizarCarta(estado).platos.length && !window.confirm('¿Sustituir tus platos por el ejemplo?')) return;
  estado = normalizarCarta(EJEMPLO); $('local').value = estado.local; pintarFormulario(); actualizar();
});
$('vaciar').addEventListener('click', () => {
  if (!window.confirm('¿Borrar todos los platos?')) return;
  estado = { local: estado.local, platos: [{ nombre: '', seccion: '', alergenos: [], trazas: [] }] };
  pintarFormulario(); actualizar();
});
$('con-cartel').addEventListener('change', actualizar);
$('copiar').addEventListener('click', e => copiar($('texto-carta').value, e.currentTarget));
$('imprimir').addEventListener('click', () => window.print());
pintarFormulario();
actualizar();
