import './sin-conexion.mjs';
import { encodeQR, qrSvgPath, qrSvgString } from './qr.mjs';
import { enlaceResena, textoWifi } from './carteles.mjs';
import { conectarRecordar, descargar, h, memoria, svg } from './ui.mjs';

const $ = id => document.getElementById(id);
const mem = memoria('carteles');
// La contraseña del wifi nunca se guarda en el navegador.
const demo = new URLSearchParams(location.search).get('ejemplo');
const EJEMPLOS = {
  resena: { local: 'Bar La Esquina', enlace: 'https://g.page/r/CEjemploDeMostrador/review', tipo: 'resena' },
  wifi: { local: 'Bar La Esquina', red: 'BarLaEsquina-Clientes', tipo: 'wifi' },
};
const recordado = demo !== null ? (EJEMPLOS[demo] || EJEMPLOS.resena) : (mem.leer() || {});
if (demo === 'wifi') $('clave').value = 'tapas-y-cana-2026';
const CAMPOS = ['local', 'enlace', 'titulo-resena', 'red', 'seguridad', 'titulo-wifi', 'formato'];
for (const c of CAMPOS) if (typeof recordado[c] === 'string') $(c).value = recordado[c].slice(0, 300);
if (recordado.tipo === 'wifi') $('tipo-wifi').checked = true;
const datos = () => ({ ...Object.fromEntries(CAMPOS.map(c => [c, $(c).value])), tipo: tipo() });
const guardarSiProcede = conectarRecordar($('recordar'), mem, datos, $('aviso-memoria'));
// Con ?ejemplo no se toca lo guardado.
const guardar = () => { if (demo === null) guardarSiProcede(); };

function tipo() { return $('tipo-wifi').checked ? 'wifi' : 'resena'; }

function dibujoQR(qr, etiqueta) {
  const { d, viewBox } = qrSvgPath(qr);
  return svg('svg', { viewBox, class: 'qr', role: 'img', 'aria-label': etiqueta, 'shape-rendering': 'crispEdges' },
    svg('rect', { width: '100%', height: '100%', fill: '#fff' }), svg('path', { d, fill: '#000' }));
}

let ultimoQR = null;

function contenido() {
  if (tipo() === 'resena') {
    const { url, aviso } = enlaceResena($('enlace').value);
    return {
      texto: url, aviso,
      titulo: $('titulo-resena').value.trim() || '¿Te ha gustado? Déjanos una reseña en Google',
      sub: 'Escanea el código con la cámara del móvil. ¡Gracias!',
      extra: null, etiqueta: 'Código QR para dejar una reseña', archivo: 'qr-resenas.svg',
    };
  }
  const red = $('red').value, clave = $('clave').value, seguridad = $('seguridad').value;
  const texto = textoWifi({ red, clave, seguridad, oculta: $('oculta').checked });
  return {
    texto, aviso: '',
    titulo: $('titulo-wifi').value.trim() || 'Wifi para clientes',
    sub: 'Escanea el código con la cámara del móvil para conectarte.',
    extra: h('p', { class: 'cartel-datos' }, `Red: ${red}`, $('mostrar-clave').checked && seguridad !== 'nopass' ? [h('br'), `Contraseña: ${clave}`] : null),
    etiqueta: `Código QR para conectarse a la red ${red}`, archivo: 'qr-wifi.svg',
  };
}

function tarjeta(c, qr) {
  return h('div', { class: 'tarjeta-qr' },
    h('p', { class: 'cartel-titulo' }, c.titulo),
    dibujoQR(qr, c.etiqueta),
    h('p', { class: 'cartel-sub' }, c.sub),
    c.extra ? c.extra.cloneNode(true) : null,
    $('local').value.trim() ? h('p', { class: 'cartel-local' }, $('local').value.trim().slice(0, 60)) : null);
}

function actualizar() {
  const esWifi = tipo() === 'wifi';
  $('bloque-resena').hidden = esWifi;
  $('bloque-wifi').hidden = !esWifi;
  $('mensaje').textContent = '';
  ultimoQR = null;
  let c;
  try {
    c = contenido();
  } catch (error) {
    $('mensaje').textContent = error.message;
    $('qr-info').textContent = '';
    $('hojas').replaceChildren(h('p', { class: 'vacio' }, esWifi ? 'Escribe la red y la contraseña para ver el cartel.' : 'Pega el enlace de tu ficha para ver el cartel.'));
    $('imprimir').disabled = true; $('descargar').disabled = true;
    guardar();
    return;
  }
  const qr = encodeQR(c.texto, { ecl: 'Q' });
  ultimoQR = { qr, archivo: c.archivo };
  const mesa = $('formato').value === 'mesa';
  const hoja = h('section', { class: `hoja cartel-qr${mesa ? ' mesa' : ''}`, 'aria-label': 'Cartel para imprimir' },
    mesa ? Array.from({ length: 4 }, () => tarjeta(c, qr)) : tarjeta(c, qr));
  $('hojas').replaceChildren(hoja);
  $('mensaje').textContent = c.aviso;
  $('qr-info').textContent = esWifi ? '' : `El QR abre: ${c.texto}`;
  $('imprimir').disabled = false; $('descargar').disabled = false;
  guardar();
}

for (const c of [...CAMPOS, 'clave']) $(c).addEventListener('input', actualizar);
for (const c of ['tipo-resena', 'tipo-wifi', 'oculta', 'mostrar-clave', 'seguridad', 'formato']) $(c).addEventListener('change', actualizar);
$('imprimir').addEventListener('click', () => window.print());
$('descargar').addEventListener('click', () => { if (ultimoQR) descargar(ultimoQR.archivo, qrSvgString(ultimoQR.qr), 'image/svg+xml'); });
actualizar();
