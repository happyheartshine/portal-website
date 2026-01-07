-- SQL Script to Delete Old Test Users
-- Run this in pgAdmin, then re-run the seed script

-- Delete old test users (this will cascade delete related data)
DELETE FROM "User"
WHERE email LIKE '%@example.com';

-- Verify old users are gone
SELECT COUNT(*) as remaining_example_users
FROM "User"
WHERE email LIKE '%@example.com';
-- Should return 0

-- Check remaining users
SELECT id, email, name, role, "isActive"
FROM "User"
ORDER BY role;

