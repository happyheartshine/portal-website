-- AlterTable
ALTER TABLE "refund_requests" ADD COLUMN     "fully_refunded_at" TIMESTAMP(3),
ADD COLUMN     "refunded_amount_usd" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "warnings" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "warnings_archived_at_idx" ON "warnings"("archived_at");
