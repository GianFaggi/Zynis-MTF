import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Every test starts from an empty DOM and empty storage.
afterEach(() => {
  cleanup()
  localStorage.clear()
})
