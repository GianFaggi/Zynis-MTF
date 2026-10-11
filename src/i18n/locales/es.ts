// Spanish is the source dictionary: its shape defines `Messages`.
// A value is a string, or a function for texts that include values.
export const es = {
  tagline: 'más tareas fáciles',
  settings: 'Ajustes',
  close: 'Cerrar',
  language: 'Idioma',

  desk: 'Escritorio',
  work: 'Trabajo',
  life: 'Vida',
  remember: 'Recordar',
  cardCount: (n: number) => (n === 1 ? '1 tarjeta' : `${n} tarjetas`),

  newCard: 'Nueva tarjeta',
  more: (n: number) => `+${n} más`,
  card: 'Tarjeta',
  title: 'Título',
  body: 'Escribí algo…',
  addItem: 'Añadir elemento',
  itemText: 'Texto del elemento',
  removeItem: 'Quitar elemento',
  pin: 'Fijar',
  pinned: 'Fijada',
  place: 'Lugar',
  delete: 'Borrar',
  deleteConfirm: '¿Borrar? Tocá otra vez',
  save: 'Guardar',

  areas: 'Áreas',
  seeAll: 'Ver todo',
  tidyUp: 'Ordenar',
  search: 'Buscar',
  searchField: 'Buscar en tus tarjetas',
  hint: 'Arrastrá las tarjetas a donde quieras. En el celu, mantené apretada una tarjeta para moverla.',
  hintOk: 'Entendido',
}

export type Messages = typeof es
