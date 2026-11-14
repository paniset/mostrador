/** Registra el service worker (sw.js, alcance /mostrador/) para que las herramientas funcionen sin conexión. */
export function registrarSinConexion(nav = globalThis.navigator, contexto = globalThis) {
  // Solo bajo /mostrador/: en un servidor local que sirva site/ en la raíz controlaría todo el puerto.
  if (!nav || !('serviceWorker' in nav) || !contexto.isSecureContext || !contexto.location?.pathname?.startsWith('/mostrador/')) return false;
  nav.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  return true;
}

registrarSinConexion();
