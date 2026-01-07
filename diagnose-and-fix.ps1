# Quick Diagnostic and Fix Script
# Run this in PowerShell from project root

Write-Host "`n🔍 DIAGNOSTIC: Checking Auth Setup`n" -ForegroundColor Cyan

# Step 1: Check if backend is running
Write-Host "1. Checking backend status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/api" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Run: cd src/api && npm run dev" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check database users
Write-Host "`n2. Checking database users..." -ForegroundColor Yellow
Write-Host "   Opening pgAdmin - Please run this query:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   SELECT email, role, `"isActive`" FROM `"User`";" -ForegroundColor White
Write-Host ""
Write-Host "   Press Enter after checking..." -ForegroundColor Yellow
Read-Host

# Step 3: Ask about results
Write-Host "`n3. What did you see in the database?" -ForegroundColor Yellow
Write-Host "   A) No users at all" -ForegroundColor White
Write-Host "   B) Only @example.com users" -ForegroundColor White
Write-Host "   C) Only @portal.com users" -ForegroundColor White
Write-Host "   D) Both @example.com and @portal.com users" -ForegroundColor White
Write-Host ""
$choice = Read-Host "   Enter A, B, C, or D"

switch ($choice.ToUpper()) {
    "A" {
        Write-Host "`n   📝 Solution: Need to run seed" -ForegroundColor Cyan
        Write-Host "   Running seed now..." -ForegroundColor Yellow
        Set-Location src/api
        npm run seed
        Set-Location ../..
        Write-Host "`n   ✅ Seed completed!" -ForegroundColor Green
    }
    "B" {
        Write-Host "`n   🗑️  Solution: Delete old users and seed" -ForegroundColor Cyan
        Write-Host "   Please run this in pgAdmin:" -ForegroundColor Yellow
        Write-Host "   DELETE FROM `"User`" WHERE email LIKE '%@example.com';" -ForegroundColor White
        Write-Host ""
        Write-Host "   Press Enter after deleting..." -ForegroundColor Yellow
        Read-Host
        Write-Host "   Running seed..." -ForegroundColor Yellow
        Set-Location src/api
        npm run seed
        Set-Location ../..
        Write-Host "`n   ✅ Seed completed!" -ForegroundColor Green
    }
    "C" {
        Write-Host "`n   ✅ Users look correct!" -ForegroundColor Green
        Write-Host "   Problem might be:" -ForegroundColor Yellow
        Write-Host "   - Wrong password (use: admin123)" -ForegroundColor White
        Write-Host "   - User is inactive" -ForegroundColor White
        Write-Host "   - Password hash is corrupted" -ForegroundColor White
        Write-Host ""
        Write-Host "   Resetting password for admin@portal.com..." -ForegroundColor Yellow
        Set-Location src/api
        npm run seed
        Set-Location ../..
        Write-Host "   ✅ Password reset!" -ForegroundColor Green
    }
    "D" {
        Write-Host "`n   🗑️  Solution: Delete @example.com users" -ForegroundColor Cyan
        Write-Host "   Please run this in pgAdmin:" -ForegroundColor Yellow
        Write-Host "   DELETE FROM `"User`" WHERE email LIKE '%@example.com';" -ForegroundColor White
        Write-Host ""
        Write-Host "   Press Enter after deleting..." -ForegroundColor Yellow
        Read-Host
        Write-Host "   ✅ Old users should be removed!" -ForegroundColor Green
    }
    default {
        Write-Host "`n   ❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

# Step 4: Test login
Write-Host "`n4. Testing login..." -ForegroundColor Yellow
Write-Host "   Attempting to login with admin@portal.com..." -ForegroundColor Cyan

try {
    $body = @{
        email = "admin@portal.com"
        password = "admin123"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
                                   -Method Post `
                                   -Body $body `
                                   -ContentType "application/json" `
                                   -ErrorAction Stop
    
    Write-Host "   ✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
    Write-Host "   User: $($response.user.name) ($($response.user.role))" -ForegroundColor White
    Write-Host "   Token: $($response.access_token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "   ❌ LOGIN FAILED!" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "`n   🔍 401 Unauthorized means:" -ForegroundColor Yellow
        Write-Host "   - User doesn't exist in database" -ForegroundColor White
        Write-Host "   - Password is incorrect" -ForegroundColor White
        Write-Host "   - User is inactive (isActive = false)" -ForegroundColor White
        Write-Host ""
        Write-Host "   ⚠️  Please verify in pgAdmin:" -ForegroundColor Yellow
        Write-Host "   SELECT * FROM `"User`" WHERE email = 'admin@portal.com';" -ForegroundColor White
    }
}

Write-Host "`n5. Next steps:" -ForegroundColor Cyan
Write-Host "   1. Go to: http://localhost:3000/login" -ForegroundColor White
Write-Host "   2. Enter: admin@portal.com / admin123" -ForegroundColor White
Write-Host "   3. Click Sign In" -ForegroundColor White
Write-Host "   4. Should redirect to /admin/dashboard" -ForegroundColor White

Write-Host "`n✅ Diagnostic complete!" -ForegroundColor Green

<<<<<<< HEAD

=======
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
