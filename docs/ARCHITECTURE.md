# API architecture

## Runtime

NestJS composes the feature modules in `src/app.module.ts`. `src/main.ts` configures Helmet, credentialed CORS for the configured frontend origin, DTO validation, a normalized exception filter, Swagger, and the OpenAPI endpoint. A global throttler limits requests, while JWT and role guards protect authenticated operations.

Configuration is loaded only from environment variables. `DATABASE_URL`, a 32-character `JWT_SECRET`, and `FRONTEND_URL` are required at startup. No production connection string is stored in the repository.

## Modules

| Module | Responsibility |
| --- | --- |
| `auth` | Password registration and login, email confirmation, password reset, and JWT issuance |
| `books` | Catalog search, autocomplete-compatible title filtering, author/category filters, pagination, home collections, and admin catalog CRUD |
| `authors` | Author listing and administration |
| `categories` | Category listing and administration |
| `users` | Profiles, admin user management, favorites, cart, and username/email lookups |
| `reviews` | Review CRUD, reports, rating aggregation, and ownership enforcement |
| `payments` | Server-owned cart snapshots, MercadoPago preferences and verification, signed webhooks, orders, and email delivery |
| `stats` | Admin-only user, catalog, category, and order analytics |
| `email` | SMTP delivery, confirmation and reset messages, receipts, and generated PDF attachments |
| `health` | Liveness endpoint |

## Data model

`src/core/entities` defines users, books, authors, categories, reviews and reports, favorites, cart items, orders, and order items. Books have normalized many-to-many author/category relations. Reviews relate to one user and book; each report is a unique review/user row. Favorite and cart entries are explicit join entities. An order stores a decimal total and status; its items retain title and decimal unit-price snapshots.

Migrations and seeders are in `src/core/database`. The initial migration creates the normalized PostgreSQL schema. The importer reads the old database through `LEGACY_DATABASE_URL`, creates normalized records, resets serial sequences, and never reads or copies the old application configuration. Run it only against an empty destination. Legacy account password hashes are omitted because the source uses bcrypt and the target uses Argon2.

The `openapi:write` command builds the service and exports a fresh Swagger document without opening a database connection. The UI type-generation command consumes that document.

## Payment flow

1. An authenticated customer requests `POST /payments`; the API loads their cart, prices it from the database, stores an order and item snapshots, and creates a MercadoPago preference.
2. MercadoPago returns the customer to the frontend and sends a signed webhook to `/payments/webhook`.
3. The API validates the webhook signature, fetches the payment directly from MercadoPago, checks the external order reference and exact decimal total, and updates the order in a database transaction.
4. A successful order increments book and category sales, clears the customer’s cart, and sends receipt and ebook-detail PDFs. Notification timestamps allow retries without counting sales twice.

The frontend must never submit a trusted amount, user ID, book price, or payment status.

## Contract differences

- Catalog prices use decimal strings rather than floating-point JSON numbers.
- Checkout derives the order from the authenticated cart; legacy client-provided cart and amount fields are ignored and rejected.
- Payment verification takes `{ "paymentId": "..." }` and retrieves the authoritative result from MercadoPago.
- User payment history/detail requires a bearer token; administrators can inspect all orders.
- Catalog browsing is public. Account, cart, checkout, and administrative operations continue to use JWT and role guards.
