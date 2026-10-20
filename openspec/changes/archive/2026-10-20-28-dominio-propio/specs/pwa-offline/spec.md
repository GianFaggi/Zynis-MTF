# Spec Delta

## ADDED Requirements

### Requirement: Own address
MTF SHALL be served over HTTPS at `https://mtf.zynis.com.ar`, and installing it from that address SHALL give an app that opens with no connection after its first visit, like any other install of MTF.

#### Scenario: Open the address
- **WHEN** the user opens `https://mtf.zynis.com.ar`
- **THEN** MTF opens over HTTPS with a valid certificate

#### Scenario: Install from the address
- **WHEN** the user installs MTF from `https://mtf.zynis.com.ar`, opens it once with a connection and then goes offline
- **THEN** the installed MTF opens with no connection

### Requirement: The old address redirects
Every page of the old production address, `https://zynis-mtf.vercel.app`, SHALL redirect permanently to the same path on `https://mtf.zynis.com.ar`. Preview deployments, which have addresses of their own, SHALL NOT be redirected.

#### Scenario: Old address
- **WHEN** a browser that never ran MTF there opens `https://zynis-mtf.vercel.app`
- **THEN** it is permanently redirected to `https://mtf.zynis.com.ar/`

#### Scenario: Path kept
- **WHEN** a browser requests `https://zynis-mtf.vercel.app/manifest.webmanifest`
- **THEN** it is permanently redirected to `https://mtf.zynis.com.ar/manifest.webmanifest`

#### Scenario: Preview deployment
- **WHEN** a preview deployment of a pull request is opened at its own address
- **THEN** it is not redirected
