# Discipline (Warnings) Workflow Documentation

## Overview
The discipline system allows managers to issue warnings to employees in their team. Warnings are automatically archived after 30 days and can be viewed in "Recent" or "Archive" tabs.

## ⚠️ Database Migration Required

**Important:** The `archived_at` column was added in a later migration. If your database doesn't have this column, run:

```bash
cd src/api
npx prisma migrate deploy
```

This will apply the pending migration `20260107234833_add_manager_panel_fields` which adds:
- `archived_at` column to `warnings` table
- Index on `archived_at` for performance

**Check migration status:**
```bash
cd src/api
npx prisma migrate status
```

---

## Database Schema

### Warning Table (`warnings`)

```prisma
model Warning {
  id             String   @id @default(cuid())
  userId         String   @map("user_id")           // Employee who receives the warning
  reason         String                             // Warning message/reason
  note           String?                            // Optional note (currently null for manager warnings)
  sourceRole     UserRole @map("source_role")      // Role that issued warning (MANAGER, ADMIN)
  sourceUserId   String?  @map("source_user_id")   // Manager/Admin who issued the warning
  deductionAmount Decimal? @map("deduction_amount") @db.Decimal(10, 2)  // Optional deduction (currently null)
  isRead         Boolean  @default(false) @map("is_read")
  createdAt      DateTime @default(now()) @map("created_at")
  readAt         DateTime? @map("read_at")
  archivedAt     DateTime? @map("archived_at")     // Auto-archived after 30 days

  // Relations
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceUser User?      @relation("WarningIssuedBy", fields: [sourceUserId], references: [id], onDelete: SetNull)
  deduction  Deduction?
}
```

**Key Fields:**
- `userId`: The employee receiving the warning
- `reason`: The warning message (stored from `dto.message`)
- `sourceRole`: Always `MANAGER` for manager-issued warnings
- `sourceUserId`: The manager's user ID
- `archivedAt`: Automatically set after 30 days (lazy archiving)
- `isRead`: Tracks if employee has read the warning
- `readAt`: Timestamp when employee marked as read

---

## API Endpoints

### 1. Get Employee Options
**Endpoint:** `GET /api/employees/options`

**Purpose:** Fetch list of employees for the dropdown selector

**Authentication:** Required (Manager/Admin only)

**Request:**
```http
GET /api/employees/options
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "clxxx...",
    "name": "John Doe"
  },
  {
    "id": "clyyy...",
    "name": "Jane Smith"
  }
]
```

**Backend Logic:**
- Returns all active employees (`isActive: true`, `role: 'EMPLOYEE'`)
- Sorted by name ascending
- No team scoping (all employees shown)

---

### 2. Issue Warning
**Endpoint:** `POST /api/manager/warnings`

**Purpose:** Create a new warning for an employee

**Authentication:** Required (Manager role only)

**Request Body:**
```json
{
  "employeeId": "clxxx...",  // Required: Employee user ID (string)
  "message": "Late submission - Please submit on time",  // Required: Warning message
  "deductionAmount": 10.0  // Optional: Currently not used (deductions created separately)
}
```

**Request DTO:**
```typescript
class CreateWarningDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  deductionAmount?: number;
}
```

**Response (201 Created):**
```json
{
  "warning": {
    "id": "clzzz...",
    "userId": "clxxx...",
    "reason": "Late submission - Please submit on time",
    "note": null,
    "sourceRole": "MANAGER",
    "sourceUserId": "manager_user_id",
    "deductionAmount": null,
    "isRead": false,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "readAt": null,
    "archivedAt": null
  }
}
```

**Backend Validation:**
1. ✅ Employee exists
2. ✅ Employee is active (`isActive: true`)
3. ✅ Employee role is `EMPLOYEE`
4. ✅ Team scoping check:
   - If manager has team assignments → employee must be in assigned team
   - If no assignments → can issue to any employee
5. ✅ Creates warning with:
   - `userId`: Employee ID
   - `reason`: Message from DTO
   - `note`: `null`
   - `sourceRole`: `MANAGER`
   - `sourceUserId`: Manager's user ID
   - `deductionAmount`: `null` (deductions created separately)
6. ✅ Creates audit log entry (`warning_issued`)

**Error Responses:**
- `400 Bad Request`: Invalid input, inactive employee, or not an employee
- `401 Unauthorized`: Missing/invalid token
- `403 Forbidden`: Employee outside manager's team
- `404 Not Found`: Employee not found

---

### 3. Get Warnings
**Endpoint:** `GET /api/manager/warnings`

**Purpose:** Fetch warnings issued by the manager with pagination

**Authentication:** Required (Manager role only)

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `tab` | `'recent' \| 'archive'` | No | `'recent'` | Filter by tab |
| `cursor` | `string` | No | - | Pagination cursor (base64 encoded) |
| `limit` | `number` | No | `20` | Items per page |

**Request Examples:**
```http
# Recent warnings (default)
GET /api/manager/warnings?tab=recent&limit=20

# Archive warnings
GET /api/manager/warnings?tab=archive&cursor=eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjAwOjAwLjAwMFoiLCJpZCI6ImNsemFhYS4uLiJ9&limit=20
```

**Response:**
```json
{
  "items": [
    {
      "id": "clzzz...",
      "message": "Late submission - Please submit on time",
      "reason": "Late submission - Please submit on time",
      "note": null,
      "employee": {
        "id": "clxxx...",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "employeeName": "John Doe",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "readAt": null,
      "archivedAt": null,
      "isRead": false,
      "deductionAmount": null
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjAwOjAwLjAwMFoiLCJpZCI6ImNsemFhYS4uLiJ9" // or null
}
```

**Backend Logic:**

1. **Team Scoping:**
   - If manager has `TeamAssignment` records → only warnings for assigned employees
   - If no assignments → warnings for all employees

2. **Lazy Archiving:**
   - Automatically archives warnings older than 30 days
   - Updates `archivedAt` timestamp

3. **Tab Filtering:**
   - **Recent Tab:**
     - `archivedAt IS NULL`
     - `createdAt >= 30 days ago`
   - **Archive Tab:**
     - `archivedAt IS NOT NULL` OR `createdAt < 30 days ago`

4. **Cursor Pagination:**
   - Cursor format: Base64 encoded JSON `{ createdAt: ISO string, id: string }`
   - Orders by: `createdAt DESC, id DESC`
   - Fetches `limit + 1` items to detect if more exist
   - Returns `nextCursor` if more items available

5. **Response Formatting:**
   - Includes employee details (`user` relation)
   - Maps `reason` to both `message` and `reason` fields
   - Includes `employeeName` for convenience

---

## Frontend Workflow

### Page: `/manager/discipline`

**Components:**
1. **Employee Selector Dropdown**
   - Fetches via `GET /api/employees/options`
   - Displays: `{name} ({email})` (email from employee object)

2. **Warning Form**
   - Employee selection (required)
   - Message textarea (required)
   - Submit button → `POST /api/manager/warnings`

3. **Tabs:**
   - **Recent:** Shows unarchived warnings from last 30 days
   - **Archive:** Shows archived or older warnings

4. **Warnings List:**
   - Fetches via `GET /api/manager/warnings?tab={activeTab}`
   - Infinite scroll with "Load More" button
   - Displays:
     - Warning message/reason
     - Employee name
     - Created date (formatted)
     - Source tag (if available)

**State Management:**
```javascript
- employees: []              // Employee options
- selectedEmployee: ''       // Selected employee ID
- message: ''                // Warning message
- activeTab: 'recent'     // Active tab
- warnings: []               // Warning items
- cursor: null              // Pagination cursor
- hasMore: true             // More items available
```

**Key Functions:**
- `fetchTeamMembers()`: Loads employee options
- `fetchWarnings(nextCursor)`: Loads warnings with pagination
- `handleSubmit()`: Issues new warning and refreshes list

---

## Team Scoping Rules

### Manager with Team Assignments
- Can only issue warnings to employees in their assigned team
- Only sees warnings for their team members
- Team defined by `TeamAssignment` table

### Manager without Team Assignments
- Can issue warnings to any active employee
- Sees warnings for all employees
- Acts as "global" manager

**Team Assignment Table:**
```prisma
model TeamAssignment {
  id         String @id @default(cuid())
  managerId String @map("manager_id")
  employeeId String @map("employee_id")
  // Relations...
}
```

---

## Archiving Logic

**Automatic Archiving (Lazy):**
- Warnings older than 30 days are automatically archived
- Happens when fetching warnings (not on a schedule)
- Sets `archivedAt` timestamp to current time

**Archive Criteria:**
- `createdAt <= 30 days ago`
- `archivedAt IS NULL`

**Recent Tab:**
- Shows warnings with `archivedAt IS NULL` AND `createdAt >= 30 days ago`

**Archive Tab:**
- Shows warnings with `archivedAt IS NOT NULL` OR `createdAt < 30 days ago`

---

## Audit Trail

Every warning creation logs an audit entry:

```typescript
{
  action: 'warning_issued',
  performedByUserId: managerId,
  targetUserId: employeeId,
  details: {
    warningId: warning.id,
    message: dto.message
  }
}
```

---

## Error Handling

### Frontend Errors:
- `toast.error()` for user-facing errors
- Console logging for debugging
- Form validation before submission

### Backend Errors:
- `400 Bad Request`: Invalid input, inactive employee, wrong role
- `401 Unauthorized`: Missing/invalid JWT token
- `403 Forbidden`: Employee outside team scope
- `404 Not Found`: Employee doesn't exist

---

## Data Flow Diagram

```
┌─────────────────┐
│  Manager Page   │
│  (Discipline) │
└───────┬───────┘
        │
        ├─→ GET /employees/options
        │   └─→ Returns employee list
        │
        ├─→ GET /manager/warnings?tab=recent
        │   └─→ Returns paginated warnings
        │
        └─→ POST /manager/warnings
            ├─→ Validates employee & team scope
            ├─→ Creates Warning record
            ├─→ Creates Audit log
            └─→ Returns created warning
```

---

## Key Implementation Details

1. **Message Storage:**
   - Manager's `message` → stored as `reason` field
   - `note` field is always `null` for manager warnings

2. **Deductions:**
   - `deductionAmount` in DTO is currently ignored
   - Deductions are created separately via `/management/deductions`
   - Warning's `deductionAmount` field is set to `null`

3. **Pagination:**
   - Uses cursor-based pagination (not offset)
   - Cursor is base64-encoded JSON with `createdAt` and `id`
   - More efficient for large datasets

4. **Team Scoping:**
   - Checked on both `issueWarning` and `getWarnings`
   - Uses `TeamAssignment` table to determine scope
   - Falls back to "all employees" if no assignments exist

5. **Auto-Archiving:**
   - Happens lazily when fetching warnings
   - Updates all matching warnings in one query
   - No background job needed

---

## Related Endpoints (Employee View)

Employees can view their own warnings via:
- `GET /api/me/warnings` - Get all warnings for logged-in employee
- `POST /api/me/warnings/:id/read` - Mark warning as read

These are separate from the manager discipline workflow.

