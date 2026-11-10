import { openWithLink, type AccountLink } from './accountStore'

// Mail links (design decision 3): `https://mtf.zynis.com.ar/#verify=<token>` and `#reset=<token>`.
// The token travels in the fragment, which the browser never sends to the web server. It is read
// once before React mounts, kept in memory, and removed from the address at once. Nothing is
// sent here: the Account sheet posts it from the page, so a mail scanner fetching the link changes nothing.

const LINK = /^#(verify|reset)=([A-Za-z0-9_-]+)$/

/** Reads a mail link from the address, opens the Account sheet on its step, and clears the address. */
export function readAccountLink(): AccountLink | null {
  const match = LINK.exec(location.hash)
  if (!match) return null

  const link: AccountLink = { kind: match[1] as AccountLink['kind'], token: match[2] }
  history.replaceState(history.state, '', location.pathname + location.search)
  openWithLink(link)
  return link
}

/**
 * Reads a link now, before React mounts, and again whenever the fragment changes: a link
 * opened where MTF already runs (an installed app receiving it, a pasted address) changes
 * only the fragment, which does not reload the page.
 */
export function listenForAccountLinks(): () => void {
  readAccountLink()
  const onHashChange = () => void readAccountLink()
  window.addEventListener('hashchange', onHashChange)
  return () => window.removeEventListener('hashchange', onHashChange)
}
