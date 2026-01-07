# Database Reset and Re-seed Script
# This will clear all data and create fresh test users

Write-Host "⚠️  WARNING: This will delete ALL data in the database!" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to cancel or Enter to continue..." -ForegroundColor Yellow
Read-Host

Write-Host "`n🔄 Resetting database..." -ForegroundColor Cyan
Set-Location src/api

Write-Host "`n1️⃣ Resetting database schema..." -ForegroundColor Cyan
npx prisma migrate reset --force

Write-Host "`n2️⃣ Running migrations..." -ForegroundColor Cyan
npx prisma migrate deploy

Write-Host "`n3️⃣ Seeding database with fresh data..." -ForegroundColor Cyan
npx prisma db seed

Write-Host "`n✅ Database reset complete!" -ForegroundColor Green
Write-Host "`n📝 Test Credentials:" -ForegroundColor Cyan
Write-Host "Admin:    admin@portal.com / admin123" -ForegroundColor White
Write-Host "Manager:  manager@portal.com / manager123" -ForegroundColor White
Write-Host "Employee: employee@portal.com / employee123" -ForegroundColor White

Set-Location ../..


