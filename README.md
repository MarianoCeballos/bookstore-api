# Bookstore API

NestJS and TypeScript API for the Bookstore ebook marketplace. The service uses PostgreSQL and MikroORM, exposes Swagger at `/docs`, and serves its OpenAPI document at `/openapi.json`.

## Requirements

- Node.js 20.19 or newer
- Corepack and Yarn 4
- Docker Compose for local PostgreSQL, or a PostgreSQL 14+ database

## Setup

```powershell
corepack enable
Copy-Item .env.example .env
corepack yarn install --immutable
docker compose up -d postgres
corepack yarn build
corepack yarn migration:up
corepack yarn seed
corepack yarn start:dev
```

Compose starts only PostgreSQL. The API runs locally and listens on `http://localhost:3001`. PostgreSQL is published on host port `5433` and listens on container port `5432`; if the default host port is unavailable, set `POSTGRES_HOST_PORT` and update `DATABASE_URL` to use the same port. The example PostgreSQL credentials are for local development only.

## Environment

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode |
| `PORT` | HTTP port, defaults to `3001` |
| `POSTGRES_HOST_PORT` | Host port published by the Docker PostgreSQL container, defaults to `5433` |
| `DATABASE_URL` | PostgreSQL connection URL |
| `JWT_SECRET` | Signing secret with at least 32 characters |
| `JWT_EXPIRES_IN_SECONDS` | Access-token lifetime |
| `FRONTEND_URL` | Frontend destination for confirmation and payment return links |
| `MERCADOPAGO_ACCESS_TOKEN` | MercadoPago API access token |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret used to verify MercadoPago webhook signatures |
| `API_PUBLIC_URL` | Public API origin used for payment notifications |
| `EMAIL_HOST` | SMTP hostname |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_SECURE` | Whether SMTP uses TLS |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASSWORD` | SMTP password |
| `EMAIL_FROM` | Sender address |
| `CONTACT_EMAIL` | Destination address for contact mail |
| `LEGACY_DATABASE_URL` | Optional source PostgreSQL URL for the one-off importer |
| `LEGACY_DATABASE_SSL` | Set to `true` when the legacy database requires TLS |
| `IMPORT_LEGACY_DATA` | Must be exactly `YES` to enable a one-time import |

Never commit a real `.env` file or credentials. The catalog is public and can be browsed without an account; account, cart, checkout, and administration operations require username/password authentication.

## Commands

| Command | Purpose |
| --- | --- |
| `yarn start:dev` | Start the API in watch mode |
| `yarn build` | Compile production JavaScript |
| `yarn start:prod` | Run the compiled API |
| `yarn typecheck` | Run strict TypeScript checks |
| `yarn lint` | Run ESLint |
| `yarn test --runInBand` | Run Jest tests |
| `yarn sanitycheck` | Run typecheck, lint, tests, and build |
| `yarn migration:create` | Generate a MikroORM migration |
| `yarn migration:up` | Apply migrations |
| `yarn migration:down` | Roll back the most recent migration |
| `yarn seed` | Fill books, authors and categories from the Google Books API (re-runnable) |
| `yarn data:import` | Import records from a separate legacy database |
| `yarn openapi:write` | Export the Swagger contract to `openapi.json` without a database |

Run the importer only against a fresh destination database after setting `LEGACY_DATABASE_URL` and `IMPORT_LEGACY_DATA=YES`. It refuses to run if users, books, or orders already exist. Imported bcrypt password hashes cannot be converted to Argon2 without plaintext passwords, so imported accounts must use the email password-reset flow before signing in. The importer intentionally does not import transient Google Books API cache rows.

## API contract

The existing catalog, user, auth, review, and admin statistics routes are retained. Prices are returned as decimal strings. MercadoPago checkout now creates an order from the authenticated user’s server-side cart; payment verification accepts the provider payment ID and confirms it directly with MercadoPago. Payment list/detail routes require authentication and are scoped to the account except for administrators. The public payment body no longer controls the user, order items, or total.

Username/password sign-in is available for account operations. Third-party identity providers are not configured. Email confirmation links expire after 24 hours. Approved orders send a PDF receipt and generated ebook-detail PDFs by email.

## Structure

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for module boundaries, entities, request flow, and migration notes.
