# Database Migration Guide

## Schema Overview

The database schema has been updated with the following entities:

### Entities

1. **User** - User accounts with roles (EMPLOYEE, MANAGER, ADMIN)
2. **Attendance** - Daily attendance tracking
3. **DailyOrderSubmission** - Daily order submissions with approval workflow
4. **Deduction** - Salary deductions
5. **Warning** - Employee warnings
6. **Coupon** - Coupon management
7. **RefundRequest** - Refund request tracking
8. **TeamAssignment** - Manager-employee relationships
9. **DataPurgeLog** - Data purge audit log

## Key Constraints

- **Unique constraints:**
  - `User.email` - unique
  - `Coupon.code` - unique
  - `DailyOrderSubmission(userId, dateKey)` - one submission per user per day
  - `Attendance(userId, dateKey)` - one attendance record per user per day
  - `TeamAssignment(managerId, employeeId)` - composite primary key

- **Indexes for performance:**
  - All `userId` columns indexed
  - All `dateKey` columns indexed
  - Composite indexes on `(userId, dateKey)` for common queries
  - Status columns indexed for filtering
  - Foreign key columns indexed

## Generating the Migration

After installing dependencies, run:

```bash
cd apps/api
npm install
npm run prisma:generate
npm run prisma:migrate
```

Name the migration: `init_schema`

## Seeding the Database

After migration, seed with:

```bash
npm run seed
```

This will create:
- Admin user (from `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars)
- Sample Manager user
- Sample Employee user
- Team assignment (Manager -> Employee)

## Environment Variables for Seeding

Add to `apps/api/.env`:

```env
ADMIN_EMAIL=admin@portal.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Admin User
```

## Schema Changes Summary

### User Model Changes
- `password` → `passwordHash` (renamed)
- Added `ratePerOrder` (Decimal, nullable)
- Added `isActive` (Boolean, default true)
- Role enum: `EMPLOYEE | MANAGER | ADMIN` (replaced USER/ADMIN/MANAGER)

### New Models
- All entities from PRD requirements
- Proper relationships and cascading deletes
- Comprehensive indexing strategy

