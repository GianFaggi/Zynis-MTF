# Local-first storage behind a storage layer, .NET sync later

In the MVP, all data lives in the browser's localStorage, accessed only through `src/lib/storage.ts`, with a Zustand store in front of it. There is no backend and no login. Every entity has a uuid `id` and `createdAt` / `updatedAt` from day one, and Wins are an append-only list of events. When the .NET backend arrives (V2), it replaces the storage layer's implementation without touching components, and adds accounts plus phone ↔ PC sync. Until then, an Export / Import backup file moves data between devices.

We chose this because the user wants the simplest possible start (no server, no cost, offline by default) and because MTF is used by one person first. We accepted the trade-off that phone and PC don't share data automatically in the MVP: browser storage is per device and per browser, and signing into the same Google account in Chrome does not sync site data.

## Considered Options

- **Firebase (Auth + Firestore)**: rejected for the MVP. It solves login, sync and offline out of the box, but adds a cloud dependency the user didn't want yet, and the user plans a .NET backend.
- **Google Drive app folder**: rejected. Data in the user's own Drive is appealing, but sync and offline would be ours to build.
- **IndexedDB from the start**: deferred. Text notes are small; localStorage is enough and simpler. Switch if size or performance demands it; the storage layer makes that local.

## Consequences

- Browsers can evict local data (notably Safari after ~7 days for non-installed sites). Mitigations: install as PWA, request persistent storage, and ship Export / Import in the MVP (change 4).
- V2 sync merges entities by `id` and `updatedAt`, and merges win events by `id`.
