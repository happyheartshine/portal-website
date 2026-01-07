-- SQL Script to Update Old Test User Emails
-- Run this in pgAdmin or psql to update existing users

-- Update admin email
UPDATE "User"
SET email = 'admin@portal.com'
WHERE email = 'admin@example.com';

-- Update manager email
UPDATE "User"
SET email = 'manager@portal.com'
WHERE email = 'manager@example.com';

-- Update employee email
UPDATE "User"
SET email = 'employee@portal.com'
WHERE email = 'employee@example.com';

-- Verify the changes
SELECT id, email, name, role, "isActive"
FROM "User"
WHERE email LIKE '%@portal.com'
ORDER BY role;

-- Expected output:
-- 3 users with @portal.com emails (ADMIN, MANAGER, EMPLOYEE)

