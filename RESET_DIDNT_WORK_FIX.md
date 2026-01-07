# IMMEDIATE ACTION - Your Reset Didn't Delete Old Users

## 🔴 Problem

You ran the reset script, but **old users are still in your database**.

You see both:
- ❌ `admin@example.com` (old)
- ✅ `admin@portal.com` (new)

## ⚡ Quick Fix (30 seconds)

### Open pgAdmin → Query Tool → Run This:

```sql
DELETE FROM "User" WHERE email LIKE '%@example.com';
```

**That's it!** ✅

### Verify it worked:

```sql
SELECT email, role FROM "User" ORDER BY role;
```

Should see **ONLY**:
```
admin@portal.com
manager@portal.com  
employee@portal.com
```

## 🧪 Test Login

Go to: http://localhost:3000/login

```
Email: admin@portal.com
Password: admin123
```

Should work! ✅

---

## 📚 Understanding Prisma Commands

### `npx prisma migrate reset`
**What it does:**
1. Drops database (deletes everything)
2. Creates fresh database
3. Runs all migrations
4. **Automatically runs seed**

**When to use:** Development only, when you want clean slate

**Command:**
```bash
cd src/api
npx prisma migrate reset --force
```

---

### `npm run seed` (or `npx prisma db seed`)
**What it does:**
- Runs `prisma/seed.ts`
- Creates/updates test users
- Uses `upsert`: creates if not exists, updates if exists
- **DOES NOT delete old users**

**When to use:** After migrations, when you need test data

**Command:**
```bash
cd src/api
npm run seed
```

**What seed creates:**
```typescript
// Creates these 3 users:
admin@portal.com    / admin123    (ADMIN)
manager@portal.com  / manager123  (MANAGER)
employee@portal.com / employee123 (EMPLOYEE)
```

---

### `npx prisma migrate dev`
**What it does:**
1. Detects schema changes
2. Creates new migration file
3. Applies migration
4. Generates Prisma Client
5. **Optionally asks to run seed**

**When to use:** After changing `schema.prisma`

**Command:**
```bash
cd src/api
npx prisma migrate dev --name your_migration_name
```

---

### `npx prisma migrate deploy`
**What it does:**
- Applies pending migrations
- Does NOT drop database
- Does NOT run seed
- **Safe for production**

**When to use:** Production deployments

**Command:**
```bash
cd src/api
npx prisma migrate deploy
```

---

### `npx prisma studio`
**What it does:**
- Opens GUI database browser
- View/edit data visually
- Runs at http://localhost:5555

**When to use:** To view/edit database visually

**Command:**
```bash
cd src/api
npx prisma studio
```

---

## 🔍 Why Reset Didn't Work

### Expected Behavior:
```
migrate reset
  ↓
Drop Database (delete EVERYTHING)
  ↓
Create Database (fresh start)
  ↓
Run Migrations (create tables)
  ↓
Run Seed (insert 3 users)
  ↓
Result: ONLY 3 new users ✅
```

### What Actually Happened:
```
Two possibilities:

1. Database didn't fully drop
   - Maybe pgAdmin was connected
   - Maybe backend was running
   - Database locked by another connection
   
2. Seed ran, but didn't delete old users
   - Seed uses `upsert` (create/update)
   - Upsert DOES NOT delete
   - Old users remain in database
```

### The Root Cause:

**Seed script uses `upsert`:**

```typescript
// From prisma/seed.ts
await prisma.user.upsert({
  where: { email: 'admin@portal.com' },  // Look for this email
  update: { /* ... */ },                  // If found, update
  create: { /* ... */ }                   // If not found, create
});
```

**What `upsert` does:**
- Looks for `admin@portal.com`
- Not found? Creates it
- **Does NOT touch `admin@example.com`**

So both users coexist! ❌

---

## ✅ The Complete Fix

### Option 1: Manual SQL (Recommended - Quick)

```sql
-- In pgAdmin Query Tool:
DELETE FROM "User" WHERE email LIKE '%@example.com';
SELECT email FROM "User";  -- Verify
```

### Option 2: Use Prisma Studio (Visual)

```bash
cd src/api
npx prisma studio
```

1. Open http://localhost:5555
2. Click "User" model
3. Delete each `@example.com` user
4. Close Studio

### Option 3: Nuclear (Complete Fresh Start)

```bash
cd src/api

# Stop backend (Ctrl+C)
# Close pgAdmin connections

# Drop database manually in pgAdmin
# Then:

npx prisma migrate deploy  # Create tables
npm run seed              # Insert test users
```

---

## 📊 Command Comparison

| Command | Drops DB | Migrations | Seed | Production Safe |
|---------|----------|-----------|------|-----------------|
| `migrate reset` | **YES** | All | Auto | **NO** |
| `migrate dev` | No | New | Ask | No |
| `migrate deploy` | No | Pending | No | **YES** |
| `db seed` | No | No | **YES** | Depends |
| `studio` | No | No | No | Yes |

---

## 🎯 Key Takeaways

### Commands You'll Use Most:

**Development:**
```bash
cd src/api

# After changing schema.prisma:
npx prisma migrate dev --name describe_change

# Fresh start (delete all data):
npx prisma migrate reset --force

# Just add test data:
npm run seed

# View database:
npx prisma studio
```

**Production:**
```bash
cd src/api

# Apply migrations (no data loss):
npx prisma migrate deploy
```

### Important Facts:

1. ✅ `migrate reset` = Drop + Recreate + Migrate + Seed
2. ✅ `migrate dev` = Create migration + Apply + Generate Client
3. ✅ `migrate deploy` = Apply pending (safe for prod)
4. ✅ `db seed` = Run seed script (doesn't delete)
5. ⚠️ Seed uses `upsert` = Create/Update only, **no deletion**

---

## 📝 After Fix Checklist

- [ ] Old `@example.com` users deleted from database
- [ ] Only 3 users remain (all `@portal.com`)
- [ ] Can login with `admin@portal.com / admin123`
- [ ] Redirects to `/admin/dashboard`
- [ ] Token stored in sessionStorage

---

## 📚 Documentation Files

- **`STEP_BY_STEP_FIX.md`** - Detailed fix guide
- **`PRISMA_COMMANDS_EXPLAINED.md`** - Complete Prisma command reference
- **`DELETE_OLD_USERS_FINAL.sql`** - SQL deletion script
- **`check-users.sql`** - Verification queries

---

## 🆘 Still Having Issues?

1. **Verify correct database:**
   ```sql
   SELECT current_database();  -- Should be: portal_db
   ```

2. **Check DATABASE_URL:**
   ```bash
   cd src/api
   cat .env | grep DATABASE_URL
   ```

3. **List all users:**
   ```sql
   SELECT email, role, "isActive" FROM "User";
   ```

4. **Try Prisma Studio:**
   ```bash
   cd src/api
   npx prisma studio
   ```
   Manually delete users visually

---

## 📖 Summary

**Your Situation:**
- Reset script ran ✅
- Seed created new users ✅
- Old users still exist ❌

**Why:**
- Seed doesn't delete, only creates/updates

**Fix:**
```sql
DELETE FROM "User" WHERE email LIKE '%@example.com';
```

**Test:**
- Login with `admin@portal.com / admin123` ✅

**Understanding:**
- `migrate reset` = Fresh database
- `db seed` = Add test data (no deletion)
- `upsert` = Create or update (no deletion)

---

**TL;DR:** Run the DELETE SQL in pgAdmin, then you can login! ✅


