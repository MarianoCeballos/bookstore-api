# Bookstore API Audit and Refactoring Report

## 1. Overview

This document records the backend validation, data-integrity, and contract-hardening improvements implemented in `bookstore-api` alongside the `bookstore-ui` portfolio redesign.

## 2. Backend Audit Findings & Resolutions

| ID         | Category             | Location                             | Issue                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                   |
| ---------- | -------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API-01** | Confirmed Defect     | `src/modules/books/books.service.ts` | `BooksService.create()` and `BooksService.update()` assigned `book.title = input.title.trim().toLowerCase()`, corrupting book title casing across the database and API responses.                    | Preserved `input.title.trim()` display casing while performing case-insensitive duplicate checks via `{ title: { $ilike: escapeLike(normalizedTitle) } }`.                                                                            |
| **API-02** | Confirmed Defect     | `src/modules/books/books.service.ts` | `resolveAuthors()` and `resolveCategories()` only deduplicated exact-case strings, risking duplicate join/entity creation when inputs differed only by case or surrounding whitespace.               | Trimmed and deduplicated author/category names case-insensitively (`seen.has(trimmed.toLowerCase())`) before querying or creating taxonomy entities.                                                                                  |
| **API-03** | Confirmed Defect     | `src/modules/auth/auth.service.ts`   | `confirmPasswordReset()` called `this.users.findOne({ ID: Number(userId) })` before verifying whether `userId` was a valid positive integer, risking `NaN` query parameters.                         | Added a positive-integer guard (`Number.isSafeInteger(numericId)` plus a `numericId < 1` check) that throws `BadRequestException('Invalid reset request')` before lookup.                                                             |
| **API-04** | Validation Hardening | `src/modules/**/dto/*.dto.ts`        | Multiple DTOs accepted whitespace-only strings (`"   "`), lacked `@Transform` trimming, or allowed empty author/category arrays on book creation.                                                    | Added `@Transform` trimming and strict `class-validator` decorators across `CreateBookDto`, `TaxonomyNameInputDto`, `CreateCheckoutDto`, `CreateReviewDto`, `UpdateReviewDto`, `ContactEmailDto`, `RegisterDto`, and `UpdateUserDto`. |
| **API-05** | Data Integrity       | `src/modules/books/books.service.ts` | The case-insensitive duplicate pre-checks in `create()`, `update()`, `resolveAuthors()`, and `resolveCategories()` can race, so duplicated rows could still reach the database.                      | Added a migration with unique indexes on `lower("title")`, `lower("name")`, and `lower("category")`, and translated unique-constraint failures from `flush()` into `ConflictException`.                                               |
| **API-06** | Data Integrity       | `src/modules/books/books.service.ts` | `BooksService.update()` turned an explicitly blank `image`, `publisher`, `publishedDate`, or `language` into `undefined`, which is skipped in the `UPDATE` statement instead of clearing the column. | Kept `undefined` for omitted fields and stored `null` for explicitly blank optional values.                                                                                                                                           |

## 3. Hardened DTO Contracts

- **`CreateBookDto` (`src/modules/books/dto/create-book.dto.ts`)**:
  - Trims `title`, `description`, `publisher`, `language`, and `image`.
  - Requires `@ArrayMinSize(1)` on `authors` and `categories`.
- **`TaxonomyNameInputDto` (`src/modules/books/dto/taxonomy-input.dto.ts`)**:
  - Trims `name` and enforces `@IsNotEmpty()` + `@MaxLength(120)`.
- **`CreateCheckoutDto` (`src/modules/payments/dto/create-checkout.dto.ts`)**:
  - Enforces `@IsBoolean()` on optional `gift` and trims `giftUsername`.
- **`CreateReviewDto` & `UpdateReviewDto` (`src/modules/reviews/dto/`)**:
  - Trims `title` and `comment` and enforces `@IsNotEmpty()` on `comment`.
- **`ContactEmailDto` (`src/modules/email/dto/contact-email.dto.ts`)**:
  - Trims `userName`, `email`, and `comment`, rejecting whitespace-only submissions.
- **`RegisterDto` (`src/modules/auth/dto/register.dto.ts`) & `UpdateUserDto` (`src/modules/users/dto/update-user.dto.ts`)**:
  - Trims `name`, `lastname`, `username`, and `email` (lowercased).

## 4. Verification

`corepack yarn sanitycheck` (`yarn typecheck && yarn lint && yarn test --runInBand && yarn build`) passes:

- `yarn typecheck` — `tsc --noEmit`
- `yarn lint` — `eslint "./src/**/*.{ts,tsx}"`
- `yarn test --runInBand` — `jest` (`auth.service.spec.ts`, `books.service.spec.ts`, `payment-signature.spec.ts`, `users.service.spec.ts`)
- `yarn build` — `nest build`

`yarn lint:changed` (see `scripts/lint-changed.mjs`) lints only the files touched in the working tree for a faster local loop.
