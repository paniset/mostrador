// Los 14 alérgenos del anexo II del Reglamento (UE) 1169/2011 y la lógica de la carta.

export const ALERGENOS = [
  { id: 'gluten', corto: 'GLU', nombre: 'Gluten', detalle: 'Cereales que contengan gluten: trigo (como espelta y trigo khorasan), centeno, cebada, avena o sus variedades híbridas, y productos derivados' },
  { id: 'crustaceos', corto: 'CRU', nombre: 'Crustáceos', detalle: 'Crustáceos y productos a base de crustáceos' },
  { id: 'huevos', corto: 'HUE', nombre: 'Huevos', detalle: 'Huevos y productos a base de huevo' },
  { id: 'pescado', corto: 'PES', nombre: 'Pescado', detalle: 'Pescado y productos a base de pescado' },
  { id: 'cacahuetes', corto: 'CAC', nombre: 'Cacahuetes', detalle: 'Cacahuetes y productos a base de cacahuetes' },
  { id: 'soja', corto: 'SOJ', nombre: 'Soja', detalle: 'Soja y productos a base de soja' },
  { id: 'leche', corto: 'LEC', nombre: 'Leche', detalle: 'Leche y sus derivados (incluida la lactosa)' },
  { id: 'frutos-cascara', corto: 'FCA', nombre: 'Frutos de cáscara', detalle: 'Almendras, avellanas, nueces, anacardos, pacanas, nueces de Brasil, pistachos (alfóncigos), nueces macadamia y productos derivados' },
  { id: 'apio', corto: 'API', nombre: 'Apio', detalle: 'Apio y productos derivados' },
  { id: 'mostaza', corto: 'MOS', nombre: 'Mostaza', detalle: 'Mostaza y productos derivados' },
  { id: 'sesamo', corto: 'SES', nombre: 'Sésamo', detalle: 'Granos de sésamo y productos a base de granos de sésamo' },
  { id: 'sulfitos', corto: 'SUL', nombre: 'Sulfitos', detalle: 'Dióxido de azufre y sulfitos en concentraciones superiores a 10 mg/kg o 10 mg/litro (SO₂ total)' },
  { id: 'altramuces', corto: 'ALT', nombre: 'Altramuces', detalle: 'Altramuces y productos a base de altramuces' },
  { id: 'moluscos', corto: 'MOL', nombre: 'Moluscos', detalle: 'Moluscos y productos a base de moluscos' },
];

const IDS = new Set(ALERGENOS.map(a => a.id));
export const MAX_PLATOS = 120;
export const AVISO_CARTA = 'Si tiene alguna alergia o intolerancia alimentaria, consulte al personal: le informaremos de los alérgenos de cada plato.';

const texto = (valor, max) => String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Limpia y valida la carta guardada o importada. Nunca lanza: descarta lo que no sirve. */
export function normalizarCarta(datos) {
  const entrada = datos && typeof datos === 'object' ? datos : {};
  const platos = (Array.isArray(entrada.platos) ? entrada.platos : [])
    .slice(0, MAX_PLATOS)
    .map(p => ({
      nombre: texto(p?.nombre, 80),
      seccion: texto(p?.seccion, 40),
      alergenos: ALERGENOS.map(a => a.id).filter(id => Array.isArray(p?.alergenos) && p.alergenos.includes(id)),
      trazas: ALERGENOS.map(a => a.id).filter(id => Array.isArray(p?.trazas) && p.trazas.includes(id) && !(p.alergenos || []).includes(id)),
    }))
    .filter(p => p.nombre);
  return { local: texto(entrada.local, 60), platos };
}

/** Agrupa los platos por sección conservando el orden de aparición. */
export function porSecciones(platos) {
  const grupos = new Map();
  for (const plato of platos) {
    const clave = plato.seccion || '';
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(plato);
  }
  return [...grupos].map(([seccion, lista]) => ({ seccion, platos: lista }));
}

/** Cuenta cuántos platos contienen cada alérgeno y cuáles no declaran ninguno. */
export function resumen(platos) {
  const cuenta = Object.fromEntries(ALERGENOS.map(a => [a.id, 0]));
  for (const p of platos) for (const id of p.alergenos) if (IDS.has(id)) cuenta[id]++;
  return {
    cuenta,
    sinAlergenos: platos.filter(p => p.alergenos.length === 0 && p.trazas.length === 0).map(p => p.nombre),
    total: platos.length,
  };
}

/** Lista legible de alérgenos de un plato, para la carta en texto. */
export function lineaPlato(plato) {
  const nombres = ids => ids.map(id => ALERGENOS.find(a => a.id === id).nombre.toLowerCase());
  const partes = [];
  if (plato.alergenos.length) partes.push(`contiene ${unir(nombres(plato.alergenos))}`);
  if (plato.trazas.length) partes.push(`puede contener trazas de ${unir(nombres(plato.trazas))}`);
  return `${plato.nombre}: ${partes.length ? partes.join('; ') : 'sin alérgenos declarados'}.`;
}

export function unir(lista) {
  if (lista.length <= 1) return lista.join('');
  return `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}`;
}

export const EJEMPLO = {
  local: 'Bar La Esquina',
  platos: [
    { nombre: 'Tortilla de patatas', seccion: 'Raciones', alergenos: ['huevos'], trazas: [] },
    { nombre: 'Croquetas de jamón', seccion: 'Raciones', alergenos: ['gluten', 'huevos', 'leche'], trazas: [] },
    { nombre: 'Calamares a la romana', seccion: 'Raciones', alergenos: ['gluten', 'huevos', 'moluscos'], trazas: [] },
    { nombre: 'Gambas al ajillo', seccion: 'Raciones', alergenos: ['crustaceos'], trazas: [] },
    { nombre: 'Ensalada mixta', seccion: 'Ensaladas', alergenos: ['huevos', 'pescado'], trazas: ['mostaza'] },
    { nombre: 'Patatas bravas', seccion: 'Raciones', alergenos: [], trazas: [] },
    { nombre: 'Tarta de queso', seccion: 'Postres', alergenos: ['leche', 'huevos', 'gluten'], trazas: ['frutos-cascara'] },
  ],
};
