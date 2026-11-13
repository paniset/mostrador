// Cálculos de las hojas de registro de autocontrol (APPCC): meses, días previstos y paginación.

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const UMBRAL_POLARES = 25;

/** mes: 1-12. */
export function diasDelMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Día de la semana con lunes = 0 … domingo = 6. */
export function diaSemana(anio, mes, dia) {
  return (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() + 6) % 7;
}

/**
 * Días del mes en que toca una tarea.
 * frecuencia: 'diaria' | 'semanal' (el día de la semana indicado) | 'mensual' (el primero de ese día de la semana).
 */
export function diasPrevistos(frecuencia, anio, mes, dia = 0) {
  const total = diasDelMes(anio, mes);
  const todos = Array.from({ length: total }, (_, i) => i + 1);
  if (frecuencia === 'diaria') return todos;
  const coinciden = todos.filter(d => diaSemana(anio, mes, d) === dia);
  if (frecuencia === 'semanal') return coinciden;
  if (frecuencia === 'mensual') return coinciden.slice(0, 1);
  throw new Error('Frecuencia no válida');
}

export function rotuloFrecuencia(frecuencia, dia = 0) {
  if (frecuencia === 'diaria') return 'Diaria';
  if (frecuencia === 'semanal') return `Semanal (${DIAS_SEMANA[dia]})`;
  if (frecuencia === 'mensual') return `Mensual (primer ${DIAS_SEMANA[dia]})`;
  return '';
}

const numero = valor => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(',', '.').replace('−', '-'));
  return Number.isFinite(n) ? n : NaN;
};

/** Valida un equipo de frío: nombre y rango (mínimo opcional, máximo obligatorio). */
export function validarEquipo(equipo) {
  const nombre = String(equipo?.nombre ?? '').trim().slice(0, 40);
  const min = numero(equipo?.min);
  const max = numero(equipo?.max);
  const errores = [];
  if (!nombre) errores.push('Falta el nombre del equipo.');
  if (max === null || Number.isNaN(max)) errores.push('Indica la temperatura máxima.');
  if (Number.isNaN(min)) errores.push('La temperatura mínima no es un número.');
  if (min !== null && !Number.isNaN(min) && max !== null && !Number.isNaN(max) && min >= max) errores.push('La mínima debe ser menor que la máxima.');
  for (const v of [min, max]) if (v !== null && !Number.isNaN(v) && (v < -40 || v > 70)) errores.push('Revisa el rango: fuera de −40 a 70 °C.');
  return { ok: errores.length === 0, errores, equipo: { nombre, min: Number.isNaN(min) ? null : min, max: Number.isNaN(max) ? null : max } };
}

const grados = n => `${String(n).replace('-', '−').replace('.', ',')} °C`;

export function rotuloRango({ min, max }) {
  if (min === null || min === undefined) return `≤ ${grados(max)}`;
  return `${grados(min)} a ${grados(max)}`;
}

/** ¿Está la lectura fuera del rango del equipo? */
export function fueraDeRango(lectura, { min, max }) {
  const v = numero(lectura);
  if (v === null || Number.isNaN(v)) return null;
  return v > max || (min !== null && min !== undefined && v < min);
}

/** Compuestos polares: por debajo del umbral, apto; en el umbral o por encima, cambiar el aceite. */
export function evaluarPolares(porcentaje) {
  const v = numero(porcentaje);
  if (v === null || Number.isNaN(v) || v < 0 || v > 100) return null;
  return v < UMBRAL_POLARES ? 'apto' : 'cambiar';
}

/** Reparte los equipos en hojas: con 2 lecturas al día caben 4 equipos por hoja; con 1, 6. */
export function paginarEquipos(equipos, lecturas = 2) {
  const porHoja = lecturas === 2 ? 4 : 6;
  const hojas = [];
  for (let i = 0; i < equipos.length; i += porHoja) hojas.push(equipos.slice(i, i + porHoja));
  return hojas;
}

export function paginar(lista, porHoja) {
  const hojas = [];
  for (let i = 0; i < lista.length; i += porHoja) hojas.push(lista.slice(i, i + porHoja));
  return hojas.length ? hojas : [[]];
}

export const EJEMPLO = {
  local: 'Bar La Esquina',
  equipos: [
    { nombre: 'Cámara de carnes', min: 0, max: 4 },
    { nombre: 'Nevera de barra', min: 0, max: 5 },
    { nombre: 'Arcón congelador', min: null, max: -18 },
  ],
  zonas: [
    { nombre: 'Suelos de cocina', frecuencia: 'diaria', dia: 0, producto: 'Detergente desengrasante' },
    { nombre: 'Superficies de trabajo', frecuencia: 'diaria', dia: 0, producto: 'Desinfectante de uso alimentario' },
    { nombre: 'Campana extractora y filtros', frecuencia: 'semanal', dia: 0, producto: 'Desengrasante' },
    { nombre: 'Cámara de carnes', frecuencia: 'semanal', dia: 3, producto: 'Detergente y desinfectante' },
    { nombre: 'Almacén y estanterías', frecuencia: 'mensual', dia: 0, producto: 'Detergente' },
  ],
  freidoras: ['Freidora 1', 'Freidora 2'],
  proveedores: ['Carnes', 'Pescados', 'Frutas y verduras', 'Bebidas'],
};
