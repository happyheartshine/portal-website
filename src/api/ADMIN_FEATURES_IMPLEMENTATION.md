# Admin Analytics & Control Features Implementation

## ✅ Implementation Complete

All ADMIN analytics and control endpoints have been implemented with optimized Prisma queries and comprehensive audit logging.

## 📋 Features Implemented

### 1. Analytics Endpoints

#### GET /api/admin/analytics/orders?range=7|15|30
**Purpose**: Get order analytics for a date range

**Query Parameters**:
- `range` (optional): 7, 15, or 30 days (default: 7)

**Response**:
```json
{
  "totalOrdersSeries": [
    {
      "date": "2024-01-15",
      "total": 50
    },
    {
      "date": "2024-01-16",
      "total": 45
    }
  ],
  "perEmployeeBar": [
    {
      "employeeName": "John Doe",
      "employeeEmail": "john@example.com",
      "totalApprovedOrders": 100
    }
  ]
}
```

**Features**:
- `totalOrdersSeries`: Sum of approved orders per day (includes all dates in range)
- `perEmployeeBar`: Total approved orders per employee in the range

#### GET /api/admin/analytics/refunds?month=YYYY-MM&byEmployee=true
**Purpose**: Get refund analytics for a month

**Query Parameters**:
- `month` (optional): YYYY-MM format (defaults to current month)
- `byEmployee` (optional): Include breakdown by employee

**Response**:
```json
{
  "totalRefundsAmount": 500.0,
  "count": 10,
  "byEmployee": [
    {
      "employeeName": "John Doe",
      "employeeEmail": "john@example.com",
      "totalAmount": 200.0,
      "count": 4
    }
  ]
}
```

#### GET /api/admin/analytics/credits?month=YYYY-MM
**Purpose**: Get coupon/credit analytics for a month

**Query Parameters**:
- `month` (optional): YYYY-MM format (defaults to current month)

**Response**:
```json
{
  "totalIssuedAmount": 1000.0,
  "totalRedeemedAmount": 750.0,
  "issuedCount": 20,
  "redeemedCount": 15
}
```

### 2. Liability Endpoints

#### GET /api/admin/liability/pending-salary?month=YYYY-MM
**Purpose**: Get total pending salary for all active users

**Query Parameters**:
- `month` (optional): YYYY-MM format (defaults to current month)

**Response**:
```json
{
  "totalPendingSalary": 5000.0,
  "month": "2024-01",
  "userCount": 10
}
```

**Calculation**:
- Sums computed monthly salary for all active users
- Uses salary formula: (Approved Orders * ratePerOrder) - Deductions

### 3. Data Purge

#### POST /api/admin/purge
**Purpose**: Purge refund and coupon data for a specific month

**Request Body**:
```json
{
  "monthKey": "2024-01"
}
```

**Response**:
```json
{
  "monthKey": "2024-01",
  "tablesPurged": ["refund_requests", "coupons"],
  "refundsDeleted": 10,
  "couponsDeleted": 20
}
```

**Features**:
- Deletes refund requests for the month
- Deletes coupons (both issued and used) for the month
- Deletes related screenshot files (local storage)
- Creates DataPurgeLog record
- Creates audit log entry

### 4. Admin Warnings

#### POST /api/admin/warnings
**Purpose**: Issue a warning (and optional deduction) by admin

**Request Body**:
```json
{
  "userId": "clxxx...",
  "reason": "Late submission",
  "note": "Please submit on time",
  "deductionAmount": 10.0
}
```

**Response**:
```json
{
  "warning": {
    "id": "clxxx...",
    "userId": "clxxx...",
    "reason": "Late submission",
    "note": "Please submit on time",
    "sourceRole": "ADMIN",
    "sourceUserId": "clxxx...",
    "deductionAmount": 10.0,
    "createdAt": "2024-01-15T10:00:00.000Z"
  },
  "deduction": {
    "id": "clxxx...",
    "userId": "clxxx...",
    "amount": 10.0,
    "reason": "Deduction from warning: Late submission",
    "sourceRole": "ADMIN",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Features**:
- Creates warning with `sourceRole=ADMIN`
- Optionally creates deduction if `deductionAmount` provided
- Links deduction to warning
- Creates audit log entry

### 5. User Management

#### GET /api/admin/users
**Purpose**: Get all users (Admin only)

**Response**:
```json
[
  {
    "id": "clxxx...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "EMPLOYEE",
    "ratePerOrder": 5.0,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

**Features**:
- Optimized query (selects only needed fields)
- Ordered by creation date (newest first)

#### POST /api/admin/users
**Purpose**: Create a new user (already implemented)

#### DELETE /api/admin/users/:id
**Purpose**: Delete a user (already implemented)

## 🔍 Audit Logging

### Audit Log Model
- `action`: Type of action (purge, warning_issued, refund_processed)
- `performedByUserId`: Admin/Manager who performed the action
- `targetUserId`: Target user (if applicable)
- `details`: JSON object with additional details
- `createdAt`: Timestamp

### Audit Logged Actions

1. **Purge**: Logged when data is purged
   - Includes: monthKey, tablesPurged, counts

2. **Warning Issued**: Logged when admin issues warning
   - Includes: warningId, reason, deductionAmount, deductionId

3. **Refund Processed**: (To be implemented in manager endpoints)
   - Will log when manager processes refund request

### Audit Service
- `log()`: Create audit log entry
- `getLogs()`: Get audit logs with optional filters

## 📊 Optimized Prisma Queries

### Order Analytics
- Single query to get all approved orders in range
- In-memory aggregation for performance
- Efficient date range filtering using indexed `dateKey`

### Refund Analytics
- Single query with optional user relation
- Aggregates amounts using Decimal operations
- Efficient date filtering using indexed `createdAt`

### Credit Analytics
- Two separate queries (issued vs used)
- Efficient date filtering using indexed `issuedAt` and `usedAt`

### Pending Salary
- Parallel salary calculations for all users
- Uses existing SalaryService (optimized)

### User Listing
- Selects only required fields
- No unnecessary relations loaded

## 🔐 Security

- All endpoints require ADMIN role
- JWT authentication required
- RBAC guards enforce role restrictions
- Audit logging tracks all admin actions

## 📁 Files Created

### Services
- `apps/api/src/analytics/analytics.service.ts`
- `apps/api/src/liability/liability.service.ts`
- `apps/api/src/purge/purge.service.ts`
- `apps/api/src/audit/audit.service.ts`
- `apps/api/src/admin-warnings/admin-warnings.service.ts`

### Controllers
- `apps/api/src/analytics/analytics.controller.ts`
- `apps/api/src/liability/liability.controller.ts`
- `apps/api/src/purge/purge.controller.ts`
- Updated `apps/api/src/admin/admin.controller.ts`

### DTOs
- `apps/api/src/purge/dto/purge.dto.ts`
- `apps/api/src/admin-warnings/dto/create-warning.dto.ts`

### Modules
- `apps/api/src/analytics/analytics.module.ts`
- `apps/api/src/liability/liability.module.ts`
- `apps/api/src/purge/purge.module.ts`
- `apps/api/src/audit/audit.module.ts`
- `apps/api/src/admin-warnings/admin-warnings.module.ts`

## 🗄️ Database Changes

### New Model: AuditLog
```prisma
model AuditLog {
  id              String   @id @default(cuid())
  action          String
  performedByUserId String
  targetUserId    String?
  details         Json?
  createdAt       DateTime @default(now())
  
  // Relations
  performedBy User
  targetUser  User?
  
  // Indexes
  @@index([action])
  @@index([performedByUserId])
  @@index([targetUserId])
  @@index([createdAt])
}
```

**Migration Required**:
```bash
cd apps/api
npm run prisma:generate
npm run prisma:migrate
# Name: add_audit_log
```

## 🚀 Usage Examples

### Get Order Analytics
```bash
curl -X GET "http://localhost:3001/api/admin/analytics/orders?range=30" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Refund Analytics
```bash
curl -X GET "http://localhost:3001/api/admin/analytics/refunds?month=2024-01&byEmployee=true" \
  -H "Authorization: Bearer <admin_token>"
```

### Get Pending Salary
```bash
curl -X GET "http://localhost:3001/api/admin/liability/pending-salary?month=2024-01" \
  -H "Authorization: Bearer <admin_token>"
```

### Purge Month Data
```bash
curl -X POST "http://localhost:3001/api/admin/purge" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"monthKey": "2024-01"}'
```

### Issue Warning
```bash
curl -X POST "http://localhost:3001/api/admin/warnings" \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "clxxx...",
    "reason": "Late submission",
    "note": "Please submit on time",
    "deductionAmount": 10.0
  }'
```

## ✅ Business Logic

### Analytics
- All analytics use UTC dates for consistency
- Date series include all dates in range (even if no data)
- Aggregations use Decimal for financial accuracy

### Data Purge
- Only purges refunds and coupons (as specified)
- Deletes related files from storage
- Creates audit trail
- Safe operation (doesn't affect other data)

### Warnings
- Validates user exists and is active
- Creates deduction if amount provided
- Links deduction to warning
- Audit logs all actions

## 📝 Notes

### Refund Processing Audit
- When manager endpoints for processing refunds are implemented, they should use `AuditService.log()` with action `'refund_processed'`
- Example:
  ```typescript
  await this.auditService.log({
    action: 'refund_processed',
    performedByUserId: managerId,
    targetUserId: refund.requestedByUserId,
    details: {
      refundId: refund.id,
      amount: refund.amount,
      status: 'DONE',
    },
  });
  ```

---

**Status**: ✅ Complete and ready for testing
