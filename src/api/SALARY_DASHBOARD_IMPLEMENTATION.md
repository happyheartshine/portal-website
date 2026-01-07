# Salary Computation & Dashboard Implementation

## ✅ Implementation Complete

### Salary Computation Service

**Location**: `apps/api/src/salary/salary.service.ts`

**Formula**: 
```
Total Salary = (SUM(Approved Daily Orders) * user.ratePerOrder) - SUM(Deductions)
```

**Features**:
- Calculates salary for a given month (YYYY-MM format)
- Sums all approved orders for the month
- Sums all deductions for the month
- Handles timezone-safe month boundaries
- Returns salary, approved orders count, and total deductions

### Dashboard Service

**Location**: `apps/api/src/dashboard/dashboard.service.ts`

**Features**:
- Aggregates dashboard data for a month
- Calculates ongoing refunds (PENDING + DONE, not ARCHIVED)
- Counts unread warnings
- Generates order trends over date ranges
- Formats warning source tags

### User Controller

**Location**: `apps/api/src/user/user.controller.ts`

**Endpoints**:
- `GET /api/me/dashboard?month=YYYY-MM` - Dashboard data
- `GET /api/me/orders/trends?range=7|15|30` - Order trends
- `GET /api/me/warnings` - List warnings with source tags
- `POST /api/me/warnings/:id/read` - Mark warning as read

## 📋 API Endpoints

### GET /api/me/dashboard

**Query Parameters**:
- `month` (optional): YYYY-MM format, defaults to current month

**Response**:
```json
{
  "month": "2024-01",
  "salary": 1500.0,
  "totalDeductions": 50.0,
  "approvedOrders": 100,
  "ongoingRefunds": 3,
  "unreadWarnings": 2
}
```

**Features**:
- Calculates salary using approved orders and deductions
- Counts ongoing refunds (PENDING + DONE, archivedAt is null)
- Counts unread warnings

### GET /api/me/orders/trends

**Query Parameters**:
- `range` (optional): 7, 15, or 30 days (default: 7)

**Response**:
```json
[
  {
    "date": "2024-01-15",
    "submitted": 10,
    "approved": 8
  },
  {
    "date": "2024-01-16",
    "submitted": 12,
    "approved": 10
  }
]
```

**Features**:
- Returns date series for the specified range
- Includes all dates in range (even if no orders)
- Aggregates submitted and approved counts per day

### GET /api/me/warnings

**Response**:
```json
[
  {
    "id": "clxxx...",
    "reason": "Late submission",
    "note": "Please submit on time",
    "sourceTag": "Warning from Manager John Doe",
    "deductionAmount": 10.0,
    "isRead": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "readAt": null
  }
]
```

**Source Tag Format**:
- `"Warning from Admin"` - If sourceRole is ADMIN
- `"Warning from Manager {name}"` - If sourceRole is MANAGER and sourceUser exists
- `"Warning from Manager"` - If sourceRole is MANAGER but sourceUser is null

### POST /api/me/warnings/:id/read

**Response**:
```json
{
  "id": "clxxx...",
  "isRead": true,
  "readAt": "2024-01-15T12:00:00.000Z"
}
```

**Features**:
- Verifies warning belongs to user
- Updates isRead to true
- Sets readAt timestamp

## 🕐 Timezone-Safe Logic

### Month Boundaries

The implementation uses UTC-based month boundaries:

1. **Parse month key** (YYYY-MM format)
2. **Create UTC dates** for start and end of month
3. **Format as YYYY-MM-DD** strings for dateKey comparison
4. **Use UTC timestamps** for DateTime comparisons

**Example**:
- Month: `2024-01`
- Start: `2024-01-01` (YYYY-MM-DD)
- End: `2024-01-31` (YYYY-MM-DD)

### DateKey Storage

- `dateKey` is stored as YYYY-MM-DD string (UTC format)
- Used for filtering `DailyOrderSubmission` records
- Consistent interpretation across timezones

### DateTime Fields

- `createdAt` fields use UTC timestamps
- Month boundaries converted to UTC for filtering
- Ensures consistent month calculations regardless of user timezone

## 📊 Data Aggregation

### Approved Orders
- Filters by `status = 'APPROVED'`
- Filters by `dateKey` within month range
- Sums `approvedCount` field

### Deductions
- Filters by `createdAt` within month range (UTC)
- Sums `amount` field
- All deductions in the month are included

### Ongoing Refunds
- Status: `PENDING` OR `DONE`
- `archivedAt` is `null`
- Counts all matching refund requests

### Unread Warnings
- Filters by `isRead = false`
- Counts all unread warnings for user

## 🔧 Services Architecture

```
UserController
  └── UserService
      └── DashboardService
          ├── SalaryService (for salary calculation)
          └── PrismaService (for data access)
```

### Module Structure

- `UserModule` - User endpoints
- `DashboardModule` - Dashboard aggregation logic
- `SalaryModule` - Salary computation logic

## 📝 DTOs

### DashboardQueryDto
- `month?: string` - Optional month in YYYY-MM format

### TrendsQueryDto
- `range?: TrendRange` - Optional range (7, 15, or 30 days)

## 🔐 Security

- All endpoints require JWT authentication
- Users can only access their own data
- Warning read endpoint verifies ownership

## ✅ Testing Checklist

- [ ] Dashboard returns correct salary calculation
- [ ] Dashboard defaults to current month if not provided
- [ ] Order trends returns correct date series
- [ ] Order trends includes all dates in range
- [ ] Warnings include correct source tags
- [ ] Warning read endpoint updates correctly
- [ ] Month boundaries handle timezone correctly
- [ ] Approved orders only counted when status is APPROVED
- [ ] Deductions correctly filtered by month
- [ ] Ongoing refunds exclude ARCHIVED

## 🚀 Usage Examples

### Get Dashboard for Current Month
```bash
GET /api/me/dashboard
Authorization: Bearer <token>
```

### Get Dashboard for Specific Month
```bash
GET /api/me/dashboard?month=2024-01
Authorization: Bearer <token>
```

### Get 30-Day Order Trends
```bash
GET /api/me/orders/trends?range=30
Authorization: Bearer <token>
```

### Get Warnings
```bash
GET /api/me/warnings
Authorization: Bearer <token>
```

### Mark Warning as Read
```bash
POST /api/me/warnings/clxxx.../read
Authorization: Bearer <token>
```

