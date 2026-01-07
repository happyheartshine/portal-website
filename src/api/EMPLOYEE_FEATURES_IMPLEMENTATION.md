# Employee Features Implementation

## ✅ Implementation Complete

All EMPLOYEE features have been implemented with strict privacy controls. Users can only access their own data.

## 📋 Features Implemented

### 1. Attendance System

#### POST /api/me/attendance/mark
- Marks attendance for today's dateKey
- **Idempotent**: If already marked, returns existing record
- Uses UTC date for consistent dateKey

**Response:**
```json
{
  "id": "clxxx...",
  "userId": "clxxx...",
  "timestamp": "2024-01-15T10:00:00.000Z",
  "dateKey": "2024-01-15",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

#### GET /api/me/attendance?month=YYYY-MM
- Lists all attendance records for a month
- Defaults to current month if not provided

**Response:**
```json
[
  {
    "id": "clxxx...",
    "dateKey": "2024-01-15",
    "timestamp": "2024-01-15T10:00:00.000Z",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
]
```

### 2. Daily Order Submission

#### POST /api/me/orders
- Creates or updates daily order submission
- **Business Rules**:
  - If exists for dateKey and status is PENDING: allow update
  - If status is APPROVED: **do not allow changes** (403 error)
  - If status is REJECTED: allow update (treat as new submission)

**Request Body:**
```json
{
  "dateKey": "2024-01-15",
  "submittedCount": 10
}
```

**Response:**
```json
{
  "id": "clxxx...",
  "userId": "clxxx...",
  "dateKey": "2024-01-15",
  "submittedCount": 10,
  "status": "PENDING",
  "approvedCount": null,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `403 Forbidden`: "Cannot modify approved order submission"

#### GET /api/me/orders?month=YYYY-MM
- Lists all order submissions for a month
- Includes status and counts

**Response:**
```json
[
  {
    "id": "clxxx...",
    "dateKey": "2024-01-15",
    "submittedCount": 10,
    "status": "APPROVED",
    "approvedCount": 8,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
]
```

### 3. Coupon System

#### POST /api/me/coupons/generate
- Generates a new coupon code
- **Format**: `CP-YYYYMMDD-XXXX` (where XXXX is random 4-digit code)
- Example: `CP-20240115-1234`

**Request Body:**
```json
{
  "customerName": "John Doe",
  "server": "Server-01",
  "category": "Refund",
  "reason": "Customer complaint",
  "zelleName": "John Zelle",
  "amount": 50.0
}
```

**Response:**
```json
{
  "id": "clxxx...",
  "code": "CP-20240115-1234",
  "issuedByUserId": "clxxx...",
  "issuedAt": "2024-01-15T10:00:00.000Z",
  "customerName": "John Doe",
  "server": "Server-01",
  "category": "Refund",
  "reason": "Customer complaint",
  "zelleName": "John Zelle",
  "amount": 50.0,
  "status": "ISSUED"
}
```

#### POST /api/me/coupons/honor
- Honors a coupon (marks as USED)
- **Business Rules**:
  - If invalid code: 404 error
  - If status is ISSUED: mark as USED
  - If status is USED: **409 error** with message: "This coupon was already honoured by {Name} on {Date}"

**Request Body:**
```json
{
  "code": "CP-20240115-1234"
}
```

**Error Response (if already used):**
```json
{
  "statusCode": 409,
  "message": "This coupon was already honoured by John Doe on 1/15/2024",
  "error": "Conflict"
}
```

#### GET /api/me/coupons/history
- Returns coupons issued and honored by user

**Response:**
```json
{
  "issued": [
    {
      "id": "clxxx...",
      "code": "CP-20240115-1234",
      "status": "ISSUED",
      "customerName": "John Doe",
      "amount": 50.0,
      "issuedAt": "2024-01-15T10:00:00.000Z",
      "usedBy": null
    }
  ],
  "honored": [
    {
      "id": "clxxx...",
      "code": "CP-20240114-5678",
      "status": "USED",
      "usedAt": "2024-01-15T11:00:00.000Z",
      "issuedBy": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      }
    }
  ]
}
```

### 4. Refund Request System

#### POST /api/me/refunds
- Creates refund request with screenshot upload
- **File Upload**: Uses multipart/form-data
- **Storage**: Local uploads directory (dev), S3 adapter interface (prod ready)

**Request (multipart/form-data):**
- `customerName`: string
- `zelleSenderName`: string
- `server`: string
- `category`: string
- `reason`: string
- `amount`: number
- `screenshot`: file (image)

**Response:**
```json
{
  "id": "clxxx...",
  "requestedByUserId": "clxxx...",
  "customerName": "John Doe",
  "zelleSenderName": "John Zelle",
  "server": "Server-01",
  "category": "Refund",
  "reason": "Customer requested refund",
  "amount": 50.0,
  "screenshotUrl": "/uploads/refunds/abc123.jpg",
  "status": "PENDING",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

#### GET /api/me/refunds?status=pending|done|archived
- Lists refund requests with optional status filter

**Query Parameters:**
- `status` (optional): `pending`, `done`, or `archived`

**Response:**
```json
[
  {
    "id": "clxxx...",
    "customerName": "John Doe",
    "zelleSenderName": "John Zelle",
    "server": "Server-01",
    "category": "Refund",
    "reason": "Customer requested refund",
    "amount": 50.0,
    "screenshotUrl": "/uploads/refunds/abc123.jpg",
    "status": "PENDING",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "processedAt": null,
    "archivedAt": null
  }
]
```

#### POST /api/me/refunds/:id/confirm-informed
- Confirms refund request is informed (moves to ARCHIVED)
- **Business Rules**:
  - Only allowed if `status == DONE`
  - Sets `archivedAt` timestamp
  - Verifies ownership

**Response:**
```json
{
  "id": "clxxx...",
  "status": "ARCHIVED",
  "archivedAt": "2024-01-15T12:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: "Can only confirm informed for refunds with DONE status"
- `403 Forbidden`: "Access denied"
- `404 Not Found`: "Refund request not found"

## 🔐 Privacy & Security

### Strict Privacy Controls
- All endpoints require JWT authentication
- Users can **only** access their own data
- Ownership verification on all operations
- No cross-user data access possible

### Validation
- All DTOs include comprehensive validation
- Date formats validated (YYYY-MM-DD, YYYY-MM)
- File upload validation
- Status enum validation

### Error Messages
- Exact error messages as per PRD requirements
- Clear, user-friendly error responses
- Proper HTTP status codes

## 📁 File Structure

### Services
- `apps/api/src/attendance/attendance.service.ts`
- `apps/api/src/orders/orders.service.ts`
- `apps/api/src/coupons/coupons.service.ts`
- `apps/api/src/refunds/refunds.service.ts`
- `apps/api/src/storage/storage.service.ts`

### Controllers
- `apps/api/src/attendance/attendance.controller.ts`
- `apps/api/src/orders/orders.controller.ts`
- `apps/api/src/coupons/coupons.controller.ts`
- `apps/api/src/refunds/refunds.controller.ts`

### DTOs
- `apps/api/src/common/dto/month-query.dto.ts`
- `apps/api/src/orders/dto/create-order.dto.ts`
- `apps/api/src/coupons/dto/generate-coupon.dto.ts`
- `apps/api/src/coupons/dto/honor-coupon.dto.ts`
- `apps/api/src/refunds/dto/create-refund.dto.ts`

### Modules
- `apps/api/src/attendance/attendance.module.ts`
- `apps/api/src/orders/orders.module.ts`
- `apps/api/src/coupons/coupons.module.ts`
- `apps/api/src/refunds/refunds.module.ts`
- `apps/api/src/storage/storage.module.ts`

## 🗂️ File Upload

### Development (Local)
- Files saved to `uploads/` directory
- Organized by folder (e.g., `uploads/refunds/`)
- Served as static files at `/uploads/*`
- Unique filenames using random hex

### Production (S3 Ready)
- `StorageService` has interface for S3 adapter
- Can be easily replaced with AWS S3 or MinIO
- Same API, different implementation

## ✅ Business Logic

### Attendance
- Idempotent marking (no duplicates)
- UTC date for consistent dateKey

### Order Submissions
- PENDING: Can update
- APPROVED: Cannot modify (403 error)
- REJECTED: Can update (treated as new)

### Coupons
- Unique code generation with collision handling
- Exact error message for already-used coupons
- Format: CP-YYYYMMDD-XXXX

### Refunds
- File upload support
- Status-based workflow (PENDING → DONE → ARCHIVED)
- Only DONE status can be archived
- Ownership verification

## 🚀 Usage Examples

### Mark Attendance
```bash
curl -X POST "http://localhost:3001/api/me/attendance/mark" \
  -H "Authorization: Bearer <token>"
```

### Create Order Submission
```bash
curl -X POST "http://localhost:3001/api/me/orders" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"dateKey": "2024-01-15", "submittedCount": 10}'
```

### Generate Coupon
```bash
curl -X POST "http://localhost:3001/api/me/coupons/generate" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "server": "Server-01",
    "category": "Refund",
    "reason": "Customer complaint",
    "zelleName": "John Zelle",
    "amount": 50.0
  }'
```

### Create Refund Request
```bash
curl -X POST "http://localhost:3001/api/me/refunds" \
  -H "Authorization: Bearer <token>" \
  -F "customerName=John Doe" \
  -F "zelleSenderName=John Zelle" \
  -F "server=Server-01" \
  -F "category=Refund" \
  -F "reason=Customer requested refund" \
  -F "amount=50.0" \
  -F "screenshot=@/path/to/screenshot.jpg"
```

---

**Status**: ✅ Complete and ready for testing

