// Contenido de los carteles QR: reseñas de Google y wifi.

/** Escapa los caracteres especiales del formato WIFI: (\ ; , : "). */
export function escaparWifi(valor) {
  return String(valor).replace(/([\\;,:"])/g, '\\$1');
}

/**
 * Texto estándar del QR de wifi: WIFI:T:WPA;S:<red>;P:<clave>;;
 * seguridad: 'WPA' (también WPA2/WPA3), 'WEP' o 'nopass' (red abierta).
 */
export function textoWifi({ red, clave: claveEntrada = '', seguridad = 'WPA', oculta = false }) {
  const ssid = String(red ?? '');
  const clave = String(claveEntrada ?? '');
  if (!ssid.trim()) throw new Error('Escribe el nombre de la red (SSID).');
  if (new TextEncoder().encode(ssid).length > 32) throw new Error('El nombre de la red no puede pasar de 32 bytes.');
  if (!['WPA', 'WEP', 'nopass'].includes(seguridad)) throw new Error('Tipo de seguridad no válido.');
  let texto = `WIFI:T:${seguridad};S:${escaparWifi(ssid)};`;
  if (seguridad !== 'nopass') {
    if (!clave) throw new Error('Escribe la contraseña del wifi.');
    if (seguridad === 'WPA' && (clave.length < 8 || clave.length > 63)) throw new Error('Una clave WPA tiene entre 8 y 63 caracteres.');
    if (seguridad === 'WEP' && !([5, 13].includes(clave.length) || /^([0-9a-f]{10}|[0-9a-f]{26})$/i.test(clave))) throw new Error('Una clave WEP tiene 5 o 13 caracteres, o 10 o 26 hexadecimales.');
    texto += `P:${escaparWifi(clave)};`;
  }
  if (oculta) texto += 'H:true;';
  return `${texto};`;
}

const PLACE_ID = /^[A-Za-z0-9_-]{16,300}$/;
const HOSTS_GOOGLE = /^((www|search|maps|business)\.)?(google\.(com|es)|g\.page|goo\.gl|maps\.app\.goo\.gl|g\.co)$/i;

/**
 * Convierte lo que pegue el usuario (enlace para pedir reseñas o Place ID) en la URL del QR.
 * Devuelve { url, aviso } o lanza un error con un mensaje para el usuario.
 */
export function enlaceResena(entrada) {
  const valor = String(entrada ?? '').trim();
  if (!valor) throw new Error('Pega el enlace para pedir reseñas o el Place ID de tu local.');
  if (PLACE_ID.test(valor) && !valor.includes('.')) {
    return {
      url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(valor)}`,
      aviso: 'Este formato a partir del Place ID no está documentado por Google. Escanea el QR con tu móvil antes de imprimirlo, o usa mejor el enlace de «Obtener más reseñas».',
    };
  }
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(valor) ? valor : `https://${valor}`); } catch { throw new Error('No parece un enlace válido.'); }
  if (url.protocol !== 'https:') throw new Error('El enlace debe empezar por https://');
  if (url.username || url.password) throw new Error('El enlace no puede llevar usuario ni contraseña.');
  const aviso = HOSTS_GOOGLE.test(url.hostname) ? '' : 'Este enlace no es de Google. Comprueba que lleva a tu ficha antes de imprimir.';
  return { url: url.href, aviso };
}
