# Bookstore API Agent Instructions

## Stack & Architecture

- **Framework**: NestJS 11 (`src/app.module.ts`, `src/main.ts`)
- **ORM & DB**: MikroORM 6 + PostgreSQL (`src/core/entities/`, `src/core/database/`)
- **Validation**: Global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`). All DTOs under `src/modules/**/dto/` use `@Transform` string trimming and strict `class-validator` rules.
- **Payments**: Server-owned cart snapshot & MercadoPago checkout (`src/modules/payments/`).

## Commands

- Validation gate: `corepack yarn sanitycheck`
- Export OpenAPI contract: `corepack yarn openapi:write`
- Tests: `corepack yarn test --runInBand`

## Conventions

- Preserve original trimmed casing for book titles (`input.title.trim()`) while checking case-insensitive uniqueness via `$ilike: escapeLike(normalizedTitle)`.
- Deduplicate authors and categories case-insensitively in `BooksService`.
- Validate numeric IDs with `Number.isSafeInteger` before querying MikroORM repositories.
- Never modify `.github/`, `Dockerfile`, or `docker-compose.yml` unless explicitly instructed.
- Reference: `docs/ARCHITECTURE.md` and `docs/AUDIT_AND_REFACTORING.md`.
