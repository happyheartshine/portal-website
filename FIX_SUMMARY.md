# Quick Fix Summary - Database User Mismatch

## 🔴 Problem Identified

Your database has **old test users** with `@example.com` emails:
- ❌ `admin@example.com`
- ❌ `manager@example.com`  
- ❌ `employee@example.com`

But the application expects **new users** with `@portal.com` emails:
- ✅ `admin@portal.com`
- ✅ `manager@portal.com`
- ✅ `employee@portal.com`

## ⚡ Quick Fix (Recommended)

### Windows PowerShell:
```powershell
.\reset-database.ps1
```

### Unix/Linux/Mac:
```bash
chmod +x reset-database.sh
./reset-database.sh
```

This will:
1. ⚠️ Delete all database data
2. ✅ Re-run all migrations
3. ✅ Create fresh test users with `@portal.com` emails

## 🔧 Alternative Fixes

### Option A: Keep Data, Update Emails
Run the SQL in `update-user-emails.sql` using pgAdmin:
- Opens pgAdmin → Select database → Query Tool
- Copy/paste SQL from file → Execute
- Keeps all your existing data, just changes emails

### Option B: Delete Old Users Only
Run the SQL in `delete-old-users.sql` using pgAdmin:
- Deletes only `@example.com` users
- Then run: `cd src/api && npx prisma db seed`
- Creates new `@portal.com` users

## ✅ After Fix - Test Login

Go to: http://localhost:3000/login

Try these credentials:
```
Admin:
  Email: admin@portal.com
  Password: admin123
  → Should redirect to /admin/dashboard

Manager:
  Email: manager@portal.com
  Password: manager123
  → Should redirect to /manager/dashboard

Employee:
  Email: employee@portal.com
  Password: employee123
  → Should redirect to /dashboard
```

## 📚 Detailed Documentation

- `DATABASE_USER_MISMATCH_FIX.md` - Complete troubleshooting guide
- `AUTH_QUICK_REFERENCE.md` - All auth features and credentials
- `FRONTEND_AUTH_SUMMARY.md` - Frontend auth improvements summary

## 🎯 Root Cause

The backend seed script (`src/api/prisma/seed.ts`) creates users with `@portal.com` emails, but someone previously created test users with `@example.com` emails manually. 

The seed script uses `upsert` which only updates if the email **exactly matches**. Since `admin@example.com` ≠ `admin@portal.com`, both users end up in the database.

## 🔮 Prevention

Always use the official seed script:
```bash
cd src/api
npx prisma db seed
```

Don't manually create test users with different email patterns.

## 💡 Need Help?

1. Check backend logs when logging in
2. Verify users in database: `SELECT email, role FROM "User";`
3. Clear browser cache and session storage
4. See full troubleshooting guide in `DATABASE_USER_MISMATCH_FIX.md`

---

**TL;DR:** Run `.\reset-database.ps1` to fix, then login with `admin@portal.com / admin123` ✅


