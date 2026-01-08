/*
  Warnings:

  - The values [ISSUED] on the enum `CouponStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `expires_at` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remainingBalance` to the `coupons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editable_until` to the `refund_requests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CouponStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'USED');
ALTER TABLE "coupons" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "coupons" ALTER COLUMN "status" TYPE "CouponStatus_new" USING ("status"::text::"CouponStatus_new");
ALTER TYPE "CouponStatus" RENAME TO "CouponStatus_old";
ALTER TYPE "CouponStatus_new" RENAME TO "CouponStatus";
DROP TYPE "CouponStatus_old";
ALTER TABLE "coupons" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "expires_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "remainingBalance" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "refund_requests" ADD COLUMN     "editable_until" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "employee_confirmed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "coupon_history" (
    "id" TEXT NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "cleared_at" TIMESTAMP(3) NOT NULL,
    "cleared_by_user_id" TEXT NOT NULL,
    "cleared_by_name" TEXT NOT NULL,
    "cleared_amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "coupon_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupon_history_coupon_code_idx" ON "coupon_history"("coupon_code");

-- CreateIndex
CREATE INDEX "coupon_history_cleared_at_idx" ON "coupon_history"("cleared_at");

-- CreateIndex
CREATE INDEX "coupon_history_cleared_by_user_id_idx" ON "coupon_history"("cleared_by_user_id");

-- CreateIndex
CREATE INDEX "coupons_expires_at_idx" ON "coupons"("expires_at");

-- CreateIndex
CREATE INDEX "refund_requests_editable_until_idx" ON "refund_requests"("editable_until");

-- AddForeignKey
ALTER TABLE "coupon_history" ADD CONSTRAINT "coupon_history_coupon_code_fkey" FOREIGN KEY ("coupon_code") REFERENCES "coupons"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_history" ADD CONSTRAINT "coupon_history_cleared_by_user_id_fkey" FOREIGN KEY ("cleared_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
