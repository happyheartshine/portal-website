# 🔴 URGENT: 401 Unauthorized Error - Quick Fix

## Your Error

```
POST http://localhost:8080/api/auth/login 401 (Unauthorized)
```

## What This Means

The backend is **rejecting your login** because:
1. User `admin@portal.com` doesn't exist in database, OR
2. Password is wrong, OR
3. User exists but is inactive

## ⚡ Quick Fix (Choose One)

### Option 1: Run Diagnostic Script (Easiest)

```powershell
.\diagnose-and-fix.ps1
```

This script will:
- Check if backend is running
- Check what users exist
- Fix the issue automatically
- Test the login

### Option 2: Manual Check (Quick)

#### Step 1: Check Database
Open pgAdmin → Query Tool → Run:

```sql
SELECT email, role, "isActive", 
       "passwordHash" IS NOT NULL as has_password
FROM "User" 
WHERE email = 'admin@portal.com';
```

**If you get NO RESULTS:**
```bash
cd src/api
npm run seed
```

**If you get results but `has_password = false`:**
```bash
cd src/api
npm run seed  # This will update the password
```

**If user is inactive (`isActive = false`):**
```sql
UPDATE "User" 
SET "isActive" = true 
WHERE email = 'admin@portal.com';
```

#### Step 2: Delete Old Users
If you still have `@example.com` users:

```sql
DELETE FROM "User" WHERE email LIKE '%@example.com';
```

#### Step 3: Test
Go to http://localhost:3000/login

Use **EXACTLY** these credentials:
```
Email: admin@portal.com
Password: admin123
```

(No spaces, all lowercase for email, case-sensitive password)

### Option 3: Nuclear Reset (Guaranteed to Work)

```bash
cd src/api

# Stop backend (Ctrl+C if running)

# Full reset
npx prisma migrate reset --force

# Start backend
npm run dev
```

Then test login.

## 🔍 Verify What's in Database RIGHT NOW

### Check 1: User Exists?
```sql
SELECT COUNT(*) FROM "User" WHERE email = 'admin@portal.com';
```

**Expected:** 1
**If 0:** User doesn't exist, run seed

### Check 2: Password Hash?
```sql
SELECT LENGTH("passwordHash") FROM "User" WHERE email = 'admin@portal.com';
```

**Expected:** 60 (bcrypt hash)
**If NULL or ≠ 60:** Password is broken, run seed

### Check 3: Is Active?
```sql
SELECT "isActive" FROM "User" WHERE email = 'admin@portal.com';
```

**Expected:** true (or t)
**If false:** User is disabled

### Check 4: Any Old Users?
```sql
SELECT email FROM "User" WHERE email LIKE '%@example.com';
```

**Expected:** (empty)
**If results:** Delete them!

## 🎯 Most Likely Cause

**You didn't delete the `@example.com` users yet!**

The seed created `admin@portal.com`, but `admin@example.com` still exists.

When you try to login:
- Frontend sends: `admin@portal.com / admin123`
- Backend looks for: `admin@portal.com` ✅ (finds it)
- Backend checks password: Hash doesn't match ❌
- Why? Because the seed's password hash might not have updated correctly

**Solution:**
```bash
cd src/api

# Delete ALL users
npx ts-node -e "require('@prisma/client').PrismaClient().user.deleteMany().then(() => console.log('Deleted all'))"

# Re-seed
npm run seed
```

## 📝 Test Credentials

After fix, use **EXACTLY**:
```
Email: admin@portal.com
Password: admin123
```

Common mistakes:
- ❌ `Admin@portal.com` (capital A)
- ❌ `admin@Portal.com` (capital P)
- ❌ `admin@portal.com ` (space at end)
- ❌ `admin 123` (space in password)
- ❌ `Admin123` (capital A)

## 🐛 Still Not Working?

### Get Backend Logs

When you try to login, check the terminal where backend runs.

You should see either:
- No error (200 OK) ✅
- `UnauthorizedException: Invalid credentials` ❌

### Test API Directly

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@portal.com","password":"admin123"}'
```

**Success response (200):**
```json
{"access_token":"...","refresh_token":"...","user":{...}}
```

**Error response (401):**
```json
{"statusCode":401,"message":"Invalid credentials"}
```

### Check Backend is Running

Visit: http://localhost:8080/docs

Should see Swagger API documentation.

If not:
```bash
cd src/api
npm run dev
```

## 📚 Documentation

- **`TROUBLESHOOT_401_ERROR.md`** - Complete troubleshooting guide
- **`CHECK_USERS_NOW.sql`** - SQL queries to verify database
- **`diagnose-and-fix.ps1`** - Automated diagnostic script

## 🎯 Summary

**Problem:** 401 Unauthorized
**Cause:** User doesn't exist, wrong password, or inactive
**Fix:** Delete old users + run seed
**Test:** Login with `admin@portal.com / admin123`

---

**Run this NOW to fix:**
```bash
cd src/api
npm run seed
```

Then try login again! ✅

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
