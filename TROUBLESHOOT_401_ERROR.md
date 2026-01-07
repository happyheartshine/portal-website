# TROUBLESHOOTING: 401 Unauthorized Error

## 🔴 Problem

You're getting **401 Unauthorized** when trying to login with `admin@portal.com`.

```
POST http://localhost:8080/api/auth/login 401 (Unauthorized)
```

## 🔍 Possible Causes

### 1. **User doesn't exist in database**
   - You ran seed, but it failed silently
   - Database connection was wrong
   - User was deleted

### 2. **Password hash is incorrect**
   - Password was changed manually
   - Seed used different password
   - bcrypt salt rounds don't match

### 3. **User is inactive**
   - `isActive = false` in database
   - Backend checks this before auth

### 4. **Wrong database**
   - Connected to wrong database
   - DATABASE_URL points elsewhere

### 5. **Old user with same email**
   - `@example.com` user still exists
   - Trying to login with `@portal.com`

## ⚡ IMMEDIATE CHECKS

### Step 1: Verify Backend is Running

Check terminal where backend runs. Should see:
```
🚀 API is running on: http://localhost:8080
📚 Swagger docs available at: http://localhost:8080/docs
```

If not running:
```bash
cd src/api
npm run dev
```

### Step 2: Check Database Users RIGHT NOW

Open pgAdmin → Query Tool → Run:

```sql
SELECT email, role, "isActive" FROM "User";
```

**What do you see?**

#### Scenario A: No users at all
```
(empty result)
```
**Solution:** Seed never ran. Run:
```bash
cd src/api
npm run seed
```

#### Scenario B: Only @example.com users
```
admin@example.com
manager@example.com
employee@example.com
```
**Solution:** Need to delete these and seed again:
```sql
DELETE FROM "User";
```
Then:
```bash
cd src/api
npm run seed
```

#### Scenario C: Both @example.com and @portal.com
```
admin@example.com
admin@portal.com
manager@example.com
manager@portal.com
...
```
**Solution:** Delete old ones:
```sql
DELETE FROM "User" WHERE email LIKE '%@example.com';
```

#### Scenario D: Only @portal.com users (GOOD!)
```
admin@portal.com
manager@portal.com
employee@portal.com
```
**This is correct!** Problem is elsewhere (see Step 3)

### Step 3: Test the Exact Password

The seed script creates admin with:
```
Email: admin@portal.com
Password: admin123
```

Try login with **EXACTLY** these credentials:
- ✅ `admin@portal.com` (all lowercase)
- ✅ `admin123` (no spaces, no caps)

### Step 4: Check Backend Logs

When you try to login, check the terminal running backend. Should see one of:

**Success:**
```
[No error, just returns 200]
```

**User not found:**
```
UnauthorizedException: Invalid credentials
```

**User inactive:**
```
UnauthorizedException: Invalid credentials
```

**Wrong password:**
```
UnauthorizedException: Invalid credentials
```

Backend doesn't reveal which error for security!

### Step 5: Verify Password Hash

In pgAdmin:

```sql
SELECT 
  email,
  LEFT("passwordHash", 20) as hash_start,
  LENGTH("passwordHash") as hash_length,
  "isActive"
FROM "User"
WHERE email = 'admin@portal.com';
```

Expected:
```
email: admin@portal.com
hash_start: $2b$10$... (bcrypt format)
hash_length: 60
isActive: true
```

If `passwordHash` is NULL or length ≠ 60, password is wrong!

## 🔧 Solutions

### Solution 1: Fresh Seed (Recommended)

```bash
# Delete all users
cd src/api
npx ts-node -e "
  import { PrismaClient } from '@prisma/client';
  const prisma = new PrismaClient();
  prisma.user.deleteMany().then(() => {
    console.log('✅ All users deleted');
    prisma.\$disconnect();
  });
"

# Run seed
npm run seed
```

### Solution 2: Manual User Creation

If seed keeps failing, create user manually:

```sql
-- Delete old admin
DELETE FROM "User" WHERE email = 'admin@portal.com';

-- Create new admin with correct password hash
-- Password: admin123
-- Hash generated with: bcrypt.hash('admin123', 10)
INSERT INTO "User" (id, email, "passwordHash", name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@portal.com',
  '$2b$10$YourHashHere',  -- Need to generate this!
  'Admin User',
  'ADMIN',
  true,
  NOW(),
  NOW()
);
```

**Problem:** Need to generate hash. Better to use seed script!

### Solution 3: Reset Password for Existing User

If user exists but password is wrong:

```bash
cd src/api
npx ts-node -e "
  import { PrismaClient } from '@prisma/client';
  import * as bcrypt from 'bcrypt';
  
  const prisma = new PrismaClient();
  
  async function resetPassword() {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.update({
      where: { email: 'admin@portal.com' },
      data: { 
        passwordHash: hash,
        isActive: true 
      }
    });
    console.log('✅ Password reset to: admin123');
    await prisma.\$disconnect();
  }
  
  resetPassword();
"
```

### Solution 4: Complete Nuclear Reset

```bash
cd src/api

# 1. Stop backend (Ctrl+C)
# 2. Close pgAdmin connections
# 3. Full reset
npx prisma migrate reset --force

# 4. Verify users created
npx prisma studio
# Check User table in browser
```

## 🧪 Testing Steps After Fix

### Test 1: Verify User Exists
```sql
SELECT * FROM "User" WHERE email = 'admin@portal.com';
```

Should return 1 row with:
- ✅ email: admin@portal.com
- ✅ role: ADMIN
- ✅ isActive: true
- ✅ passwordHash: (60 chars starting with $2b$10$)

### Test 2: Test API Directly

Use curl or Postman:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@portal.com",
    "password": "admin123"
  }'
```

**Expected response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "...",
    "email": "admin@portal.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

**Error response:**
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

### Test 3: Test in Frontend

1. Clear browser cache and sessionStorage
2. Go to http://localhost:3000/login
3. Enter: `admin@portal.com` / `admin123`
4. Click Sign In

Should redirect to `/admin/dashboard`

## 🐛 Debug Checklist

Run through this checklist:

- [ ] Backend is running on port 8080
- [ ] Database connection works (check backend startup logs)
- [ ] User `admin@portal.com` exists in database
- [ ] User has `isActive = true`
- [ ] User has valid password hash (60 chars, starts with $2b$10$)
- [ ] No old `@example.com` users exist
- [ ] Frontend connects to correct backend URL
- [ ] Using exact credentials: `admin@portal.com` / `admin123`
- [ ] No typos in email or password
- [ ] Browser console shows correct API endpoint

## 🔍 Advanced Debugging

### Check DATABASE_URL

```bash
cd src/api
cat .env | grep DATABASE_URL
```

Should point to your local database.

### Check Backend Environment

```bash
cd src/api
cat .env
```

Should have:
```
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
PORT=8080
```

### Check Prisma Client is Up-to-Date

```bash
cd src/api
npx prisma generate
```

### Check Backend Can Connect to Database

```bash
cd src/api
npx prisma db execute --stdin < /dev/null
```

Should connect without errors.

## 📋 Quick Fix Script

Run this to verify everything:

```bash
cd src/api

echo "1. Checking database connection..."
npx prisma db execute --stdin <<< "SELECT 1;"

echo "2. Checking users..."
npx prisma db execute --stdin <<< "SELECT email, role FROM \"User\";"

echo "3. Deleting old users..."
npx prisma db execute --stdin <<< "DELETE FROM \"User\" WHERE email LIKE '%@example.com';"

echo "4. Running seed..."
npm run seed

echo "5. Verifying users..."
npx prisma studio
```

## 🆘 Still Not Working?

If nothing works, provide me with:

1. **Output of:** `SELECT * FROM "User" WHERE email = 'admin@portal.com';` in pgAdmin
2. **Backend logs** when you try to login
3. **Browser console** error (full AxiosError details)
4. **Confirmation** that backend is running on port 8080

---

**Most likely cause:** User doesn't exist or password hash is wrong. Run fresh seed! ✅


