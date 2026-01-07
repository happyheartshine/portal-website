-- Verification Script: Check Current Users in Database
-- Run this in pgAdmin Query Tool to see what users exist

-- Check all users
SELECT 
  id,
  email,
  name,
  role,
  "isActive",
  "createdAt"
FROM "User"
ORDER BY role, email;

-- Count users by domain
SELECT 
  CASE 
    WHEN email LIKE '%@portal.com' THEN '@portal.com'
    WHEN email LIKE '%@example.com' THEN '@example.com'
    ELSE 'other'
  END as email_domain,
  COUNT(*) as count
FROM "User"
GROUP BY email_domain;

-- List only active users
SELECT 
  email,
  role,
  "isActive"
FROM "User"
WHERE "isActive" = true
ORDER BY role;


