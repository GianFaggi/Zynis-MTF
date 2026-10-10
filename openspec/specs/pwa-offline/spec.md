# pwa-offline Specification

## Purpose

Makes MTF an installable app that opens with no connection, on phone and PC. It defines what is available offline and how new versions arrive.

## Requirements

### Requirement: Installable app
MTF SHALL provide a web app manifest with name "MTF — Más Tareas Fáciles", short name "MTF", standalone display, any orientation, paper-colored theme and background, and icons at 192 px, 512 px and maskable 512 px, plus a 180 px Apple touch icon, so browsers offer to install it.

#### Scenario: Install offered
- **WHEN** MTF is opened over HTTPS in a browser that supports installing web apps
- **THEN** the browser treats MTF as installable

#### Scenario: Opens standalone
- **WHEN** the installed MTF is launched from the home screen or the PC
- **THEN** it opens in its own window without browser address bar

### Requirement: Opens offline after first visit
After MTF has been opened once with a connection, it SHALL open and show the base paper screen with no connection, including bundled fonts and icons.

#### Scenario: Reload offline
- **WHEN** MTF has been visited once and the device goes offline
- **AND** the user reloads or relaunches MTF
- **THEN** the base paper screen appears with its fonts

#### Scenario: Data available offline
- **WHEN** the user changed the language while online and then opens MTF offline
- **THEN** MTF shows the language they chose

### Requirement: No network needed at runtime
MTF SHALL NOT need any network request to work once loaded; it makes no requests to external hosts.

#### Scenario: External requests
- **WHEN** MTF loads and the user opens Settings and switches language
- **THEN** no request leaves the MTF origin

### Requirement: Silent updates
When a new version of MTF is deployed, it SHALL be downloaded in the background and SHALL take effect on a later launch without asking the user anything and without losing their data.

#### Scenario: New version deployed
- **WHEN** a new version is deployed while the user has MTF open
- **THEN** the user is not interrupted
- **AND** a later launch runs the new version with the same data
