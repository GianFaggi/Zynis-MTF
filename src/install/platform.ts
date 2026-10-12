// What the install guidance needs to know about the device (KB/frontend/pwa.md#install-guidance).

/** MTF runs as an installed app (home screen icon or desktop window). `navigator.standalone` is iOS's own flag. */
export function isStandalone(): boolean {
  const displayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  return displayMode || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** iPhone, iPad or iPod, where only Safari's Share → Add to Home Screen installs MTF. iPadOS reports itself as a Mac, but with touch. */
export function isIos(): boolean {
  const { userAgent, maxTouchPoints = 0 } = navigator
  return /iPhone|iPad|iPod/.test(userAgent) || (userAgent.includes('Macintosh') && maxTouchPoints > 1)
}
