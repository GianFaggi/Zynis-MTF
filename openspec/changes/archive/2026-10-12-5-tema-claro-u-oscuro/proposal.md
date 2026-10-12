# Proposal

## Why

MTF always follows the device's light/dark mode, and there is no way to change it (left out of change 1, #1). Some people keep the phone in dark mode but want their notepad on light paper, or the other way round. The Paper tokens already switch through CSS variables, so a theme choice in Settings costs little and touches no component.

## What Changes

- **Theme selector in Settings**: "Tema" / "Theme" with **Sistema · Claro · Oscuro** / **System · Light · Dark**, built with the same `Segmented` as the language, right below it. "Sistema" is the default.
- **System** keeps today's behavior: it follows the device and changes live.
- **Light** and **Dark** apply at once, without a reload, even when the device is in the opposite mode.
- **Remembered on the device**: the choice is saved under `mtf_theme` through `src/lib/storage.ts` and the app store, like the language. A missing or unknown value means System.
- **Status bar**: the phone's `theme-color` follows the chosen theme, not only the system one.
- **Device setting, not data**: the theme is not part of `mtf_data` or the Backup, and an Import leaves it as it was.

### Acceptance criteria → scope

| Issue #5 criterion | Covered by |
|---|---|
| A "Tema" selector in Settings with Sistema · Claro · Oscuro (ES · EN), using `Segmented` | `app-shell`: Settings sheet, Theme choice |
| "Sistema" follows the device and changes live | `app-shell`: Theme choice (System scenarios) |
| "Claro" and "Oscuro" apply at once, without a reload, even against the system mode | `app-shell`: Theme choice (Light / Dark scenarios) |
| The choice is remembered (`mtf_theme`, through `src/lib/storage.ts` and the store) | `app-shell`: Theme is remembered; storage layer `loadTheme` / `saveTheme` |
| The status bar color (`theme-color`) follows the chosen theme | `app-shell`: Status bar follows the theme |
| Unit tests: save and read the theme; the selector changes `data-theme` | `storage.test.ts`, `appStore.test.ts`, `App.test.tsx` |
| E2E: with the system in light, choosing "Oscuro" looks dark and survives a reload | new test in `e2e/base-screen.spec.ts` |
| KBs updated (design-system.md, storage.md) | tasks |

### Out of scope

- More themes or custom colors (only the existing light and dark Paper palettes).
- The install splash screen and the manifest's `theme_color` / `background_color`. They are fixed at install time and stay paper; a browser cannot change them at runtime.
- Syncing the theme between devices (a device setting; V2 sync is about data, not settings).
- Any change to the palettes themselves.

## Capabilities

### New Capabilities

None. The theme is part of the shell's look, which `app-shell` already owns.

### Modified Capabilities

- `app-shell`: "Theme follows the system" becomes "Theme choice" (System · Light · Dark, System by default). New requirements: the choice is remembered on the device, and the status bar follows the theme. The Settings sheet scenario also shows the theme setting.
- `backup`: the Export requirement names the theme among the device settings that are never in the file.

## Impact

- **Code**: `src/types/index.ts` (a `Theme` type), `src/lib/storage.ts` (`THEME_KEY`, `loadTheme`, `saveTheme`), `src/store/appStore.ts` (`theme`, `setTheme`), a small module that applies the theme to `<html>` and the `theme-color` metas, the selector in `App.tsx`, new ES/EN strings.
- **Paint**: `src/index.css` writes the dark values once, under a `@custom-variant` that matches both the dark system mode (unless Light is chosen) and `data-theme="dark"`. No component changes and no `dark:` variants.
- **Data**: no schema change and no migration. One new device-setting key, `mtf_theme`.
- **Dependencies**: none.
