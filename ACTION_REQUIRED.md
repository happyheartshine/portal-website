# IMMEDIATE ACTION REQUIRED - Fix Database Users

## 🎯 Your Issue

You see `admin@example.com` in database (pgAdmin), but need to use `admin@portal.com` to login.

## ⚡ Quick Fix (Takes 1 minute)

### Windows Users:
```powershell
# Run this in PowerShell from project root:
.\reset-database.ps1
```

### Mac/Linux Users:
```bash
# Run this in Terminal from project root:
chmod +x reset-database.sh
./reset-database.sh
```

### Manual Alternative:
```bash
cd src/api
npx prisma migrate reset --force
cd ../..
```

## ✅ After Running the Fix

1. **Go to:** http://localhost:3000/login

2. **Use these credentials:**
   ```
   Email: admin@portal.com
   Password: admin123
   ```

3. **Should see:** Redirect to `/admin/dashboard` ✅

## 🔍 What This Does

- Deletes ALL database data (⚠️ dev only!)
- Re-creates database schema
- Creates fresh test users:
  - `admin@portal.com`
  - `manager@portal.com`
  - `employee@portal.com`

## 🆘 If Reset Script Doesn't Work

### Option A: Use pgAdmin SQL

1. Open pgAdmin
2. Select your database
3. Open Query Tool
4. Copy and paste this:

```sql
-- Delete old users
DELETE FROM "User" WHERE email LIKE '%@example.com';

-- Verify they're gone
SELECT email FROM "User";
```

5. Then run seed:
```bash
cd src/api
npx prisma db seed
```

### Option B: Update Emails Directly

In pgAdmin Query Tool:

```sql
-- Update existing users
UPDATE "User" SET email = 'admin@portal.com' 
WHERE email = 'admin@example.com';

UPDATE "User" SET email = 'manager@portal.com' 
WHERE email = 'manager@example.com';

UPDATE "User" SET email = 'employee@portal.com' 
WHERE email = 'employee@example.com';

-- Verify
SELECT email, role FROM "User";
```

## 📋 Verification Checklist

After fix, verify:

- [ ] Can log in with `admin@portal.com`
- [ ] Redirects to correct dashboard
- [ ] Token stored in sessionStorage
- [ ] No old `@example.com` users in database

To check database:
```sql
SELECT email, role FROM "User" ORDER BY role;
```

Should see ONLY:
```
admin@portal.com     | ADMIN
manager@portal.com   | MANAGER
employee@portal.com  | EMPLOYEE
```

## 📚 Additional Resources

- **Complete Guide:** `DATABASE_USER_MISMATCH_FIX.md`
- **Visual Explanation:** `VISUAL_EXPLANATION.md`
- **Quick Reference:** `FIX_SUMMARY.md`
- **Auth Documentation:** `AUTH_QUICK_REFERENCE.md`

## ❓ Still Having Issues?

1. **Clear browser cache:**
   - DevTools → Application → Clear storage
   - Hard refresh (Ctrl+Shift+R)

2. **Check backend is running:**
   ```bash
   cd src/api
   npm run dev
   ```

3. **Check database connection:**
   ```bash
   cd src/api
   npx prisma studio
   ```
   Opens at http://localhost:5555

4. **Verify environment:**
   - Check `src/api/.env` has `DATABASE_URL`
   - Check `PORT=8080` in backend .env
   - Check `NEXT_PUBLIC_API_URL=http://localhost:8080` in frontend

## 🎓 Understanding The Root Cause

```
OLD TEST DATA:        NEW SEED DATA:
admin@example.com  →  admin@portal.com
manager@example.com → manager@portal.com
employee@example.com→ employee@portal.com

Your database had BOTH sets = Confusion!
Reset removes old, keeps only new ✅
```

## 💡 Prevention

**Golden Rule:** Only create test users via seed script!

```bash
# ✅ CORRECT WAY:
cd src/api
npx prisma db seed

# ❌ WRONG WAY:
# Manually inserting users in pgAdmin
```

---

**TL;DR:** Run `.\reset-database.ps1` then login with `admin@portal.com / admin123`

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
