# Spec Delta

## Purpose

Defines how MTF's API runs and how it can move between hosts without a code change: its container, configuration, migrations, health check, allowed origins, address and the checks that protect `main`.

## ADDED Requirements

### Requirement: One container on any host
The service SHALL be built from one `Dockerfile` and SHALL listen on the port given in `PORT`, defaulting to 5000, so the same image runs on Render and on a VM.

#### Scenario: Port given
- **WHEN** the image runs with `PORT=8123`
- **THEN** the service answers on port 8123

#### Scenario: No port given
- **WHEN** the image runs with no `PORT`
- **THEN** the service answers on port 5000

### Requirement: The database comes from one setting
The service SHALL read its database only from `ConnectionStrings__DefaultConnection`, so moving the database means changing one variable.

#### Scenario: Setting present
- **WHEN** the service starts with that setting pointing at a Postgres database
- **THEN** it uses that database

#### Scenario: Provider variables are ignored
- **WHEN** the service starts with `DATABASE_URL` set and that setting missing
- **THEN** it refuses to start and says which setting is missing

### Requirement: A missing setting stops the start
Outside development, the service SHALL refuse to start when a required setting is missing, naming it in the log: the database, the token signing key, the app's address, its own address, the allowed origins, Google's client id and secret, the mail key and the sender.

#### Scenario: No signing key
- **WHEN** the service starts in production with no signing key
- **THEN** it does not start and the log names the missing setting and shows no secret

#### Scenario: A signing key too short
- **WHEN** the signing key is shorter than 32 characters
- **THEN** the service does not start

### Requirement: Migrations run at start-up
The service SHALL apply pending database migrations when it starts, so an empty database builds itself and a restored one skips the steps it already has.

#### Scenario: Empty database
- **WHEN** the service starts against an empty Postgres 17 database
- **THEN** every table exists and the service answers

#### Scenario: Restored database
- **WHEN** the service starts against a database that already has its migrations
- **THEN** it applies none and keeps the existing data

### Requirement: Health never touches the database
`GET /health` SHALL answer success while the service is running, without touching the database, so the host's health check never keeps the database awake.

#### Scenario: Database stopped
- **WHEN** the database is unreachable and the service is already running
- **THEN** `/health` still answers success

#### Scenario: No queries
- **WHEN** `/health` is requested
- **THEN** no query reaches the database

### Requirement: Standard Postgres 17
The service SHALL run on standard Postgres 17 with no provider-only feature. Development, CI and production SHALL all use major version 17, so the data can move with `pg_dump` and `pg_restore`.

#### Scenario: Any Postgres 17
- **WHEN** the integration tests run against a plain `postgres:17` container
- **THEN** every migration and every test passes

### Requirement: Only MTF's own address may call the API
A browser SHALL be allowed to call the API only from the origins in the configuration. In production that SHALL be `https://mtf.zynis.com.ar` alone, and `/health` follows the same rule.

#### Scenario: From MTF
- **WHEN** a request with the origin `https://mtf.zynis.com.ar` reaches production
- **THEN** the answer allows that origin

#### Scenario: From anywhere else
- **WHEN** a request with any other origin reaches production
- **THEN** the answer does not allow it

### Requirement: The API has its own address
In production the API SHALL be reached at `https://api.mtf.zynis.com.ar`, and the app SHALL call that address, never the hosting provider's, so a move only changes DNS.

#### Scenario: The app's requests
- **WHEN** the production build of MTF makes any API request
- **THEN** it goes to `https://api.mtf.zynis.com.ar`

#### Scenario: Valid certificate
- **WHEN** a browser requests `https://api.mtf.zynis.com.ar/health`
- **THEN** it answers over HTTPS with a valid certificate

### Requirement: Errors are stable and quiet
An API error SHALL answer with its HTTP status and a stable machine-readable code that the app translates. It SHALL NOT include internal details such as stack traces or SQL.

#### Scenario: Refused sign-in
- **WHEN** a sign-in is refused
- **THEN** the answer holds a stable code and no translated text for the user

#### Scenario: Unexpected failure
- **WHEN** the service fails unexpectedly during a request
- **THEN** the answer is a server error with no internal detail, and the detail goes to the log

### Requirement: Backend checks protect main
No change SHALL reach `main` unless the backend builds, its tests pass against Postgres 17 in a container, and its image builds and answers `/health`. The check SHALL run on every pull request, so a required check never waits for a run that was skipped.

#### Scenario: A failing test
- **WHEN** a pull request breaks a backend test
- **THEN** it cannot be merged

#### Scenario: A front-end change
- **WHEN** a pull request touches only the front end
- **THEN** the backend check still runs and reports
