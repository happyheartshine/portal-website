# STEP-BY-STEP FIX: Remove Old Users from Database

## 🔴 Current Problem

You ran the reset, but old `@example.com` users are still in the database.

**Why?** The seed script uses `upsert` which creates/updates users but **doesn't delete** old ones.

## ✅ The Solution: Manual Deletion

### Step 1: Open pgAdmin

1. Launch pgAdmin
2. Connect to your PostgreSQL server
3. Expand: Servers → PostgreSQL → Databases → `portal_db`
4. Right-click `portal_db` → **Query Tool**

### Step 2: Run the Deletion Script

Copy the **entire contents** of `DELETE_OLD_USERS_FINAL.sql` and paste into the Query Tool.

Or manually type this:

```sql
DELETE FROM "User" WHERE email LIKE '%@example.com';
```

Click **Execute** (or press F5)

### Step 3: Verify the Result

The script will show you:
- Users BEFORE deletion
- Users AFTER deletion
- Verification counts

You should see:
```
✅ total_users: 3
✅ portal_users: 3
✅ example_users: 0
```

And only these users:
```
admin@portal.com
manager@portal.com
employee@portal.com
```

### Step 4: Test Login

1. Go to: http://localhost:3000/login
2. Enter:
   - Email: `admin@portal.com`
   - Password: `admin123`
3. Click "Sign In"
4. Should redirect to `/admin/dashboard` ✅

## Alternative: Use Prisma Studio (GUI)

If you prefer a visual interface:

```bash
cd src/api
npx prisma studio
```

This opens http://localhost:5555

1. Click on "User" model
2. You'll see all users in a table
3. Find users with `@example.com` emails
4. Click the row
5. Click "Delete" button
6. Repeat for all `@example.com` users
7. Close Prisma Studio

## Understanding What Happened

### Why Reset Didn't Remove Old Users:

```
Reset Process:
1. ✅ Drop database       (Success)
2. ✅ Create database     (Success)
3. ✅ Run migrations      (Success)
4. ✅ Run seed           (Success)

Seed Process:
1. ✅ Create admin@portal.com     (Success)
2. ✅ Create manager@portal.com   (Success)
3. ✅ Create employee@portal.com  (Success)

But... seed DOES NOT delete old users!
```

### What `npx prisma migrate reset` does:

```typescript
// Pseudo-code of what happens:

1. DROP DATABASE portal_db;           // ← Should delete EVERYTHING
2. CREATE DATABASE portal_db;         // ← Fresh start
3. Run migrations (create tables)     // ← Creates empty tables
4. Run seed (insert test data)        // ← Inserts 3 users

// If database was properly dropped, 
// there should be NO old users!
```

### Possible Reasons Old Users Remain:

1. **Database wasn't fully dropped**
   - Maybe another connection was active
   - pgAdmin might have been connected
   - Backend might have been running

2. **Seed ran on existing database**
   - Reset failed silently
   - Used wrong database connection string

3. **Restore from backup**
   - Automatic backup/restore enabled
   - pgAdmin auto-restore feature

## Complete Fresh Start (Nuclear Option)

If you want to be 100% certain:

### Step 1: Close Everything
```bash
# Stop backend (Ctrl+C in terminal)
# Close Prisma Studio
# Close pgAdmin connections
```

### Step 2: Manually Drop Database in pgAdmin

1. Open pgAdmin
2. Right-click `portal_db` → **Delete/Drop**
3. Confirm deletion

### Step 3: Recreate Database

In pgAdmin Query Tool (connected to `postgres` database, not `portal_db`):

```sql
CREATE DATABASE portal_db;
```

### Step 4: Run Migrations and Seed

```bash
cd src/api

# Apply all migrations
npx prisma migrate deploy

# Run seed
npm run seed
```

### Step 5: Verify

```bash
cd src/api
npx prisma studio
```

Check User table - should have exactly 3 users, all with `@portal.com` emails.

## Verification Checklist

After deletion, verify:

- [ ] Only 3 users in database
- [ ] All users have `@portal.com` emails
- [ ] No `@example.com` users exist
- [ ] Can log in with `admin@portal.com`
- [ ] Redirects to correct dashboard
- [ ] Token stored in sessionStorage

## Quick Verification SQL

Run this anytime to check your database:

```sql
SELECT 
  email,
  role,
  "isActive"
FROM "User"
ORDER BY role;
```

Expected output (ONLY these 3):
```
admin@portal.com     | ADMIN    | true
manager@portal.com   | MANAGER  | true
employee@portal.com  | EMPLOYEE | true
```

## If Problem Persists

If you still see old users after deletion:

1. **Check you're using correct database:**
   ```sql
   SELECT current_database();
   -- Should return: portal_db
   ```

2. **Check DATABASE_URL in .env:**
   ```bash
   cd src/api
   cat .env | grep DATABASE_URL
   ```
   Make sure it points to the correct database.

3. **Try connecting directly with psql:**
   ```bash
   psql $DATABASE_URL
   \dt  # List tables
   SELECT * FROM "User";  # Check users
   ```

4. **Check for multiple databases:**
   ```sql
   -- In pgAdmin
   SELECT datname FROM pg_database 
   WHERE datname LIKE 'portal%';
   ```
   Make sure you're not accidentally using a different database.

## Summary

**Problem:** Old `@example.com` users still exist after reset

**Why:** Seed script doesn't delete old users, only creates/updates

**Solution:** 
1. Open pgAdmin → Query Tool
2. Run: `DELETE FROM "User" WHERE email LIKE '%@example.com';`
3. Verify: `SELECT email FROM "User";`
4. Test: Login with `admin@portal.com`

**Files to use:**
- `DELETE_OLD_USERS_FINAL.sql` - Complete deletion + verification
- `check-users.sql` - Verification queries

---

**After this fix, you should be able to login with `admin@portal.com / admin123` ✅**


