# Bookstore API Audit and Refactoring Report

## 1. Overview

This document records the backend validation, data-integrity, and contract-hardening improvements implemented in `bookstore-api` alongside the `bookstore-ui` portfolio redesign.

## 2. Backend Audit Findings & Resolutions

| ID         | Category             | Location                             | Issue                                                                                                                                                                                  | Fix                                                                                                                                                                                                                                   |
| ---------- | -------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------- |
| **API-01** | Confirmed Defect     | `src/modules/books/books.service.ts` | `BooksService.create()` and `BooksService.update()` assigned `book.title = input.title.trim().toLowerCase()`, corrupting book title casing across the database and API responses.      | Preserved `input.title.trim()` display casing while performing case-insensitive duplicate checks via `{ title: { $ilike: escapeLike(normalizedTitle) } }`.                                                                            |
| **API-02** | Confirmed Defect     | `src/modules/books/books.service.ts` | `resolveAuthors()` and `resolveCategories()` only deduplicated exact-case strings, risking duplicate join/entity creation when inputs differed only by case or surrounding whitespace. | Trimmed and deduplicated author/category names case-insensitively (`seen.has(trimmed.toLowerCase())`) before querying or creating taxonomy entities.                                                                                  |
| **API-03** | Confirmed Defect     | `src/modules/auth/auth.service.ts`   | `confirmPasswordReset()` called `this.users.findOne({ ID: Number(userId) })` before verifying whether `userId` was a valid positive integer, risking `NaN` query parameters.           | Added `const numericId = Number(userId); if (!Number.isSafeInteger(numericId)                                                                                                                                                         |     | numericId < 1) throw new BadRequestException('Invalid reset request');` prior to database lookup. |
| **API-04** | Validation Hardening | `src/modules/**/dto/*.dto.ts`        | Multiple DTOs accepted whitespace-only strings (`"   "`), lacked `@Transform` trimming, or allowed empty author/category arrays on book creation.                                      | Added `@Transform` trimming and strict `class-validator` decorators across `CreateBookDto`, `TaxonomyNameInputDto`, `CreateCheckoutDto`, `CreateReviewDto`, `UpdateReviewDto`, `ContactEmailDto`, `RegisterDto`, and `UpdateUserDto`. |

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

`corepack yarn sanitycheck` passes with zero warnings or errors:

- `prettier --check "{src,test}/**/*.ts"`
- `eslint "{src,test}/**/*.ts" --max-warnings 0`
- `tsc -p tsconfig.json --noEmit`
- `jest --runInBand` (`auth.service.spec.ts`, `books.service.spec.ts`, `payment-signature.spec.ts`)
- `nest build`
