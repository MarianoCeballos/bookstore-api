---
name: code-review
description: Review Bookstore code changes for correctness, maintainability, security, and regression risk before merging.
---

# Code Review

Review the requested change with a practical, evidence-based lens. Focus on the actual diff and the repository's real risk areas: authentication and authorization, validation, database integrity, payment flows, emails, and API contract changes.

## Project context

This repository is the Bookstore API built with NestJS and TypeScript. The most important review questions are:

- Does the change preserve the API contract and expected DTO validation?
- Are auth and role checks enforced consistently?
- Are database operations safe, transactional, and consistent with existing entities and migrations?
- Are payment, webhook, and email flows protected against spoofing or unsafe assumptions?
- Are regressions covered by tests and do the changes remain easy to reason about?

## Review workflow

1. Read the diff and identify the actual behavior being changed.
2. Check the relevant files for contracts, validation, permissions, and error handling.
3. Look for correctness bugs, edge cases, security issues, and test gaps.
4. Prefer specific findings tied to a file, function, or code path over generic style remarks.

## Focus areas

### Correctness and contracts

- Confirm route and payload changes match the intended API behavior.
- Validate DTOs, property names, and response shapes before claiming a fix is complete.
- Check null, empty, and auth-context edge cases that common happy-path code misses.

### Security

- Ensure user-supplied data is validated and sanitized before use.
- Review authorization checks for admin-only, owner-only, and authenticated-only routes.
- Verify external integrations like MercadoPago or email/webhook handlers validate signatures, secrets, and trust boundaries.
- Avoid leaking sensitive data, tokens, or internal exceptions to clients.

### Data integrity and reliability

- Check whether inserts, updates, or imports are idempotent and safe under retries.
- Review migration assumptions, unique constraints, and transaction boundaries.
- Watch for N+1 queries, expensive loops, and unbounded pagination or bulk operations in request flows.

### Testing and maintainability

- Prefer reviewing for regression protection: ensure behavior is covered by focused tests where practical.
- Flag code that is hard to test, hard to reason about, or duplicates existing patterns in a way that will drift later.
- Recommend the smallest clear fix rather than broad refactors when the bug is localized.

## Response format

When reporting findings:

- State the issue clearly and specifically.
- Name the file and affected function or block when possible.
- Explain why it matters and the risk if left unresolved.
- Suggest a precise, minimal fix direction.

If the change appears safe, say so clearly and keep the review concise.

## Example review summary

- `src/auth/auth.service.ts`: token verification is missing a required null check when the user record is absent, potentially allowing unexpected authentication failures in edge cases.
- `src/payments/mercadopago.service.ts`: webhook verification accepts the raw request body without validating the provider signature, exposing the endpoint to spoofed callbacks.

Keep the review grounded, actionable, and limited to issues that materially affect correctness, security, or maintainability.
