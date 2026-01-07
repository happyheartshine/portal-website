-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrderSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ISSUED', 'USED');

-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'DONE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "rate_per_order" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "password_reset_otp" TEXT,
    "password_reset_expiry" TIMESTAMP(3),
    "refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "date_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_order_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_key" TEXT NOT NULL,
    "submitted_count" INTEGER NOT NULL,
    "status" "OrderSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_count" INTEGER,
    "manager_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_order_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deductions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "source_role" "UserRole" NOT NULL,
    "source_user_id" TEXT,
    "warning_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deductions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warnings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "source_role" "UserRole" NOT NULL,
    "source_user_id" TEXT,
    "deduction_amount" DECIMAL(10,2),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "issued_by_user_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "customer_name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "zelle_name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'ISSUED',
    "used_by_user_id" TEXT,
    "used_at" TIMESTAMP(3),

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_name" TEXT NOT NULL,
    "zelle_sender_name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "screenshot_url" TEXT,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "processed_by_manager_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_assignments" (
    "manager_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,

    CONSTRAINT "team_assignments_pkey" PRIMARY KEY ("manager_id","employee_id")
);

-- CreateTable
CREATE TABLE "data_purge_logs" (
    "id" TEXT NOT NULL,
    "month_key" TEXT NOT NULL,
    "performed_by_admin_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tables_purged" JSONB NOT NULL,

    CONSTRAINT "data_purge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by_user_id" TEXT NOT NULL,
    "target_user_id" TEXT,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "attendances_user_id_idx" ON "attendances"("user_id");

-- CreateIndex
CREATE INDEX "attendances_date_key_idx" ON "attendances"("date_key");

-- CreateIndex
CREATE INDEX "attendances_user_id_date_key_idx" ON "attendances"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_user_id_date_key_key" ON "attendances"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "daily_order_submissions_user_id_idx" ON "daily_order_submissions"("user_id");

-- CreateIndex
CREATE INDEX "daily_order_submissions_date_key_idx" ON "daily_order_submissions"("date_key");

-- CreateIndex
CREATE INDEX "daily_order_submissions_status_idx" ON "daily_order_submissions"("status");

-- CreateIndex
CREATE INDEX "daily_order_submissions_user_id_date_key_idx" ON "daily_order_submissions"("user_id", "date_key");

-- CreateIndex
CREATE INDEX "daily_order_submissions_manager_id_idx" ON "daily_order_submissions"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_order_submissions_user_id_date_key_key" ON "daily_order_submissions"("user_id", "date_key");

-- CreateIndex
CREATE UNIQUE INDEX "deductions_warning_id_key" ON "deductions"("warning_id");

-- CreateIndex
CREATE INDEX "deductions_user_id_idx" ON "deductions"("user_id");

-- CreateIndex
CREATE INDEX "deductions_source_user_id_idx" ON "deductions"("source_user_id");

-- CreateIndex
CREATE INDEX "deductions_created_at_idx" ON "deductions"("created_at");

-- CreateIndex
CREATE INDEX "warnings_user_id_idx" ON "warnings"("user_id");

-- CreateIndex
CREATE INDEX "warnings_is_read_idx" ON "warnings"("is_read");

-- CreateIndex
CREATE INDEX "warnings_created_at_idx" ON "warnings"("created_at");

-- CreateIndex
CREATE INDEX "warnings_source_user_id_idx" ON "warnings"("source_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_issued_by_user_id_idx" ON "coupons"("issued_by_user_id");

-- CreateIndex
CREATE INDEX "coupons_used_by_user_id_idx" ON "coupons"("used_by_user_id");

-- CreateIndex
CREATE INDEX "coupons_issued_at_idx" ON "coupons"("issued_at");

-- CreateIndex
CREATE INDEX "refund_requests_requested_by_user_id_idx" ON "refund_requests"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE INDEX "refund_requests_processed_by_manager_id_idx" ON "refund_requests"("processed_by_manager_id");

-- CreateIndex
CREATE INDEX "refund_requests_created_at_idx" ON "refund_requests"("created_at");

-- CreateIndex
CREATE INDEX "team_assignments_manager_id_idx" ON "team_assignments"("manager_id");

-- CreateIndex
CREATE INDEX "team_assignments_employee_id_idx" ON "team_assignments"("employee_id");

-- CreateIndex
CREATE INDEX "data_purge_logs_month_key_idx" ON "data_purge_logs"("month_key");

-- CreateIndex
CREATE INDEX "data_purge_logs_performed_by_admin_id_idx" ON "data_purge_logs"("performed_by_admin_id");

-- CreateIndex
CREATE INDEX "data_purge_logs_created_at_idx" ON "data_purge_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_user_id_idx" ON "audit_logs"("performed_by_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_target_user_id_idx" ON "audit_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_order_submissions" ADD CONSTRAINT "daily_order_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_order_submissions" ADD CONSTRAINT "daily_order_submissions_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deductions" ADD CONSTRAINT "deductions_warning_id_fkey" FOREIGN KEY ("warning_id") REFERENCES "warnings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_source_user_id_fkey" FOREIGN KEY ("source_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_processed_by_manager_id_fkey" FOREIGN KEY ("processed_by_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_purge_logs" ADD CONSTRAINT "data_purge_logs_performed_by_admin_id_fkey" FOREIGN KEY ("performed_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
