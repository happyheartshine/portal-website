# Database User Mismatch - Visual Explanation

## Current State (Problem)

```
┌─────────────────────────────────────────────────────┐
│                   DATABASE                          │
│                                                     │
│  ❌ OLD USERS (from previous testing):             │
│     • admin@example.com                            │
│     • manager@example.com                          │
│     • employee@example.com                         │
│                                                     │
│  ✅ NEW USERS (from seed script):                  │
│     • admin@portal.com     ← Created by seed       │
│     • manager@portal.com   ← Created by seed       │
│     • employee@portal.com  ← Created by seed       │
│                                                     │
│  Result: 6 users total (3 old + 3 new)            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              FRONTEND LOGIN PAGE                    │
│                                                     │
│  Test credentials shown:                           │
│    Admin:    admin@portal.com / admin123           │
│    Manager:  manager@portal.com / manager123       │
│    Employee: employee@portal.com / employee123     │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                 YOUR ATTEMPT                        │
│                                                     │
│  You tried: admin@example.com / admin123           │
│                      ↓                             │
│             ❌ Login Failed                         │
│  (Wrong email - app expects @portal.com)           │
└─────────────────────────────────────────────────────┘
```

## Why This Happened

```
TIMELINE:
────────────────────────────────────────────────────

1️⃣ Initial Setup
   Someone manually created test users:
   • admin@example.com
   • manager@example.com
   • employee@example.com

2️⃣ Code Updated
   seed.ts was updated to use @portal.com:
   const adminEmail = 'admin@portal.com'  ← Changed

3️⃣ Seed Script Run
   npx prisma db seed
   
   What happened:
   ┌─────────────────────────────────────────┐
   │ Seed script: "Find admin@portal.com"   │
   │ Database: "Not found"                  │
   │ Seed script: "Create new user"         │
   └─────────────────────────────────────────┘
   
   Result: NOW TWO admin users exist!
   • admin@example.com (old)
   • admin@portal.com (new)

4️⃣ Current Situation
   Frontend shows: admin@portal.com ✅
   You tried:      admin@example.com ❌
   Result:         Credentials don't match
```

## Solution Flow

### Option 1: Full Reset (Recommended)

```
BEFORE:                           AFTER:
┌──────────────────┐             ┌──────────────────┐
│    DATABASE      │             │    DATABASE      │
│                  │             │                  │
│ admin@example    │   RESET     │ admin@portal     │
│ admin@portal     │ ────────→   │ manager@portal   │
│ manager@example  │   & SEED    │ employee@portal  │
│ manager@portal   │             │                  │
│ employee@example │             │ (3 users total)  │
│ employee@portal  │             │                  │
│                  │             │                  │
│ (6 users total)  │             │ ✅ All correct!  │
└──────────────────┘             └──────────────────┘

Command: .\reset-database.ps1
```

### Option 2: Update Emails

```
BEFORE:                           AFTER:
┌──────────────────┐             ┌──────────────────┐
│    DATABASE      │             │    DATABASE      │
│                  │             │                  │
│ admin@example    │   UPDATE    │ admin@portal ✅  │
│ admin@portal     │ ────────→   │ manager@portal ✅│
│ manager@example  │   EMAILS    │ employee@portal ✅│
│ manager@portal   │             │ (still 6 users)  │
│ employee@example │             │                  │
│ employee@portal  │             │ Note: @portal    │
│                  │             │ users now have   │
│ (6 users)        │             │ duplicate data   │
└──────────────────┘             └──────────────────┘

SQL: update-user-emails.sql
Note: Creates duplicates, may need to delete extras
```

### Option 3: Delete Old Users

```
BEFORE:                           AFTER:
┌──────────────────┐             ┌──────────────────┐
│    DATABASE      │             │    DATABASE      │
│                  │             │                  │
│ admin@example ❌ │   DELETE    │ admin@portal ✅  │
│ admin@portal ✅  │ ────────→   │ manager@portal ✅│
│ manager@example ❌│   OLD       │ employee@portal ✅│
│ manager@portal ✅ │   USERS     │                  │
│ employee@example❌│             │ (3 users total)  │
│ employee@portal ✅│             │                  │
│                  │             │ ✅ All correct!  │
│ (6 users)        │             │                  │
└──────────────────┘             └──────────────────┘

SQL: delete-old-users.sql
```

## How Seed Script Works

```
┌─────────────────────────────────────────────────────┐
│              SEED SCRIPT LOGIC                      │
│              (seed.ts)                              │
└─────────────────────────────────────────────────────┘

const adminEmail = 'admin@portal.com';

await prisma.user.upsert({
  where: { email: adminEmail },  ← Look for this email
  update: {                      ← If found, update
    passwordHash: newHash,
    role: ADMIN
  },
  create: {                      ← If NOT found, create new
    email: adminEmail,
    passwordHash: newHash,
    role: ADMIN
  }
});

┌─────────────────────────────────────────────────────┐
│               WHAT HAPPENS                          │
└─────────────────────────────────────────────────────┘

Scenario 1: admin@portal.com EXISTS in database
  → UPDATE that user's password/role
  → Result: 1 admin@portal.com user ✅

Scenario 2: admin@portal.com NOT in database
  → CREATE new admin@portal.com user
  → Result: New user created
  → If admin@example.com exists, now have 2 admins ❌

┌─────────────────────────────────────────────────────┐
│            YOUR SITUATION                           │
└─────────────────────────────────────────────────────┘

Database had: admin@example.com
Seed looked for: admin@portal.com
Match? NO
Action: Created admin@portal.com
Result: BOTH users exist! ❌
```

## Authentication Flow (Visual)

```
┌──────────────────────────────────────────────────────┐
│                USER TRIES TO LOGIN                   │
└──────────────────────────────────────────────────────┘

Email: admin@example.com
Password: admin123
         ↓
┌────────────────────┐
│  Frontend sends:   │
│  POST /auth/login  │
│  {                 │
│    email: admin@   │
│      example.com,  │
│    password:       │
│      admin123      │
│  }                 │
└────────────────────┘
         ↓
┌────────────────────────────────┐
│  Backend (AuthService):        │
│  1. Find user with this email  │
│  2. Compare password hash      │
│  3. Generate tokens            │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  Database Query:               │
│  SELECT * FROM User            │
│  WHERE email =                 │
│    'admin@example.com'         │
│                                │
│  Found: ✅ YES                 │
│  Password matches: ✅ YES      │
└────────────────────────────────┘
         ↓
┌────────────────────────────────┐
│  Response: 200 OK              │
│  {                             │
│    access_token: "jwt...",     │
│    refresh_token: "jwt...",    │
│    user: {                     │
│      email: "admin@            │
│        example.com"            │
│    }                           │
│  }                             │
└────────────────────────────────┘

✅ Login succeeds with @example.com
❌ But frontend shows @portal.com
   → CONFUSION!
```

## Recommended Fix Process

```
┌─────────────────────────────────────────────────────┐
│                STEP-BY-STEP FIX                     │
└─────────────────────────────────────────────────────┘

Step 1: Backup (Optional)
  If you have important data:
  cd src/api
  pg_dump $DATABASE_URL > backup.sql

Step 2: Run Reset Script
  Windows:  .\reset-database.ps1
  Mac/Linux: ./reset-database.sh
  
  What it does:
  • Drops all tables
  • Re-creates schema
  • Seeds with @portal.com users

Step 3: Verify
  psql $DATABASE_URL
  > SELECT email FROM "User";
  
  Should see:
  • admin@portal.com ✅
  • manager@portal.com ✅
  • employee@portal.com ✅

Step 4: Test Login
  Go to: http://localhost:3000/login
  Email: admin@portal.com
  Password: admin123
  
  Should: ✅ Log in successfully

Step 5: Confirm
  Check sessionStorage:
  • access_token should exist
  • Should redirect to /admin/dashboard
```

## Prevention for Future

```
┌─────────────────────────────────────────────────────┐
│           BEST PRACTICES                            │
└─────────────────────────────────────────────────────┘

✅ DO:
  • Always use: npx prisma db seed
  • Document test credentials
  • Use consistent email patterns
  • Reset DB regularly in dev

❌ DON'T:
  • Manually create test users in pgAdmin
  • Use different email patterns
  • Mix @example.com and @portal.com
  • Keep old test data

┌─────────────────────────────────────────────────────┐
│        SINGLE SOURCE OF TRUTH                       │
└─────────────────────────────────────────────────────┘

Test credentials defined in:
  src/api/prisma/seed.ts ← ONLY HERE

Documented in:
  AUTH_QUICK_REFERENCE.md
  FIX_SUMMARY.md

Never manually create users with
different emails than seed script!
```

## Summary

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Problem: Database has @example.com users          │
│           Frontend expects @portal.com users       │
│                                                    │
│  Cause: Manual user creation vs seed script        │
│                                                    │
│  Fix: Run .\reset-database.ps1                     │
│                                                    │
│  Verify: Login with admin@portal.com               │
│                                                    │
│  Prevent: Always use npx prisma db seed            │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

See `DATABASE_USER_MISMATCH_FIX.md` for complete guide.


