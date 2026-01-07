# Understanding Prisma Commands - Complete Guide

## The Issue You're Facing

You ran the reset script, but the **old users** (`@example.com`) are still in the database.

### Why This Happened:

The reset script I provided uses `npx prisma migrate reset --force`, which should:
1. Drop the database
2. Recreate it
3. Run migrations
4. **Automatically run seed**

However, it seems the seed ran but **didn't remove the old users**. This is because the seed script uses `upsert`, which:
- Updates if user exists (by email)
- Creates if user doesn't exist
- **Does NOT delete other users**

## Understanding Prisma Commands

### 1. `npx prisma migrate` (Family of commands)

#### `npx prisma migrate dev`
**What it does:**
- Creates a new migration file based on schema changes
- Applies the migration to database
- Generates Prisma Client
- **Optionally runs seed** (if you say yes)

**When to use:**
- After changing `schema.prisma`
- During development

**Example:**
```bash
cd src/api
npx prisma migrate dev --name add_user_table
```

**Output:**
```
✔ Name of migration: add_user_table
✅ Migration created: migrations/20240106_add_user_table/migration.sql
✅ Migration applied to database
✅ Generated Prisma Client
? Do you want to run the seed? (y/N) › y
✅ Seed completed
```

#### `npx prisma migrate reset`
**What it does:**
1. **Drops the entire database** (⚠️ All data lost!)
2. Creates a fresh database
3. Applies ALL migrations from scratch
4. Runs seed automatically

**When to use:**
- When you want a clean database
- During development only
- When migrations are out of sync

**Example:**
```bash
cd src/api
npx prisma migrate reset --force  # --force skips confirmation
```

**Output:**
```
⚠️  Dropping database...
✅ Database dropped
✅ Database created
✅ Migrations applied
✅ Seed completed
```

#### `npx prisma migrate deploy`
**What it does:**
- Applies pending migrations to database
- Does NOT drop database
- Does NOT run seed
- Safe for production

**When to use:**
- Production deployments
- When you don't want to lose data

**Example:**
```bash
cd src/api
npx prisma migrate deploy
```

#### `npx prisma migrate status`
**What it does:**
- Shows which migrations are applied
- Shows which are pending

**Example:**
```bash
cd src/api
npx prisma migrate status
```

**Output:**
```
1 migration found in prisma/migrations
Database schema is up to date!
```

### 2. `npm run seed` (or `npx prisma db seed`)

**What it does:**
- Runs the seed script (`prisma/seed.ts`)
- Creates/updates test data
- **Does NOT delete existing data**

**When to use:**
- After a fresh migration
- When you need test data
- After database reset

**Example:**
```bash
cd src/api
npm run seed
# OR
npx prisma db seed
```

**What the seed script does:**
```typescript
// From prisma/seed.ts

// Creates or updates admin
await prisma.user.upsert({
  where: { email: 'admin@portal.com' },
  update: { /* updates if found */ },
  create: { /* creates if not found */ }
});

// Creates or updates manager
await prisma.user.upsert({
  where: { email: 'manager@portal.com' },
  // ...
});

// Creates or updates employee
await prisma.user.upsert({
  where: { email: 'employee@portal.com' },
  // ...
});
```

**Important:** `upsert` means:
- If `admin@portal.com` exists → Update it
- If `admin@portal.com` doesn't exist → Create it
- **Does NOT delete** `admin@example.com` if it exists

### 3. Other Useful Prisma Commands

#### `npx prisma studio`
**What it does:**
- Opens a GUI to view/edit database
- Runs at http://localhost:5555

**Example:**
```bash
cd src/api
npx prisma studio
```

#### `npx prisma generate`
**What it does:**
- Generates Prisma Client based on schema
- Run this after changing `schema.prisma`

**Example:**
```bash
cd src/api
npx prisma generate
```

#### `npx prisma db push`
**What it does:**
- Pushes schema changes to database
- **Without creating migration files**
- Good for rapid prototyping

**Example:**
```bash
cd src/api
npx prisma db push
```

## Your Specific Problem: Old Users Still Exist

### Current Situation:
```
Database contains:
✅ admin@portal.com     (from seed)
✅ manager@portal.com   (from seed)
✅ employee@portal.com  (from seed)
❌ admin@example.com    (old - still there!)
❌ manager@example.com  (old - still there!)
❌ employee@example.com (old - still there!)
```

### Why Reset Didn't Work:

Two possibilities:

1. **The reset didn't actually drop the database**
   - Maybe database was in use
   - Maybe permissions issue

2. **The reset worked, but seed created new users without deleting old ones**
   - Unlikely, since reset drops everything

### Solution: Manual Deletion Required

Since `upsert` doesn't delete, you need to manually delete old users.

## Fix Steps

### Step 1: Delete Old Users

**Option A: Using pgAdmin**

1. Open pgAdmin
2. Connect to your database
3. Open Query Tool
4. Run this SQL:

```sql
-- Delete old users with @example.com emails
DELETE FROM "User" WHERE email LIKE '%@example.com';

-- Verify they're gone
SELECT email, role FROM "User" ORDER BY role;
```

**Option B: Using Prisma Client (Advanced)**

Create a cleanup script:

```typescript
// cleanup-users.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Cleaning up old users...');
  
  const result = await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@example.com'
      }
    }
  });
  
  console.log(`✅ Deleted ${result.count} old users`);
  
  const remaining = await prisma.user.findMany({
    select: { email: true, role: true }
  });
  
  console.log('📋 Remaining users:');
  remaining.forEach(u => console.log(`  - ${u.email} (${u.role})`));
}

cleanup()
  .then(() => prisma.$disconnect())
  .catch(console.error);
```

Run it:
```bash
cd src/api
npx ts-node cleanup-users.ts
```

### Step 2: Verify Database

Run the verification SQL I created:

```bash
# Use the file I created
# In pgAdmin: File → Open → check-users.sql → Execute
```

You should see ONLY:
```
admin@portal.com    | ADMIN
manager@portal.com  | MANAGER
employee@portal.com | EMPLOYEE
```

### Step 3: Test Login

Go to http://localhost:3000/login

Try:
```
Email: admin@portal.com
Password: admin123
```

Should work! ✅

## Complete Reset Procedure (Guaranteed to Work)

If you want to be 100% sure, follow these steps:

```bash
# 1. Go to backend directory
cd src/api

# 2. Stop backend if running (Ctrl+C)

# 3. Full reset
npx prisma migrate reset --force

# 4. Verify migrations
npx prisma migrate status

# 5. Open Prisma Studio to verify
npx prisma studio
```

In Prisma Studio (http://localhost:5555):
- Click "User" model
- You should see ONLY 3 users with @portal.com emails
- If you see @example.com users, delete them manually in Studio

## Common Issues and Solutions

### Issue 1: "Database in use" during reset

**Solution:**
```bash
# Stop all connections
# 1. Stop backend: Ctrl+C
# 2. Close Prisma Studio
# 3. Close pgAdmin connections
# 4. Try reset again
cd src/api
npx prisma migrate reset --force
```

### Issue 2: Seed doesn't run automatically

**Solution:**
```bash
cd src/api
npx prisma migrate reset --force
npm run seed  # Run manually
```

### Issue 3: Old users keep coming back

**Cause:** There might be a backup/restore happening

**Solution:**
1. Check if you have any scripts automatically restoring data
2. Check if pgAdmin has auto-restore enabled
3. Manually delete old users after each reset

## Prevention: Updated Seed Script

To prevent this in future, update the seed script to delete old users first:

```typescript
// Add to top of prisma/seed.ts
async function main() {
  console.log('🌱 Seeding database...');
  
  // NEW: Delete old test users first
  console.log('🧹 Cleaning up old test users...');
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { endsWith: '@example.com' } },
        { email: { endsWith: '@test.com' } },
      ]
    }
  });
  
  // Then continue with existing upserts...
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@portal.com';
  // ... rest of seed code
}
```

## Command Comparison Chart

| Command | Drops DB | Runs Migrations | Runs Seed | Safe for Prod |
|---------|----------|----------------|-----------|---------------|
| `migrate dev` | No | New only | Optional | No |
| `migrate reset` | **Yes** | All | Yes | **No** |
| `migrate deploy` | No | Pending | No | **Yes** |
| `db push` | No | N/A | No | No |
| `db seed` | No | No | **Yes** | Depends |

## Summary

**Your situation:**
- Reset ran successfully ✅
- Seed created @portal.com users ✅
- Old @example.com users still exist ❌

**Why:**
- `upsert` doesn't delete old data
- Need manual deletion

**Fix:**
```sql
-- Run in pgAdmin:
DELETE FROM "User" WHERE email LIKE '%@example.com';
```

**Verify:**
```sql
SELECT email, role FROM "User" ORDER BY role;
-- Should see only 3 users with @portal.com
```

**Test:**
- Login with `admin@portal.com / admin123`
- Should work! ✅

---

See `check-users.sql` for verification queries.

