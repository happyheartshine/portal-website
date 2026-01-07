-- URGENT: Check What Users Actually Exist in Database
-- Run this RIGHT NOW in pgAdmin Query Tool

-- 1. Check ALL users in database
SELECT 
  id,
  email,
  name,
  role,
  "isActive",
  CASE 
    WHEN "passwordHash" IS NOT NULL THEN 'Has password'
    ELSE 'No password'
  END as password_status,
  "createdAt"
FROM "User"
ORDER BY "createdAt" DESC;

-- 2. Count users by domain
SELECT 
  CASE 
    WHEN email LIKE '%@portal.com' THEN '@portal.com users'
    WHEN email LIKE '%@example.com' THEN '@example.com users'
    ELSE 'Other users'
  END as user_type,
  COUNT(*) as count,
  string_agg(email, ', ') as emails
FROM "User"
GROUP BY user_type;

-- 3. Check if admin@portal.com exists and is active
SELECT 
  email,
  name,
  role,
  "isActive",
  "passwordHash" IS NOT NULL as has_password,
  LENGTH("passwordHash") as password_length
FROM "User"
WHERE email = 'admin@portal.com';

-- Expected result:
-- email: admin@portal.com
-- name: Admin User
-- role: ADMIN
-- isActive: true
-- has_password: true
-- password_length: 60 (bcrypt hash length)

-- 4. If admin@portal.com doesn't exist, check what DOES exist
SELECT email, role, "isActive"
FROM "User"
WHERE role = 'ADMIN';

