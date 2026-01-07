# Backend Integration Tests

This directory contains end-to-end integration tests for the API using Jest and Supertest.

## Test Structure

- `auth.e2e-spec.ts` - Authentication tests (login, password reset)
- `employee-privacy.e2e-spec.ts` - Employee data privacy tests
- `orders.e2e-spec.ts` - Order submission and approval tests
- `coupons.e2e-spec.ts` - Coupon generation and honoring tests
- `refunds.e2e-spec.ts` - Refund request flow tests
- `salary.e2e-spec.ts` - Salary calculation tests
- `team-scoping.e2e-spec.ts` - Team assignment and manager scoping tests
- `helpers/test-helpers.ts` - Shared test utilities

## Running Tests

### Prerequisites

1. Set up a test database (PostgreSQL)
2. Set environment variables:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/portal_test?schema=public"
   JWT_SECRET="test-secret-key"
   JWT_EXPIRES_IN="15m"
   JWT_REFRESH_EXPIRES_IN="7d"
   ```

### Run All Tests

```bash
cd apps/api
npm run test:e2e
```

### Run Specific Test File

```bash
cd apps/api
npm run test:e2e -- auth.e2e-spec.ts
```

## Test Database

Tests use a separate test database to avoid affecting development data. The test database is cleaned before and after each test run.

## Test Helpers

The `test-helpers.ts` file provides utilities for:
- Creating test users with hashed passwords
- Creating team assignments
- Getting authentication tokens
- Cleaning the test database

## Writing New Tests

1. Create a new `.e2e-spec.ts` file in the `test` directory
2. Use the test helpers from `helpers/test-helpers.ts`
3. Clean up test data in `afterAll` hooks
4. Follow the existing test patterns for consistency

