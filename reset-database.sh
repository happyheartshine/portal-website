#!/bin/bash
# Database Reset and Re-seed Script (Unix/Linux/Mac)
# This will clear all data and create fresh test users

echo "⚠️  WARNING: This will delete ALL data in the database!"
echo "Press Ctrl+C to cancel or Enter to continue..."
read

echo ""
echo "🔄 Resetting database..."
cd src/api

echo ""
echo "1️⃣ Resetting database schema..."
npx prisma migrate reset --force

echo ""
echo "2️⃣ Running migrations..."
npx prisma migrate deploy

echo ""
echo "3️⃣ Seeding database with fresh data..."
npx prisma db seed

echo ""
echo "✅ Database reset complete!"
echo ""
echo "📝 Test Credentials:"
echo "Admin:    admin@portal.com / admin123"
echo "Manager:  manager@portal.com / manager123"
echo "Employee: employee@portal.com / employee123"

cd ../..

