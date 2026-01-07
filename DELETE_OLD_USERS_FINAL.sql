-- DEFINITIVE FIX: Delete All Old Users
-- Run this in pgAdmin Query Tool

-- Step 1: Show current users BEFORE deletion
SELECT 'BEFORE DELETION' as status, email, role, "isActive" 
FROM "User" 
ORDER BY role, email;

-- Step 2: Delete ALL users with @example.com domain
DELETE FROM "User" 
WHERE email LIKE '%@example.com';

-- Step 3: Delete ANY other test users (optional - be careful!)
-- Uncomment if you have other test domains:
-- DELETE FROM "User" WHERE email LIKE '%@test.com';

-- Step 4: Show users AFTER deletion
SELECT 'AFTER DELETION' as status, email, role, "isActive" 
FROM "User" 
ORDER BY role, email;

-- Step 5: Verify we have exactly 3 users (all @portal.com)
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email LIKE '%@portal.com' THEN 1 END) as portal_users,
  COUNT(CASE WHEN email LIKE '%@example.com' THEN 1 END) as example_users
FROM "User";

-- Expected result:
-- total_users: 3
-- portal_users: 3
-- example_users: 0

-- Step 6: List final users (should be only these 3)
SELECT 
  email,
  name,
  role,
  "isActive",
  "ratePerOrder"
FROM "User"
ORDER BY 
  CASE role 
    WHEN 'ADMIN' THEN 1
    WHEN 'MANAGER' THEN 2
    WHEN 'EMPLOYEE' THEN 3
  END;

-- Expected output:
-- admin@portal.com     | Admin User      | ADMIN    | true | null
-- manager@portal.com   | Sample Manager  | MANAGER  | true | 5.0
-- employee@portal.com  | Sample Employee | EMPLOYEE | true | 3.0

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
