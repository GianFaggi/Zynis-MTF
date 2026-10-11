# i18n Specification

## Purpose

Lets the user use MTF in Spanish or English: how the first language is chosen, how the user switches it, and how the choice is remembered on that device.

## Requirements

### Requirement: Two languages
Every user-visible text in MTF SHALL be available in Spanish and in English, and the whole UI SHALL show one language at a time.

#### Scenario: Every text translated
- **WHEN** the set of English texts is compared with the set of Spanish texts
- **THEN** both contain exactly the same entries

### Requirement: Initial language
On first launch MTF SHALL use Spanish when the browser's preferred language is Spanish (any region) and English otherwise.

#### Scenario: Spanish browser
- **WHEN** MTF opens for the first time in a browser set to `es-AR`
- **THEN** the UI is in Spanish

#### Scenario: Other browser language
- **WHEN** MTF opens for the first time in a browser set to `fr-FR`
- **THEN** the UI is in English

### Requirement: Switch language
The Settings sheet SHALL offer a language selector with "Español" and "English" that shows which one is active and changes the whole UI immediately, without a reload.

#### Scenario: Switch to English
- **WHEN** the UI is in Spanish and the user picks "English" in Settings
- **THEN** all visible texts, including the Area names, the Dock and the Settings sheet, switch to English
- **AND** "English" is shown as the selected option

### Requirement: Language is remembered
The chosen language SHALL be remembered on that device and used on every later launch, taking priority over the browser's language.

#### Scenario: Reload keeps the choice
- **WHEN** the user picks "English" and reloads MTF in a browser set to Spanish
- **THEN** the UI is in English

### Requirement: Page language matches the UI
The document's language attribute SHALL match the UI language, so screen readers and the browser read MTF correctly.

#### Scenario: Language attribute
- **WHEN** the UI is in English
- **THEN** the document's language attribute is `en`
