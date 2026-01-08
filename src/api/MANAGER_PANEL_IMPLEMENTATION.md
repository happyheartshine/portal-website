# Manager Panel Implementation Summary

## Overview
This document summarizes the implementation of Manager Panel requirements as specified in the requirements document.

## Schema Changes

### Migration: `20260107234833_add_manager_panel_fields`

**RefundRequest Model:**
- Added `refundedAmountUSD` (Decimal, default 0) - tracks total refunded amount so far
- Added `fullyRefundedAt` (DateTime, nullable) - timestamp when refund was fully completed

**Warning Model:**
- Added `archivedAt` (DateTime, nullable) - for lazy-archiving warnings older than 30 days
- Added index on `archivedAt` for performance

**Deduction Model:**
- Field `amount` represents `amountINR` (INR currency, stored as Decimal)
- Comment added to clarify currency semantics

## Modules Added/Updated

### New Modules
1. **ManagementModule** (`src/api/src/management/`)
   - Management-specific endpoints for managers
   - Endpoints: `/management/*`

2. **WarningsModule** (`src/api/src/warnings/`)
   - Employee-facing warnings endpoints
   - Endpoints: `/warnings/*`

3. **EmployeesModule** (`src/api/src/employees/`)
   - Employee options endpoint for dropdowns
   - Endpoints: `/employees/*`

### Updated Modules
1. **RefundsModule** - Updated to include `refundedAmountUSD` and `canArchive` flag
2. **ManagerModule** - Updated warning creation to use `message` field
3. **DashboardModule** - Updated to include warnings in employee dashboard

## Endpoints Implemented

### A) Auth / Role
- ✅ RolesGuard and @Roles decorator already exist
- ✅ MANAGER role is enforced on all `/management/*` endpoints
- ✅ Manager endpoints require `role == MANAGER` (not ADMIN)

### B) Management Dashboard Summary
**GET `/management/dashboard/summary`**
- Returns:
  - `pendingRefunds`: { count, totalAmountUSD }
  - `refundAnalytics`: { count, totalAmountUSD } (all refunds)
  - `creditAnalytics`: { count, totalAmountUSD } (ACTIVE+USED+EXPIRED coupons)
- Manager-only access

### C) Verify Orders
**GET `/management/orders`**
- Query params: `status`, `employeeId`, `from`, `to`, `cursor`, `limit`
- Returns cursor-paginated list of orders across all employees
- Includes employee name/id in results
- Manager-only access

**POST `/management/orders/:orderId/approve`**
- Approves an order (sets status APPROVED)
- Records `approvedBy` (manager id) and `approvedAt`
- Idempotent: approving already approved order returns as-is
- Manager-only access

### D) Process Refunds
**GET `/management/refunds`**
- Query params: `status`, `q` (customer name search), `amount`, `cursor`, `limit`
- Returns refunds with `requestedAmountUSD` and `refundedAmountUSD`
- Manager-only access

**POST `/management/refunds/:refundId/process`**
- Body: `{ refundedAmountUSD: number }`
- Business rules:
  - `refundedAmountUSD` is treated as **TOTAL refunded so far** (not incremental)
  - Validates: `refundedAmountUSD > 0`
  - Validates: `refundedAmountUSD <= requestedAmountUSD` (rejects over-refund)
  - If `refundedAmountUSD == requestedAmountUSD`: sets status DONE, sets `fullyRefundedAt`
  - If `refundedAmountUSD < requestedAmountUSD`: keeps status PENDING
- Manager-only access

**Employee Refund Endpoints Updated:**
- `GET /me/refunds` - Now includes:
  - `requestedAmountUSD`
  - `refundedAmountUSD`
  - `isPartial` flag
  - `canArchive` flag
- `POST /me/refunds/:id/confirm-informed` - Updated to enforce:
  - Cannot archive if partial refund (returns 403)
  - Can archive if fully refunded (status DONE or refundedAmountUSD >= requestedAmountUSD)

### E) Discipline / Warnings
**POST `/manager/warnings`** (Updated)
- Body: `{ employeeId: string, message: string }`
- Creates warning with message stored as `reason` field
- Manager-only access

**GET `/warnings/me`**
- Query params: `tab` (recent|archive), `cursor`, `limit`
- Implements lazy-archive: automatically archives warnings older than 30 days on read
- `recent` tab: `archivedAt IS NULL` and `createdAt within 30 days`
- `archive` tab: `archivedAt IS NOT NULL` OR `createdAt older than 30 days`
- Returns cursor-paginated list
- Employee access (authenticated)

**POST `/warnings/:id/read`**
- Marks warning as read (sets `readAt`)
- Does not archive (only hides from unread filters)
- Employee access (authenticated)

**Employee Dashboard Integration:**
- `GET /me/dashboard` now includes `warnings` array with recent unread warnings
- Lazy-archive runs on dashboard fetch as well

### F) Deductions
**GET `/management/deductions/reasons`**
- Returns fixed enum list of deduction reasons:
  - `late_submission`: "Late Submission"
  - `quality_issue`: "Quality Issue"
  - `attendance`: "Attendance Violation"
  - `policy_violation`: "Policy Violation"
  - `other`: "Other"
- Manager-only access

**POST `/management/deductions`**
- Body: `{ employeeId: string, reasonKey: string, amountINR: number }`
- Validates `amountINR > 0`
- Creates deduction in INR (stored as `amount` field)
- Manager-only access

### G) Employees Options
**GET `/employees/options`**
- Returns list of active employees: `{ id, name }`
- Sorted by name ascending
- Manager/Admin access

## Currency Semantics (Server-Enforced)

1. **Salary & Deductions**: INR (₹) amounts
   - Stored as `Decimal` type
   - Field names: `amount` (for deductions), `ratePerOrder` (for salary)

2. **Refunds & Coupons/Credit**: USD amounts
   - Stored as `Decimal` type
   - Field names: `amount` (requestedAmountUSD), `refundedAmountUSD` (for refunds)
   - Coupon `amount` and `remainingBalance` are in USD

## Business Rules Implemented

### Refund Processing
- ✅ Full refund: `refundedAmountUSD >= requestedAmountUSD` → status DONE
- ✅ Partial refund: `refundedAmountUSD < requestedAmountUSD` → status PENDING
- ✅ Over-refund: `refundedAmountUSD > requestedAmountUSD` → rejected (400)
- ✅ Employee can archive only after fully refunded (enforced server-side)

### Warnings
- ✅ Recent visible by default (within 30 days, not archived)
- ✅ After 30 days, warnings automatically archived (lazy-archive on read/list)
- ✅ Employee can mark as read (does not archive)

### Manager vs Admin
- ✅ Manager has management features but NO attendance control
- ✅ Manager endpoints use `@Roles(UserRole.MANAGER)` guard
- ✅ Manager cannot access admin-only endpoints

## Testing Notes

Integration tests should cover:
1. Manager-only guard on `/management/*` endpoints
2. Process refund:
   - Partial keeps pending and sets refundedAmountUSD
   - Full sets DONE
   - Over-refund rejected
3. Employee archive forbidden while partial
4. Warnings:
   - Manager creates warning
   - Employee sees on dashboard
   - Mark as read hides from dashboard list
   - Warnings older than 30 days appear in archive (lazy archive)

## Migration Instructions

1. Apply the migration:
   ```bash
   cd src/api
   npx prisma migrate dev
   ```

2. The migration adds:
   - `refunded_amount_usd` column to `refund_requests` (default 0)
   - `fully_refunded_at` column to `refund_requests` (nullable)
   - `archived_at` column to `warnings` (nullable)
   - Index on `warnings.archived_at`

## Assumptions

1. **Existing Enums**: Used existing `RefundRequestStatus` (PENDING, DONE, ARCHIVED) and `OrderSubmissionStatus` (PENDING, APPROVED, REJECTED)
2. **Team Scoping**: Manager can view all employees if no team assignments exist (existing behavior preserved)
3. **Currency Fields**: Existing `amount` fields in RefundRequest and Coupon are USD; Deduction `amount` is INR
4. **Idempotency**: Order approval is idempotent (approving already approved order is safe)
5. **Lazy Archive**: Warnings are archived lazily on read/list operations (not via scheduled job)

## Files Created

### DTOs
- `src/api/src/management/dto/process-refund.dto.ts`
- `src/api/src/management/dto/create-deduction.dto.ts`

### Services
- `src/api/src/management/management.service.ts`
- `src/api/src/warnings/warnings.service.ts`
- `src/api/src/employees/employees.service.ts`

### Controllers
- `src/api/src/management/management.controller.ts`
- `src/api/src/warnings/warnings.controller.ts`
- `src/api/src/employees/employees.controller.ts`

### Modules
- `src/api/src/management/management.module.ts`
- `src/api/src/warnings/warnings.module.ts`
- `src/api/src/employees/employees.module.ts`

### Migration
- `src/api/prisma/migrations/20260107234833_add_manager_panel_fields/migration.sql`

## Files Modified

1. `src/api/prisma/schema.prisma` - Added fields to RefundRequest and Warning models
2. `src/api/src/app.module.ts` - Added new modules
3. `src/api/src/refunds/refunds.service.ts` - Added refundedAmountUSD and canArchive logic
4. `src/api/src/manager/manager.service.ts` - Updated warning creation to use message field
5. `src/api/src/manager/dto/create-warning.dto.ts` - Changed to use employeeId and message
6. `src/api/src/dashboard/dashboard.service.ts` - Added warnings to dashboard response

