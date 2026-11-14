// Generado por sites/mostrador/generar.py: no lo edites a mano.
// Modo sin conexión de Mostrador (alcance /mostrador/). Primero la red; si no hay conexión, la copia guardada.
const VERSION = 'mostrador-3c90fccbb7bd';
const PRECACHE = ["index.html", "carta-alergenos.html", "registro-temperaturas-appcc.html", "cartel-qr-resenas-google.html", "alergenos.mjs", "app-alergenos.mjs", "app-appcc.mjs", "app-carteles.mjs", "appcc.mjs", "carteles.mjs", "qr.mjs", "sin-conexion.mjs", "ui.mjs", "estilo.css", "favicon.svg"];
const ALCANCE = new URL('./', self.location).pathname;
const ESPERA_MS = 4000;

/** Clave de caché: sin parámetros ni ancla; «/» → index.html y las rutas limpias → .html. */
function clave(url) {
  const u = new URL(url);
  u.search = '';
  u.hash = '';
  if (u.pathname.endsWith('/')) u.pathname += 'index.html';
  else if (!/\.[a-z0-9]+$/i.test(u.pathname.slice(u.pathname.lastIndexOf('/') + 1))) u.pathname += '.html';
  return u.href;
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION)
    .then((cache) => cache.addAll(PRECACHE.map((ruta) => new Request(new URL(ruta, self.location), { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(caches.keys()
    .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith('mostrador-') && n !== VERSION).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ALCANCE)) return;
  evento.respondWith(redPrimero(evento, peticion));
});

/** Red primero; si falla o tarda más de ESPERA_MS (wifi que conecta pero no transmite), la copia guardada. */
function redPrimero(evento, peticion) {
  const k = clave(peticion.url);
  const red = fetch(peticion);
  evento.waitUntil(red.then(async (respuesta) => {
    if (respuesta.status === 200 && !respuesta.redirected) await (await caches.open(VERSION)).put(k, respuesta.clone());
  }).catch(() => {}));
  let reloj;
  const plazo = new Promise((listo) => { reloj = setTimeout(listo, ESPERA_MS); });
  red.finally(() => clearTimeout(reloj)).catch(() => {});
  const copia = () => caches.match(k, { cacheName: VERSION });
  return Promise.race([red, plazo]).then(
    async (respuesta) => respuesta || (await copia()) || red,
    async (error) => {
      const guardada = await copia();
      if (guardada) return guardada;
      throw error;
    });
}
