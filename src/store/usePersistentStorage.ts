import { useEffect } from 'react'
import { requestPersistentStorage } from '../lib/storage'
import { useAppStore } from './appStore'

// Asks the browser to keep MTF's storage (KB/frontend/storage.md#persistent-storage),
// once per launch, the first time the data holds a Card: when MTF opens with Cards, or
// right after the first one is kept. Never on a blank first launch, where Firefox's
// permission prompt would be a question out of nowhere.

let asked = false

export function usePersistentStorage(): void {
  const hasCards = useAppStore((state) => state.data.cards.length > 0)

  useEffect(() => {
    if (!hasCards || asked) return
    asked = true
    void requestPersistentStorage()
  }, [hasCards])
}

/** Tests only: a fresh launch. */
export function resetPersistentStorageRequest(): void {
  asked = false
}
