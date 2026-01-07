# Database User Mismatch - Troubleshooting Guide

## Problem

You have users with `@example.com` emails in the database, but the application expects users with `@portal.com` emails.

```
❌ Database:     admin@example.com
✅ Application:  admin@portal.com
```

## Root Cause

The database contains **old test data** that doesn't match the current seed script. This happens when:
1. The database was manually seeded with test data using `@example.com`
2. The seed script was updated to use `@portal.com` 
3. The seed script uses `upsert` which doesn't update users with different emails

## Verify the Problem

### Step 1: Check Database Users

Open pgAdmin and run:

```sql
SELECT id, email, name, role, "isActive"
FROM "User"
ORDER BY email;
```

You'll likely see:
```
admin@example.com      (old)
admin@portal.com       (new - if seed was run)
employee@example.com   (old)
manager@example.com    (old)
```

### Step 2: Check What Seed Script Creates

Open `src/api/prisma/seed.ts` and look at lines 10, 38, 54:
```typescript
const adminEmail = process.env.ADMIN_EMAIL || 'admin@portal.com';  // Line 10
where: { email: 'manager@portal.com' },   // Line 38
where: { email: 'employee@portal.com' },  // Line 54
```

The seed creates `@portal.com` users.

## Solutions

### Option 1: Full Database Reset (Recommended for Development)

**⚠️ WARNING: This deletes ALL data**

#### Windows (PowerShell):
```powershell
.\reset-database.ps1
```

#### Unix/Linux/Mac (Bash):
```bash
chmod +x reset-database.sh
./reset-database.sh
```

#### Manual Steps:
```bash
cd src/api

# Reset database (deletes all data and re-runs migrations)
npx prisma migrate reset --force

# Seed fresh data
npx prisma db seed

cd ../..
```

**Result:**
- All old data deleted
- Fresh migrations applied
- New test users with `@portal.com` emails created

### Option 2: Update Existing User Emails (Keep Data)

If you have important data you want to keep:

#### In pgAdmin:
1. Open Query Tool
2. Copy contents from `update-user-emails.sql`
3. Execute the script
4. Verify with: `SELECT * FROM "User" WHERE email LIKE '%@portal.com';`

#### Using psql:
```bash
cd src/api
psql $DATABASE_URL -f ../update-user-emails.sql
```

**Result:**
- Old users updated to new emails
- All related data (orders, attendance, etc.) preserved
- Can log in with `@portal.com` emails

### Option 3: Delete Old Users Only

If you just want to remove the `@example.com` users:

#### In pgAdmin:
1. Open Query Tool
2. Copy contents from `delete-old-users.sql`
3. Execute the script
4. Run seed: `cd src/api && npx prisma db seed`

#### Using psql:
```bash
cd src/api
psql $DATABASE_URL -f ../delete-old-users.sql
npx prisma db seed
```

**Result:**
- Old `@example.com` users deleted
- New `@portal.com` users created via seed
- Clean slate for test users

## Prevent This in the Future

### 1. Document Test Credentials

Always keep test credentials documented. I've created:
- `AUTH_QUICK_REFERENCE.md` - Lists current test credentials
- `FRONTEND_AUTH_SUMMARY.md` - Test cases and credentials

### 2. Consistent Seeding

Always use the seed script:
```bash
cd src/api
npx prisma db seed
```

Don't manually create test users with different emails.

### 3. Environment Variables

For production or custom deployments, use environment variables:

```bash
# src/api/.env
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=secure-password-here
ADMIN_NAME=System Administrator
```

Then seed will use these values.

### 4. Regular Database Resets in Development

During development, regularly reset the database:
```bash
cd src/api
npx prisma migrate reset --force  # Resets and seeds
```

## Verification After Fix

### Step 1: Check Database
```sql
SELECT email, name, role 
FROM "User" 
ORDER BY role;
```

Expected output:
```
admin@portal.com    | Admin User       | ADMIN
manager@portal.com  | Sample Manager   | MANAGER
employee@portal.com | Sample Employee  | EMPLOYEE
```

### Step 2: Test Login

Navigate to http://localhost:3000/login and try:

```
Email: admin@portal.com
Password: admin123
✅ Should log in successfully and redirect to /admin/dashboard

Email: manager@portal.com
Password: manager123
✅ Should log in successfully and redirect to /manager/dashboard

Email: employee@portal.com
Password: employee123
✅ Should log in successfully and redirect to /dashboard
```

### Step 3: Verify in Network Tab

1. Open browser DevTools → Network
2. Log in
3. Check the `/api/auth/login` request
4. Response should contain:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid-here",
    "email": "admin@portal.com",  ← Should be @portal.com
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

## Current Test Credentials (After Fix)

```
Role: ADMIN
Email: admin@portal.com
Password: admin123
Landing: /admin/dashboard

Role: MANAGER
Email: manager@portal.com
Password: manager123
Landing: /manager/dashboard

Role: EMPLOYEE
Email: employee@portal.com
Password: employee123
Landing: /dashboard
```

## Common Issues After Fix

### Issue: "User already exists" when seeding
**Cause:** Trying to create user that already exists
**Solution:** 
```bash
cd src/api
npx prisma migrate reset --force  # Full reset
```

### Issue: Still can't log in with @portal.com
**Cause:** Cached tokens or browser cache
**Solution:**
1. Open browser DevTools → Application → Session Storage
2. Clear all items
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
4. Try logging in again

### Issue: "Invalid credentials" error
**Cause:** User doesn't exist or password is wrong
**Solution:**
1. Verify user exists: `SELECT * FROM "User" WHERE email = 'admin@portal.com';`
2. If not found, run seed: `cd src/api && npx prisma db seed`
3. Check password is exactly: `admin123`

### Issue: Multiple users with same role
**Cause:** Seed run multiple times without reset
**Solution:**
```sql
-- Find duplicates
SELECT email, COUNT(*) 
FROM "User" 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Delete all and re-seed
DELETE FROM "User";
-- Then run: npx prisma db seed
```

## Technical Details

### Why Upsert Doesn't Update Different Emails

```typescript
// From seed.ts
const admin = await prisma.user.upsert({
  where: { email: adminEmail },  // Looks for 'admin@portal.com'
  update: { /* ... */ },         // Only runs if found
  create: { /* ... */ }          // Only runs if not found
});
```

If database has `admin@example.com`, it won't find `admin@portal.com`, so it creates a **new** user instead of updating.

### Database Schema Constraints

```prisma
model User {
  email String @unique  // ← Enforces unique emails
  // ...
}
```

This prevents duplicate emails, but allows:
- `admin@example.com` AND `admin@portal.com` (both unique)

### Cascade Deletes

When you delete a user, Prisma automatically deletes:
- Attendances
- Orders  
- Refunds
- Warnings
- Team assignments
- Coupons

This is configured in `schema.prisma` with `onDelete: Cascade`.

## Support

If you continue having issues:

1. **Check seed script output:**
   ```bash
   cd src/api
   npx prisma db seed
   ```
   Look for: "✅ Created/Updated admin user: admin@portal.com"

2. **Check database directly:**
   ```bash
   cd src/api
   npx prisma studio
   ```
   Browse to http://localhost:5555 and check User table

3. **Check backend logs:**
   When you try to log in, check the terminal running the backend for error messages

4. **Enable debug logging:**
   ```bash
   # src/api/.env
   LOG_LEVEL=debug
   ```

## Summary

**Problem:** Database has `@example.com` users, app expects `@portal.com`

**Quick Fix:** Run `.\reset-database.ps1` (Windows) or `./reset-database.sh` (Unix)

**Manual Fix:** Run SQL from `update-user-emails.sql` in pgAdmin

**Verification:** Log in at http://localhost:3000/login with `admin@portal.com / admin123`

**Prevention:** Always use `npx prisma db seed` for test data

---

All credentials are now documented in `AUTH_QUICK_REFERENCE.md` 📚


