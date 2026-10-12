// How a Backup file leaves the device. On a touch device that can share files, the
// system share sheet (mail, chat, Drive, Save to Files); everywhere else a download.
// Desktop Chrome and Edge can share files too, but a PC user expects a download, so
// the share sheet needs a coarse pointer as well. iOS only opens it from a user
// gesture: the caller builds the File synchronously in the click, and `share()` is
// the first await here.

export type Delivery = 'shared' | 'downloaded' | 'cancelled'

function canShareFile(file: File): boolean {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarse && (navigator.canShare?.({ files: [file] }) ?? false)
}

function download(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  // Revoked on the next tick: some browsers start the download after `click()` returns.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Shares or downloads `file`. A cancelled share sheet is `'cancelled'`; any other share failure downloads instead. */
export async function deliverFile(file: File): Promise<Delivery> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      if ((error as Error | null)?.name === 'AbortError') return 'cancelled'
      console.warn('[backup] share failed, downloading instead:', error)
    }
  }
  download(file)
  return 'downloaded'
}
