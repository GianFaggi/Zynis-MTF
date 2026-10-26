# Spec Delta

## MODIFIED Requirements

### Requirement: The old address redirects
Every page of the old production address, `https://zynis-mtf.vercel.app`, SHALL redirect permanently to the same path on `https://mtf.zynis.com.ar`. Preview deployments, which have addresses of their own, SHALL NOT be redirected.

#### Scenario: Old address
- **WHEN** a browser that never ran MTF there opens `https://zynis-mtf.vercel.app`
- **THEN** it is permanently redirected to `https://mtf.zynis.com.ar/`

#### Scenario: Old address with a query string
- **WHEN** a browser requests `https://zynis-mtf.vercel.app/?from=link`
- **THEN** it is permanently redirected to `https://mtf.zynis.com.ar/?from=link`

#### Scenario: Path kept
- **WHEN** a browser requests `https://zynis-mtf.vercel.app/manifest.webmanifest`
- **THEN** it is permanently redirected to `https://mtf.zynis.com.ar/manifest.webmanifest`

#### Scenario: New address
- **WHEN** a browser opens `https://mtf.zynis.com.ar/`
- **THEN** MTF opens without a redirect

#### Scenario: Preview deployment
- **WHEN** a preview deployment of a pull request is opened at its own address
- **THEN** it is not redirected
