import type { Messages } from './es'

// Typed as `Messages`: a missing or extra key fails the build.
export const en: Messages = {
  tagline: 'more easy tasks',
  settings: 'Settings',
  close: 'Close',
  language: 'Language',

  desk: 'Desk',
  work: 'Work',
  life: 'Life',
  remember: 'Remember',
  cardCount: (n: number) => (n === 1 ? '1 card' : `${n} cards`),

  newCard: 'New card',
  more: (n: number) => `+${n} more`,
  card: 'Card',
  title: 'Title',
  body: 'Write something…',
  addItem: 'Add item',
  itemText: 'Item text',
  removeItem: 'Remove item',
  pin: 'Pin',
  pinned: 'Pinned',
  place: 'Place',
  delete: 'Delete',
  deleteConfirm: 'Delete? Tap again',
  save: 'Save',

  areas: 'Areas',
  seeAll: 'See all',
  tidyUp: 'Tidy up',
  search: 'Search',
  searchField: 'Search your cards',
  hint: 'Drag cards wherever you like. On your phone, press and hold a card to move it.',
  hintOk: 'Got it',
}
